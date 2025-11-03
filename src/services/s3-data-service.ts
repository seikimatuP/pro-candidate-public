/**
 * S3ベースのデータ管理サービス
 * DynamoDBの代替としてS3 + JSONファイルでデータを管理
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import {
  PlayerData,
  ScrapingStatus,
  PlayersDataFile,
  PlayersIndex,
  S3DataManager,
} from '../core/types';
import { log } from '../core/logger';

// 定数定義
const CONTENT_TYPE_JSON = 'application/json';
const PLAYERS_PATH_PREFIX = 'players';
const PLAYER_TYPE_HIGHSCHOOL = 'highschool';
const PLAYER_TYPE_UNIVERSITY = 'university';
const EMPTY_STRING = '';
const getCurrentTimestamp = () => new Date().toISOString();

export class S3DataService implements S3DataManager {
  private s3Client: S3Client;
  private bucketName: string;
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(bucketName: string, s3Client?: S3Client) {
    this.bucketName = bucketName;
    // S3Clientが渡されなければデフォルトを作成
    this.s3Client =
      s3Client ||
      new S3Client({
        region: process.env.AWS_REGION || 'ap-northeast-1',
      });
  }

  /**
   * キャッシュからデータを取得（TTL付き）
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      log.debug(`Cache hit for key: ${key}`);
      return cached.data as T;
    }
    if (cached) {
      this.cache.delete(key);
      log.debug(`Cache expired for key: ${key}`);
    }
    return null;
  }

  /**
   * データをキャッシュに保存
   */
  private setCachedData<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    log.debug(`Data cached for key: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * 選手データをS3に保存
   */
  async savePlayersData(players: PlayerData[], type: string, year: number): Promise<void> {
    log.info(`Saving ${players.length} ${type} players for year ${year}`);

    // プレイヤーデータにIDを付与（未設定の場合）- UUID使用で衝突回避
    const playersWithIds = players.map(player => ({
      ...player,
      id: player.id || uuidv4(),
      createdAt: player.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    }));

    const dataFile: PlayersDataFile = {
      metadata: {
        year,
        type: type as typeof PLAYER_TYPE_HIGHSCHOOL | typeof PLAYER_TYPE_UNIVERSITY,
        totalCount: playersWithIds.length,
        lastUpdated: getCurrentTimestamp(),
        version: '1.0',
      },
      players: playersWithIds,
    };

    const key = `${PLAYERS_PATH_PREFIX}/${type}/${year}.json`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: JSON.stringify(dataFile, null, 2),
          ContentType: CONTENT_TYPE_JSON,
          Metadata: {
            'record-count': playersWithIds.length.toString(),
            'data-type': type,
            year: year.toString(),
            'last-updated': getCurrentTimestamp(),
          },
        })
      );

      log.info(`Successfully saved players data to ${key}`);

      // インデックス更新
      await this.updateIndex(type as typeof PLAYER_TYPE_HIGHSCHOOL | typeof PLAYER_TYPE_UNIVERSITY);

      // 最新データのコピー作成
      await this.updateLatestData();
    } catch (error) {
      log.error(`Failed to save players data to ${key}:`, error);
      throw error;
    }
  }

  /**
   * 選手データをS3から読み込み（キャッシュ対応）
   */
  async loadPlayersData(type: string, year: number): Promise<PlayerData[]> {
    const key = `${PLAYERS_PATH_PREFIX}/${type}/${year}.json`;
    const cacheKey = `players_${type}_${year}`;

    // キャッシュから取得を試行
    const cachedData = this.getCachedData<PlayerData[]>(cacheKey);
    if (cachedData) {
      log.debug(`Returning cached data for ${key}`);
      return cachedData;
    }

    try {
      log.debug(`Loading players data from ${key}`);

      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );

      const content = await response.Body?.transformToString();
      if (!content) {
        log.debug(`No content found for ${key}`);
        return [];
      }

      const dataFile: PlayersDataFile = JSON.parse(content);
      const players = dataFile.players || [];

      log.debug(`Loaded ${players.length} players from ${key}`);

      // データをキャッシュに保存（10分間）
      this.setCachedData(cacheKey, players, 10 * 60 * 1000);

      return players;
    } catch (error) {
      if ((error as Error & { name: string }).name === 'NoSuchKey') {
        log.warn(`Players data not found for ${key}`);
        return [];
      }
      log.error(`Failed to load players data from ${key}:`, error);
      return [];
    }
  }

  /**
   * 指定年度の全選手データ（高校生+大学生）を取得
   */
  async getAllPlayersData(year: number): Promise<PlayerData[]> {
    try {
      log.debug(`Loading all players data for year ${year}`);

      const [highschoolPlayers, universityPlayers] = await Promise.all([
        this.loadPlayersData(PLAYER_TYPE_HIGHSCHOOL, year),
        this.loadPlayersData(PLAYER_TYPE_UNIVERSITY, year),
      ]);

      const allPlayers = [...highschoolPlayers, ...universityPlayers];
      log.info(
        `Total players loaded: ${allPlayers.length} (HS: ${highschoolPlayers.length}, Univ: ${universityPlayers.length})`
      );

      return allPlayers;
    } catch (error) {
      log.error(`Failed to load all players data for year ${year}:`, error);
      return [];
    }
  }

  /**
   * 利用可能な年度一覧を取得
   */
  async getAvailableYears(type: string): Promise<number[]> {
    try {
      const indexData = await this.loadIndex(
        type as typeof PLAYER_TYPE_HIGHSCHOOL | typeof PLAYER_TYPE_UNIVERSITY
      );
      return indexData.availableYears.sort((a, b) => b - a);
    } catch (error) {
      log.error(`Failed to get available years for ${type}:`, error);
      return [];
    }
  }

  /**
   * 学校名で選手を検索（インデックス最適化）
   */
  async searchPlayersBySchool(school: string, year?: number): Promise<PlayerData[]> {
    const searchYear = year || new Date().getFullYear();
    const cacheKey = `search_school_${school.toLowerCase()}_${searchYear}`;

    // キャッシュから取得を試行
    const cachedResults = this.getCachedData<PlayerData[]>(cacheKey);
    if (cachedResults) {
      log.debug(`Returning cached search results for school: ${school}`);
      return cachedResults;
    }

    try {
      log.debug(`Searching players by school: ${school} for year ${searchYear}`);

      const allPlayers = await this.getAllPlayersData(searchYear);

      // 大文字小文字を無視した部分マッチで検索
      const normalizedSchool = school.toLowerCase();
      const matchedPlayers = allPlayers.filter(
        player => player.school && player.school.toLowerCase().includes(normalizedSchool)
      );

      log.debug(`Found ${matchedPlayers.length} players matching school: ${school}`);

      // 検索結果をキャッシュ（5分間）
      this.setCachedData(cacheKey, matchedPlayers, 5 * 60 * 1000);

      return matchedPlayers;
    } catch (error) {
      log.error(`Failed to search players by school ${school}:`, error);
      return [];
    }
  }

  /**
   * スクレイピング状況を更新
   */
  async updateScrapingStatus(status: ScrapingStatus): Promise<void> {
    const key = 'cache/scraping-status.json';

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: JSON.stringify(status, null, 2),
          ContentType: CONTENT_TYPE_JSON,
          Metadata: {
            status: status.status,
            'last-run': status.lastRun,
            'updated-at': getCurrentTimestamp(),
          },
        })
      );

      log.debug(`Updated scraping status: ${status.status}`);
    } catch (error) {
      log.error('Failed to update scraping status:', error);
      throw error;
    }
  }

  /**
   * スクレイピング状況を取得
   */
  async getScrapingStatus(): Promise<ScrapingStatus> {
    const key = 'cache/scraping-status.json';

    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );

      const content = await response.Body?.transformToString();
      if (content) {
        const status = JSON.parse(content);
        log.debug(`Retrieved scraping status: ${status.status}`);
        return status;
      }
    } catch (error) {
      log.debug('No existing scraping status found, returning default', { error: error instanceof Error ? error.message : String(error) });
    }

    return this.getDefaultScrapingStatus();
  }

  /**
   * 統計データを取得（キャッシュ最適化）
   */
  async getStatistics(year?: number): Promise<{
    totalPlayers: number;
    highschoolCount: number;
    universityCount: number;
    byPrefecture: Record<string, number>;
    byPosition: Record<string, number>;
    lastUpdated: string;
  }> {
    const searchYear = year || new Date().getFullYear();
    const cacheKey = `statistics_${searchYear}`;

    // キャッシュから取得を試行
    const cachedStats = this.getCachedData<{
      totalPlayers: number;
      highschoolCount: number;
      universityCount: number;
      byPrefecture: Record<string, number>;
      byPosition: Record<string, number>;
      lastUpdated: string;
    }>(cacheKey);
    if (cachedStats) {
      log.debug(`Returning cached statistics for year: ${searchYear}`);
      return cachedStats;
    }

    try {
      log.debug(`Generating statistics for year: ${searchYear}`);

      // 並列でデータを取得してパフォーマンス向上
      const [highschoolPlayers, universityPlayers] = await Promise.all([
        this.loadPlayersData(PLAYER_TYPE_HIGHSCHOOL, searchYear),
        this.loadPlayersData(PLAYER_TYPE_UNIVERSITY, searchYear),
      ]);

      const allPlayers = [...highschoolPlayers, ...universityPlayers];

      // Map オブジェクトを使用して高速な集計
      const prefectureMap = new Map<string, number>();
      const positionMap = new Map<string, number>();

      for (const player of allPlayers) {
        if (player.prefecture) {
          prefectureMap.set(player.prefecture, (prefectureMap.get(player.prefecture) || 0) + 1);
        }
        if (player.position) {
          positionMap.set(player.position, (positionMap.get(player.position) || 0) + 1);
        }
      }

      const statistics = {
        totalPlayers: allPlayers.length,
        highschoolCount: highschoolPlayers.length,
        universityCount: universityPlayers.length,
        byPrefecture: Object.fromEntries(prefectureMap),
        byPosition: Object.fromEntries(positionMap),
        lastUpdated: getCurrentTimestamp(),
      };

      // 統計データをキャッシュ（15分間）
      this.setCachedData(cacheKey, statistics, 15 * 60 * 1000);

      return statistics;
    } catch (error) {
      log.error(`Failed to generate statistics for year ${searchYear}:`, error);
      return {
        totalPlayers: 0,
        highschoolCount: 0,
        universityCount: 0,
        byPrefecture: {},
        byPosition: {},
        lastUpdated: getCurrentTimestamp(),
      };
    }
  }

  /**
   * インデックスファイルを更新
   */
  private async updateIndex(
    type: typeof PLAYER_TYPE_HIGHSCHOOL | typeof PLAYER_TYPE_UNIVERSITY
  ): Promise<void> {
    try {
      log.debug(`Updating index for ${type}`);

      const prefix = `${PLAYERS_PATH_PREFIX}/${type}/`;
      const objects = await this.listObjects(prefix);

      const files = objects
        .filter(obj => obj.Key?.endsWith('.json') && !obj.Key.endsWith('index.json'))
        .map(obj => {
          const filename = obj.Key!.split('/').pop()!;
          const year = parseInt(filename.replace('.json', ''));
          return {
            year,
            filename,
            recordCount: 0, // メタデータから取得予定
            fileSize: obj.Size || 0,
            lastModified: obj.LastModified?.toISOString() || EMPTY_STRING,
          };
        })
        .sort((a, b) => b.year - a.year);

      const index: PlayersIndex = {
        type,
        availableYears: files.map(f => f.year),
        totalRecords: files.reduce((sum, f) => sum + f.recordCount, 0),
        latestYear:
          files.length > 0 ? Math.max(...files.map(f => f.year)) : new Date().getFullYear(),
        lastUpdated: getCurrentTimestamp(),
        files,
      };

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: `${PLAYERS_PATH_PREFIX}/${type}/index.json`,
          Body: JSON.stringify(index, null, 2),
          ContentType: CONTENT_TYPE_JSON,
        })
      );

      log.debug(`Successfully updated index for ${type}`);
    } catch (error) {
      log.error(`Failed to update index for ${type}:`, error);
      throw error;
    }
  }

  /**
   * インデックスファイルを読み込み
   */
  private async loadIndex(
    type: typeof PLAYER_TYPE_HIGHSCHOOL | typeof PLAYER_TYPE_UNIVERSITY
  ): Promise<PlayersIndex> {
    const key = `${PLAYERS_PATH_PREFIX}/${type}/index.json`;

    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );

    const content = await response.Body?.transformToString();
    if (!content) {
      throw new Error(`No index found for ${type}`);
    }

    return JSON.parse(content);
  }

  /**
   * S3オブジェクト一覧を取得
   */
  private async listObjects(prefix: string) {
    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      })
    );

    return response.Contents || [];
  }

  /**
   * 最新データのコピーを更新
   */
  private async updateLatestData(): Promise<void> {
    try {
      const currentYear = new Date().getFullYear();
      const latestData = await this.getAllPlayersData(currentYear);

      const combinedData = {
        metadata: {
          year: currentYear,
          totalCount: latestData.length,
          lastUpdated: getCurrentTimestamp(),
          types: [PLAYER_TYPE_HIGHSCHOOL, PLAYER_TYPE_UNIVERSITY],
        },
        players: latestData,
      };

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: `${PLAYERS_PATH_PREFIX}/combined/latest.json`,
          Body: JSON.stringify(combinedData, null, 2),
          ContentType: CONTENT_TYPE_JSON,
        })
      );

      log.debug(`Updated latest combined data with ${latestData.length} players`);
    } catch (error) {
      log.error('Failed to update latest data:', error);
    }
  }

  /**
   * デフォルトのスクレイピング状況を返す
   */
  private getDefaultScrapingStatus(): ScrapingStatus {
    return {
      lastRun: EMPTY_STRING,
      status: 'success',
      results: {
        highschool: {
          attempted: false,
          success: false,
          recordsFound: 0,
        },
        university: {
          attempted: false,
          success: false,
          recordsFound: 0,
        },
      },
      nextScheduledRun: EMPTY_STRING,
    };
  }

  /**
   * テスト用の別名メソッド: savePlayerData (savePlayersDataのエイリアス)
   */
  async savePlayerData(players: PlayerData[], type: string, year: number): Promise<boolean> {
    try {
      await this.savePlayersData(players, type, year);
      return true;
    } catch (error) {
      log.error('Failed to save player data:', error);
      return false;
    }
  }

  /**
   * テスト用の別名メソッド: getPlayerData (loadPlayersDataのエイリアス)
   */
  async getPlayerData(type: string, year: number): Promise<PlayerData[]> {
    return this.loadPlayersData(type, year);
  }

  /**
   * テスト用の別名メソッド: searchPlayers (検索条件対応版)
   */
  async searchPlayers(
    criteria: { school?: string; position?: string; prefecture?: string },
    year?: number
  ): Promise<PlayerData[]> {
    if (criteria.school) {
      return this.searchPlayersBySchool(criteria.school, year);
    }

    const searchYear = year || new Date().getFullYear();
    const allPlayers = await this.getAllPlayersData(searchYear);

    return allPlayers.filter(player => {
      let matches = true;

      if (criteria.position) {
        matches =
          matches &&
          (player.position?.toLowerCase().includes(criteria.position.toLowerCase()) ?? false);
      }

      if (criteria.prefecture) {
        matches =
          matches &&
          (player.prefecture?.toLowerCase().includes(criteria.prefecture.toLowerCase()) ?? false);
      }

      return matches;
    });
  }

  /**
   * 全学校一覧を取得
   */
  async getAllSchools(year?: number): Promise<string[]> {
    const searchYear = year || new Date().getFullYear();
    const allPlayers = await this.getAllPlayersData(searchYear);

    const schools = new Set<string>();
    allPlayers.forEach(player => {
      if (player.school) {
        schools.add(player.school);
      }
    });

    return Array.from(schools).sort((a, b) => a.localeCompare(b));
  }

  /**
   * バケット接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          MaxKeys: 1,
        })
      );

      log.info(`Successfully connected to S3 bucket: ${this.bucketName}`);
      return true;
    } catch (error) {
      log.error(`Failed to connect to S3 bucket ${this.bucketName}:`, error);
      return false;
    }
  }
}

/**
 * S3DataServiceのシングルトンインスタンスを作成・取得
 */
export function createS3DataService(s3Client?: S3Client): S3DataService {
  const bucketName = process.env.S3_DATA_BUCKET || 'pro-candidate-data-dev';
  return new S3DataService(bucketName, s3Client);
}
