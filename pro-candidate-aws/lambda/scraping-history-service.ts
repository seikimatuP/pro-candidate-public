/**
 * スクレイピング履歴管理サービス
 * S3を使用して実行履歴と差分データを管理
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { log } from './logger';

interface Player {
  id: string;
  name: string;
  school: string;
  type: string;
  year: number;
  [key: string]: any;
}

interface ScrapingResult {
  success: boolean;
  count: number;
  players: Player[];
  highschool?: {
    success: boolean;
    count: number;
    players: Player[];
  };
  university?: {
    success: boolean;
    count: number;
    players: Player[];
  };
}

interface HistoryRecord {
  id: string;
  timestamp: string;
  type: string;
  environment: string;
  year: number;
  summary: {
    totalCurrent: number;
    totalPrevious: number;
    totalDifference: number;
  };
  differences: {
    [key: string]: {
      currentCount: number;
      previousCount: number;
      difference: number;
      newPlayers: string[];
      removedPlayers: string[];
    };
  };
}

export class ScrapingHistoryService {
  private bucketName: string;
  private s3Client: S3Client;

  constructor(bucketName: string, s3Client?: S3Client) {
    this.bucketName = bucketName;
    this.s3Client =
      s3Client || new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });
  }

  /**
   * 前回の実行結果（カウントと選手リスト）を取得
   */
  public async getPreviousCountData(type: string, environment: string): Promise<any> {
    try {
      const key = `previous-counts/${type}-last.json`;
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const data = JSON.parse((await response.Body?.transformToString()) || '{}');
      return data;
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        log.info(`前回データなし: ${type}`);
        return null;
      }
      log.error(`前回データ取得エラー (${type}):`, error);
      return null;
    }
  }

  /**
   * 個別タイプの差分計算（scraping.tsから呼び出し）
   */
  public async calculateDifference(
    type: string,
    currentPlayers: Player[],
    environment: string
  ): Promise<{
    currentCount: number;
    previousCount: number;
    difference: number;
    newPlayers: string[];
    removedPlayers: string[];
  }> {
    const previousData = await this.getPreviousCountData(type, environment);
    const previousCount = previousData ? previousData.count : 0;
    const previousPlayers: string[] = previousData ? previousData.playerNames || [] : [];

    const currentNames = currentPlayers.map(p => p.name);
    const newPlayers = currentNames.filter(name => !previousPlayers.includes(name));
    const removedPlayers = previousPlayers.filter(name => !currentNames.includes(name));

    return {
      currentCount: currentPlayers.length,
      previousCount,
      difference: currentPlayers.length - previousCount,
      newPlayers,
      removedPlayers,
    };
  }

  /**
   * 今回の結果と前回の結果を比較
   */
  public async compareWithPrevious(
    currentResult: ScrapingResult,
    type: string,
    environment: string
  ): Promise<any> {
    const differences: any = {};
    const typesToCheck = type === 'both' ? ['highschool', 'university'] : [type];

    for (const checkType of typesToCheck) {
      const previousData = await this.getPreviousCountData(checkType, environment);
      const previousCount = previousData ? previousData.count : 0;
      const previousPlayers = previousData ? previousData.playerNames || [] : [];

      let currentCount = 0;
      let currentPlayers: string[] = [];

      if (type === 'both') {
        const result =
          checkType === 'highschool' ? currentResult.highschool : currentResult.university;
        if (result && result.success) {
          currentCount = result.count;
          currentPlayers = result.players.map(p => p.name);
        }
      } else {
        if (currentResult.success) {
          currentCount = currentResult.count;
          currentPlayers = currentResult.players.map(p => p.name);
        }
      }

      // 差分計算
      const newPlayers = currentPlayers.filter(name => !previousPlayers.includes(name));
      const removedPlayers = previousPlayers.filter(
        (name: string) => !currentPlayers.includes(name)
      );

      differences[checkType] = {
        currentCount,
        previousCount,
        difference: currentCount - previousCount,
        newPlayers,
        removedPlayers,
      };
    }

    return differences;
  }

  /**
   * 差分サマリーを計算
   */
  public calculateSummary(differences: any): any {
    const totalCurrent = Object.values(differences).reduce(
      (sum: number, diff: any) => sum + diff.currentCount,
      0
    );
    const totalPrevious = Object.values(differences).reduce(
      (sum: number, diff: any) => sum + diff.previousCount,
      0
    );

    return {
      totalCurrent,
      totalPrevious,
      totalDifference: totalCurrent - totalPrevious,
    };
  }

  /**
   * 履歴レコードを保存
   */
  public async saveScrapingHistory(
    historyRecord: HistoryRecord,
    environment: string
  ): Promise<void> {
    try {
      const year = new Date(historyRecord.timestamp).getFullYear();
      const month = String(new Date(historyRecord.timestamp).getMonth() + 1).padStart(2, '0');
      const recordKey = `scraping-history/records/${year}/${month}/${historyRecord.id}.json`;

      // 個別レコードを保存
      const recordCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: recordKey,
        Body: JSON.stringify(historyRecord, null, 2),
        ContentType: 'application/json',
        Metadata: {
          'record-type': 'scraping-history',
          environment: environment,
          'scraping-type': historyRecord.type,
          timestamp: historyRecord.timestamp,
        },
      });

      await this.s3Client.send(recordCommand);
      log.info(`履歴レコード保存完了: ${recordKey}`);

      // インデックスを更新
      await this.updateHistoryIndex(historyRecord, environment);
    } catch (error) {
      log.error('履歴レコード保存エラー:', error);
      throw error;
    }
  }

  /**
   * 履歴インデックスを更新
   */
  private async updateHistoryIndex(
    historyRecord: HistoryRecord,
    environment: string
  ): Promise<void> {
    try {
      const indexKey = 'scraping-history/index.json';

      // 既存インデックスを取得
      let index: any;
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: indexKey,
        });
        const response = await this.s3Client.send(command);
        index = JSON.parse((await response.Body?.transformToString()) || '{}');
      } catch (error: any) {
        if (error.name === 'NoSuchKey') {
          // 新規インデックス作成
          index = {
            environment,
            totalRecords: 0,
            lastUpdated: new Date().toISOString(),
            records: [],
          };
        } else {
          throw error;
        }
      }

      // レコードを追加（最新を先頭に）
      const year = new Date(historyRecord.timestamp).getFullYear();
      const month = String(new Date(historyRecord.timestamp).getMonth() + 1).padStart(2, '0');
      const filename = `${year}/${month}/${historyRecord.id}.json`;

      index.records.unshift({
        id: historyRecord.id,
        timestamp: historyRecord.timestamp,
        type: historyRecord.type,
        filename,
      });

      // 最新100件に制限
      index.records = index.records.slice(0, 100);
      index.totalRecords = index.records.length;
      index.lastUpdated = new Date().toISOString();

      // インデックスを保存
      const indexCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: indexKey,
        Body: JSON.stringify(index, null, 2),
        ContentType: 'application/json',
        Metadata: {
          'record-type': 'scraping-history-index',
          environment: environment,
          'total-records': index.totalRecords.toString(),
        },
      });

      await this.s3Client.send(indexCommand);
      log.info(`履歴インデックス更新完了: ${indexKey} (${index.totalRecords}件)`);
    } catch (error) {
      log.error('履歴インデックス更新エラー:', error);
      throw error;
    }
  }

  /**
   * 前回カウントデータを更新
   */
  public async updatePreviousCounts(differences: any, environment: string): Promise<void> {
    try {
      const updatePromises: Promise<any>[] = [];

      for (const [type, diff] of Object.entries(differences) as [string, any][]) {
        const countData = {
          count: diff.currentCount,
          timestamp: new Date().toISOString(),
          playerNames: [...diff.newPlayers, ...diff.removedPlayers].filter((name: string) => name),
        };

        // 新しい選手名リストを作成（現在の選手名）
        const currentPlayerNames: string[] = [];
        for (let i = 0; i < diff.currentCount; i++) {
          if (diff.newPlayers[i]) {
            currentPlayerNames.push(diff.newPlayers[i]);
          }
        }

        // 削除されなかった前回の選手名も含める
        const previousNames =
          (await this.getPreviousCountData(type, environment))?.playerNames || [];
        const retainedNames = previousNames.filter(
          (name: string) => !diff.removedPlayers.includes(name)
        );
        countData.playerNames = [...new Set([...currentPlayerNames, ...retainedNames])];

        const key = `previous-counts/${type}-last.json`;
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: JSON.stringify(countData, null, 2),
          ContentType: 'application/json',
          Metadata: {
            'record-type': 'previous-count',
            environment: environment,
            'data-type': type,
            count: diff.currentCount.toString(),
          },
        });

        updatePromises.push(this.s3Client.send(command));
      }

      await Promise.all(updatePromises);
      log.info('前回カウントデータ更新完了:', Object.keys(differences));
    } catch (error) {
      log.error('前回カウントデータ更新エラー:', error);
      throw error;
    }
  }

  /**
   * 前回実行日を取得
   */
  public async getLastExecutionDate(type: string, environment: string): Promise<Date | null> {
    try {
      const indexKey = 'scraping-history/index.json';

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: indexKey,
      });

      const response = await this.s3Client.send(command);
      const index = JSON.parse((await response.Body?.transformToString()) || '{}');

      // 指定タイプの最後の実行を探す
      const lastRecord = index.records.find((record: any) => {
        return record.type === type || record.type === 'both' || type === 'both';
      });

      if (lastRecord) {
        return new Date(lastRecord.timestamp);
      }

      return null;
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return null;
      }
      log.error('前回実行日取得エラー:', error);
      return null;
    }
  }

  /**
   * 履歴一覧を取得
   */
  public async getScrapingHistory(
    environment: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any> {
    try {
      const indexKey = 'scraping-history/index.json';

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: indexKey,
      });

      const response = await this.s3Client.send(command);
      const index = JSON.parse((await response.Body?.transformToString()) || '{}');

      // ページネーション
      const records = index.records.slice(offset, offset + limit);

      // 詳細データを取得
      const detailPromises = records.map(async (record: any) => {
        try {
          const recordKey = `scraping-history/records/${record.filename}`;
          const recordCommand = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: recordKey,
          });
          const recordResponse = await this.s3Client.send(recordCommand);
          return JSON.parse((await recordResponse.Body?.transformToString()) || '{}');
        } catch (error) {
          log.warn(`履歴レコード取得失敗: ${record.filename}`, error);
          return null;
        }
      });

      const detailRecords = (await Promise.all(detailPromises)).filter(record => record !== null);

      return {
        records: detailRecords,
        total: index.totalRecords,
        hasMore: offset + limit < index.totalRecords,
        environment,
      };
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        log.info('履歴インデックスなし');
        return {
          records: [],
          total: 0,
          hasMore: false,
          environment,
        };
      }
      log.error('履歴一覧取得エラー', error);
      throw error;
    }
  }
}
