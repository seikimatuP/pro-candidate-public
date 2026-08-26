import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import * as fs from 'fs';
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { log } from './logger';
import { ScrapingHistoryService } from './scraping-history-service';
import { filterExcludedPlayers, ExclusionListUnavailableError } from './exclusion-list';
import { resolvePrefecture } from '../../shared/prefectures';

log.info('🔍 Debug: Lambda environment info');
log.info('Working directory:', process.cwd());
log.info('__dirname:', __dirname);
log.info('__filename:', __filename);

log.info('📂 Files in current directory:');
try {
  const files = fs.readdirSync('.');
  files.forEach(file => {
    const stats = fs.statSync(file);
    log.info(`  ${file} (${stats.isDirectory() ? 'dir' : 'file'}, ${stats.size} bytes)`);
  });
} catch (error) {
  log.error('Error reading directory:', error);
}

/** 選手データのS3キー構造は `players/<種別>/<年度>.json` */
const PLAYER_TYPES = ['highschool', 'university'] as const;
type PlayerType = (typeof PLAYER_TYPES)[number];

const playerDataPrefix = (type: PlayerType): string => `players/${type}/`;

/** 全種別のプレフィックス（年度探索の既定対象） */
const ALL_PLAYER_PREFIXES = PLAYER_TYPES.map(playerDataPrefix);

/** `players/highschool/2025.json` から年度部分を取り出す */
const YEAR_KEY_PATTERN = /\/(\d{4})\.json$/;

/**
 * S3に選手データが実在する年度を新しい順で返す。
 *
 * 指定プレフィックス配下をListObjectsV2で列挙するだけの素直な実装。
 * 年度ファイルは種別ごとに数個しかなく、ページングが必要な規模にはならないため
 * 継続トークンは扱わない。呼び出しはyearクエリ未指定時のみ（種別指定時は1回、
 * 未指定時は2回）で、レスポンス生成コストとして許容する。
 */
const listExistingPlayerYears = async (
  s3Client: S3Client,
  bucketName: string | undefined,
  prefixes: string[]
): Promise<number[]> => {
  const responses = await Promise.all(
    prefixes.map(prefix =>
      s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          Delimiter: '/',
        })
      )
    )
  );

  const years = new Set<number>();
  responses.forEach(response => {
    (response.Contents || []).forEach(item => {
      const match = item.Key?.match(YEAR_KEY_PATTERN);
      if (match) {
        years.add(parseInt(match[1], 10));
      }
    });
  });

  return Array.from(years).sort((a, b) => b - a);
};

/**
 * yearクエリ未指定時に使う既定年度を決める。
 *
 * データが存在しない年度を固定値で返すと「0件」に見えてしまうため、
 * S3に実在する最新年度を選ぶ。List失敗・データ皆無のときだけ前年度に退避する
 * （`years/available` のフォールバックと同じ基準）。
 */
const resolveDefaultYear = async (
  s3Client: S3Client,
  bucketName: string | undefined,
  prefixes: string[]
): Promise<number> => {
  const fallbackYear = new Date().getFullYear() - 1;

  try {
    const existingYears = await listExistingPlayerYears(s3Client, bucketName, prefixes);
    if (existingYears.length === 0) {
      log.warn(`No player data found in S3. Falling back to ${fallbackYear}`);
      return fallbackYear;
    }

    log.debug(`Existing player data years: ${existingYears}, selected: ${existingYears[0]}`);
    return existingYears[0];
  } catch (error) {
    log.warn('Failed to list player data years. Falling back to', fallbackYear, error);
    return fallbackYear;
  }
};

/**
 * 一覧APIのページング既定値・上限。
 *
 * 1リクエストで全件を返すと、掲載データ一式をそのまま持ち出せてしまい
 * 利用規約の「複製・再配布の禁止」と実装が食い違う。1ページの上限を設けて、
 * 全件取得には明示的な繰り返しリクエストが必要な形にする（#L7）。
 */
const PLAYERS_PAGE_DEFAULT_LIMIT = 100;
const PLAYERS_PAGE_MAX_LIMIT = 500;

/** ページング用のクエリパラメータを、範囲を丸めたうえで取り出す */
const resolvePaging = (
  queryParams: Record<string, string | undefined>
): { limit: number; offset: number } => {
  const parsedLimit = parseInt(queryParams.limit || '', 10);
  const parsedOffset = parseInt(queryParams.offset || '', 10);

  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), PLAYERS_PAGE_MAX_LIMIT)
    : PLAYERS_PAGE_DEFAULT_LIMIT;
  const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

  return { limit, offset };
};

/** ページ1枚分を切り出し、続きの有無を添えて返す */
const paginate = <T>(
  items: T[],
  { limit, offset }: { limit: number; offset: number }
): { page: T[]; total: number; limit: number; offset: number; hasMore: boolean } => {
  const page = items.slice(offset, offset + limit);

  return {
    page,
    total: items.length,
    limit,
    offset,
    hasMore: offset + page.length < items.length,
  };
};

/** 複数のS3オブジェクトのうち最も新しい更新時刻をISO文字列で返す */
const latestModifiedAt = (candidates: (Date | undefined)[]): string | undefined => {
  const timestamps = candidates
    .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()))
    .map(date => date.getTime());

  return timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : undefined;
};

/**
 * CORSの許可オリジンを返す
 *
 * CDK（pro-candidate-aws-stack.ts）が環境変数 CORS_ALLOWED_ORIGIN を注入する。
 * prodは本番CloudFrontのオリジンのみ、dev・ローカルは従来どおり全許可（'*'）。
 * Lambdaが返すヘッダーはAPI Gateway側のCORS設定を上書きするため、両者を揃える必要がある。
 */
const resolveAllowedOrigin = (): string => {
  const configured = process.env.CORS_ALLOWED_ORIGIN;
  if (configured) {
    return configured;
  }

  // 環境変数が無い場合のフォールバック（ローカル実行・単体テスト想定）
  return process.env.STAGE === 'prod' ? 'https://dh2yk8y9mj9wl.cloudfront.net' : '*';
};

/** 認証なしで公開する、個人を識別できない読み取り専用エンドポイント。 */
const PUBLIC_GET_PATHS = new Set(['', 'health', 'statistics', 'schools', 'years/available']);

/** API Gateway REST authorizer の claims から Cognito グループを取り出す。 */
const resolveCognitoGroups = (event: APIGatewayProxyEvent): string[] => {
  const rawGroups = event.requestContext.authorizer?.claims?.['cognito:groups'];

  if (Array.isArray(rawGroups)) {
    return rawGroups.filter((group): group is string => typeof group === 'string');
  }

  if (typeof rawGroups !== 'string') {
    return [];
  }

  const trimmed = rawGroups.trim();
  if (!trimmed) return [];

  // API Gateway では通常カンマ区切り文字列。テストや他の統合経路で
  // JSON 配列文字列が渡されても安全に解釈できるようにする。
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((group): group is string => typeof group === 'string');
      }
    } catch {
      return [];
    }
  }

  return trimmed
    .split(',')
    .map(group => group.trim())
    .filter(Boolean);
};

const isPublicRequest = (method: string, cleanPath: string): boolean =>
  method === 'GET' && PUBLIC_GET_PATHS.has(cleanPath);

const isAdminRequest = (event: APIGatewayProxyEvent): boolean =>
  resolveCognitoGroups(event).includes('admin');

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  log.requestStart(event);

  const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });
  const bucketName = process.env.S3_DATA_BUCKET;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': resolveAllowedOrigin(),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control',
    // キャッシュ制御: データは常に最新を取得
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  try {
    const path = event.pathParameters?.proxy || event.path || '';
    const method = event.httpMethod || 'GET';

    // Clean up path - remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // CORS preflight
    if (method === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // API Gateway のメソッド設定だけに依存せず、Lambda でも admin を強制する。
    // 誤って認証設定を外した場合や直接 invoke された場合も fail closed にする。
    if (!isPublicRequest(method, cleanPath) && !isAdminRequest(event)) {
      const forbidden = {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Forbidden',
          message: 'この操作には管理者権限が必要です。',
        }),
      };
      log.warn(`Admin authorization denied: ${method} ${cleanPath}`);
      log.requestEnd(forbidden.statusCode, Date.now() - startTime);
      return forbidden;
    }

    log.debug(`Processing ${method} request for path: ${cleanPath} (original: ${path})`);

    // Health check endpoint
    if (cleanPath === 'health' || cleanPath === '') {
      const response = {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Hello from Pro Baseball API',
          timestamp: new Date().toISOString(),
          path: path,
          method: method,
          environment: process.env.ENVIRONMENT,
          s3Bucket: bucketName,
        }),
      };

      log.requestEnd(response.statusCode, Date.now() - startTime);
      return response;
    }

    // Players endpoint
    if (cleanPath === 'players') {
      try {
        // Get query parameters
        const queryParams = event.queryStringParameters || {};
        const type = queryParams.type; // 'highschool' or 'university'
        const isKnownType = PLAYER_TYPES.includes(type as PlayerType);

        // 種別が指定されていればその種別のみ、未指定なら両方を年度探索の対象にする
        const lookupPrefixes = isKnownType
          ? [playerDataPrefix(type as PlayerType)]
          : ALL_PLAYER_PREFIXES;

        const requestedYear = parseInt(queryParams.year || '', 10);
        // year未指定（または不正値）のときはS3にデータが実在する最新年度を使う
        const year = Number.isFinite(requestedYear)
          ? requestedYear
          : await resolveDefaultYear(s3Client, bucketName, lookupPrefixes);

        const paging = resolvePaging(queryParams);

        log.debug(
          `Players query: type=${type}, year=${year} (requested: ${queryParams.year}), ` +
            `limit=${paging.limit}, offset=${paging.offset}`
        );

        // If specific type and year requested
        if (isKnownType) {
          const specificKey = `players/${type}/${year}.json`;

          try {
            const response = await s3Client.send(
              new GetObjectCommand({
                Bucket: bucketName,
                Key: specificKey,
              })
            );

            const content = await response.Body!.transformToString();
            const data = JSON.parse(content);

            log.debug(`Found ${type} data for ${year}: ${data.players.length} players`);

            // 削除請求を受けた選手を配信前に除く。過年度ファイルは請求より前に
            // 保存されているため、読み出しのたびに通さないと削除が反映されない（#L2）
            const visiblePlayers = await filterExcludedPlayers(data.players || []);
            const paged = paginate(visiblePlayers, paging);

            // lastUpdatedはレスポンス生成時刻ではなくS3オブジェクトの更新時刻
            const metadata: Record<string, unknown> = {
              year,
              type,
              ...(data.metadata || {}),
              total: paged.total,
              limit: paged.limit,
              offset: paged.offset,
              hasMore: paged.hasMore,
            };
            const lastUpdated = latestModifiedAt([response.LastModified]);
            if (lastUpdated) {
              metadata.lastUpdated = lastUpdated;
            }

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                data: paged.page,
                metadata,
                count: paged.page.length,
              }),
            };
          } catch (s3Error) {
            if (s3Error instanceof ExclusionListUnavailableError) {
              throw s3Error;
            }

            log.debug(`No ${type} data found for ${year}`);

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                data: [],
                metadata: {
                  year: year,
                  type: type,
                  message: `${year}年度の${type === 'highschool' ? '高校生' : '大学生'}データが存在しません。スクレイピングを実行してデータを取得してください。`,
                },
                count: 0,
              }),
            };
          }
        }

        // Try to get combined data from both highschool and university
        log.debug('Attempting to combine highschool and university data...');

        let combinedPlayers: any[] = [];
        let totalCount = 0;
        let metadata: any = { year: year };
        // 取り込んだS3オブジェクトの更新時刻（lastUpdatedの算出に使う）
        const modifiedAtCandidates: (Date | undefined)[] = [];

        // Try to get highschool data
        try {
          const hsResponse = await s3Client.send(
            new GetObjectCommand({
              Bucket: bucketName,
              Key: `players/highschool/${year}.json`,
            })
          );

          const hsContent = await hsResponse.Body!.transformToString();
          const hsData = JSON.parse(hsContent);

          if (hsData.players && Array.isArray(hsData.players)) {
            combinedPlayers = combinedPlayers.concat(hsData.players);
            totalCount += hsData.players.length;
            metadata.highschoolCount = hsData.players.length;
            modifiedAtCandidates.push(hsResponse.LastModified);
            log.debug(`Found ${hsData.players.length} highschool players`);
          }
        } catch (hsError) {
          log.debug('No highschool data found for', year);
          metadata.highschoolCount = 0;
        }

        // Try to get university data
        try {
          const univResponse = await s3Client.send(
            new GetObjectCommand({
              Bucket: bucketName,
              Key: `players/university/${year}.json`,
            })
          );

          const univContent = await univResponse.Body!.transformToString();
          const univData = JSON.parse(univContent);

          if (univData.players && Array.isArray(univData.players)) {
            combinedPlayers = combinedPlayers.concat(univData.players);
            totalCount += univData.players.length;
            metadata.universityCount = univData.players.length;
            modifiedAtCandidates.push(univResponse.LastModified);
            log.debug(`Found ${univData.players.length} university players`);
          }
        } catch (univError) {
          log.debug('No university data found for', year);
          metadata.universityCount = 0;
        }

        if (totalCount > 0) {
          // 削除請求を受けた選手を配信前に除く（#L2）
          const visiblePlayers = await filterExcludedPlayers(combinedPlayers);
          const paged = paginate(visiblePlayers, paging);

          // 種別ごとの件数も除外後の値に揃える（除外前の件数を残すと差分から
          // 「何件消したか」が読み取れてしまう）
          metadata.highschoolCount = visiblePlayers.filter(p => p.type === 'highschool').length;
          metadata.universityCount = visiblePlayers.filter(p => p.type === 'university').length;
          metadata.totalCount = paged.total;
          metadata.total = paged.total;
          metadata.limit = paged.limit;
          metadata.offset = paged.offset;
          metadata.hasMore = paged.hasMore;

          // lastUpdatedはレスポンス生成時刻ではなくS3オブジェクトの更新時刻。
          // 高校生・大学生で更新日が違う場合は新しい方を採る。
          const lastUpdated = latestModifiedAt(modifiedAtCandidates);
          if (lastUpdated) {
            metadata.lastUpdated = lastUpdated;
          }

          log.info(`Combined data: ${paged.total} total players (page ${paged.page.length})`);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: paged.page,
              metadata: metadata,
              count: paged.page.length,
            }),
          };
        } else {
          log.debug('No data found for year', year);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: [],
              metadata: {
                year: year,
                message: `${year}年度のデータが存在しません。スクレイピングを実行してデータを取得してください。`,
              },
              count: 0,
            }),
          };
        }
      } catch (error: any) {
        if (error instanceof ExclusionListUnavailableError) {
          // 削除請求の除外リストが読めないときは配信しない。
          // 除外を確認できないまま返すと、削除済みの選手を公開してしまう
          log.error('Exclusion list unavailable. Refusing to serve players data:', error);
          return {
            statusCode: 503,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Service Unavailable',
              message: 'データを一時的に配信できません。時間をおいて再度お試しください。',
            }),
          };
        }

        log.error('Players endpoint error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch players data',
            message: error.message,
          }),
        };
      }
    }

    // Schools endpoint
    if (cleanPath === 'schools') {
      const response = {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: [],
          message: 'Schools API - implementation pending',
        }),
      };

      log.requestEnd(response.statusCode, Date.now() - startTime);
      return response;
    }

    // Available years endpoint
    if (cleanPath === 'years/available') {
      try {
        log.debug('Getting available years from S3...');

        // S3に実際に存在する年度データのみ使用（/players の既定年度と同じ判定を使う）
        const existingYears = await listExistingPlayerYears(
          s3Client,
          bucketName,
          ALL_PLAYER_PREFIXES
        );

        const currentYear = new Date().getFullYear();
        const yearsToReturn = existingYears.length > 0 ? existingYears : [currentYear - 1];

        const defaultYear = existingYears[0] || currentYear - 1;

        log.debug(`Existing years: ${existingYears}, default: ${defaultYear}`);

        const response = {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              years: yearsToReturn,
              defaultYear: defaultYear,
              currentYear: currentYear,
              latestYear: existingYears[0] || currentYear - 1,
              existingYears: existingYears,
            },
            metadata: {
              totalYears: yearsToReturn.length,
              existingDataYears: existingYears.length,
              source: 'existing',
              lastUpdated: new Date().toISOString(),
            },
          }),
        };

        log.requestEnd(response.statusCode, Date.now() - startTime);
        return response;
      } catch (error) {
        log.error('Error getting available years:', error);

        // Fallback: S3にデータが存在する可能性の高い直近年度のみ返す
        const currentYear = new Date().getFullYear();
        const fallbackYears = [currentYear - 1, currentYear - 2];

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              years: fallbackYears,
              defaultYear: currentYear - 1,
              currentYear: currentYear,
              latestYear: currentYear - 1,
            },
            metadata: {
              totalYears: fallbackYears.length,
              source: 'fallback',
              message: 'Using fallback years due to S3 access error',
              lastUpdated: new Date().toISOString(),
            },
          }),
        };
      }
    }

    // Statistics endpoint
    if (cleanPath === 'statistics') {
      try {
        // 対象年度はS3に実在する最新年度を選ぶ（GET /players と同じ基準）。
        // 固定年度を読むと、データが無い年を指したときに全項目0の統計を
        // 公開APIとして返してしまうため
        const targetYear = await resolveDefaultYear(s3Client, bucketName, ALL_PLAYER_PREFIXES);

        // 高校生と大学生のデータを取得
        let totalPlayers = 0;
        const byType: Record<string, number> = {};
        const byYear: Record<string, number> = {};
        const byPosition: Record<string, number> = {};
        const byPrefecture: Record<string, number> = {};
        const byDate: Record<string, { highschool: number; university: number }> = {};
        let unresolvedPrefectureCount = 0;
        const modifiedAtCandidates: (Date | undefined)[] = [];

        for (const type of PLAYER_TYPES) {
          try {
            const response = await s3Client.send(
              new GetObjectCommand({
                Bucket: bucketName,
                Key: `${playerDataPrefix(type)}${targetYear}.json`,
              })
            );

            const fileContent = await response.Body!.transformToString();
            const data = JSON.parse(fileContent);
            modifiedAtCandidates.push(response.LastModified);
            // 統計も削除請求の除外を通した後の母集団で集計する（#L2）
            const players = await filterExcludedPlayers(data.players || []);

            byType[type] = players.length;
            totalPlayers += players.length;

            // 年度別集計
            players.forEach((player: any) => {
              const year = player.year || targetYear;
              byYear[year] = (byYear[year] || 0) + 1;

              // ポジション別集計
              if (player.position) {
                byPosition[player.position] = (byPosition[player.position] || 0) + 1;
              }

              // 都道府県別集計
              // 表記ゆれ（東京/東京都、全角スペース）を正規化し、大学生は
              // 大学名から所在地を引く。region に入る連盟名（東京六大学野球連盟 等）は
              // 都道府県ではないので集計に混ぜない。ロジックは shared/prefectures.ts で
              // フロントエンドと共有する。
              const area = resolvePrefecture({
                type: player.type || type,
                school: player.school,
                prefecture: player.prefecture,
              });
              if (area) byPrefecture[area] = (byPrefecture[area] || 0) + 1;
              else unresolvedPrefectureCount++;

              const filingDate = player.filingDate?.split('T')[0];
              if (/^\d{4}-\d{2}-\d{2}$/.test(filingDate || '')) {
                const current = byDate[filingDate] || { highschool: 0, university: 0 };
                current[type]++;
                byDate[filingDate] = current;
              }
            });
          } catch (err) {
            if (err instanceof ExclusionListUnavailableError) {
              throw err;
            }

            log.warn(`Failed to get ${type} data for statistics:`, err);
            byType[type] = 0;
          }
        }

        const response = {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              // 集計対象の年度。利用側が「いつのデータか」を判別できるよう明示する
              year: targetYear,
              totalPlayers,
              byType,
              byYear,
              byPosition,
              byPrefecture,
              unresolvedPrefectureCount,
              byDate,
              lastUpdated: latestModifiedAt(modifiedAtCandidates),
            },
          }),
        };

        log.requestEnd(response.statusCode, Date.now() - startTime);
        return response;
      } catch (error) {
        if (error instanceof ExclusionListUnavailableError) {
          log.error('Exclusion list unavailable. Refusing to serve statistics:', error);
          const unavailable = {
            statusCode: 503,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Service Unavailable',
              message: 'データを一時的に配信できません。時間をおいて再度お試しください。',
            }),
          };
          log.requestEnd(unavailable.statusCode, Date.now() - startTime);
          return unavailable;
        }

        log.error('Statistics error:', error);
        const response = {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to generate statistics',
          }),
        };
        log.requestEnd(response.statusCode, Date.now() - startTime);
        return response;
      }
    }

    // Scraping trigger endpoint
    if (cleanPath === 'scraping/trigger') {
      if (method !== 'POST') {
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({
            error: 'Method Not Allowed',
            message: 'Only POST method is allowed for this endpoint',
          }),
        };
      }

      try {
        // Lambda SDK is imported at top level now

        const lambdaClient = new LambdaClient({
          region: process.env.AWS_REGION || 'ap-northeast-1',
        });

        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const type = body.type || 'both'; // 'highschool', 'university', or 'both'
        const year = body.year || new Date().getFullYear(); // 年度指定（デフォルトは現在年度）

        log.info(`Triggering scraping for type: ${type}, year: ${year}`);

        const results: any[] = [];
        const promises: Promise<void>[] = [];

        // 環境に応じたLambda関数名を動的に生成
        const environment = process.env.ENVIRONMENT || 'dev';
        const scrapingFunctionName = `pro-baseball-scraping-${environment}`;

        log.info(
          `Using scraping function: ${scrapingFunctionName} for environment: ${environment}`
        );

        // Trigger highschool scraping (synchronous for immediate feedback)
        if (type === 'highschool' || type === 'both') {
          const hsCommand = new InvokeCommand({
            FunctionName: scrapingFunctionName,
            InvocationType: 'RequestResponse', // Synchronous invocation for faster completion detection
            Payload: JSON.stringify({
              type: 'highschool',
              year: year,
              source: 'Frontend', // フロントエンドからの実行を明示
            }),
          });

          promises.push(
            lambdaClient
              .send(hsCommand)
              .then(response => {
                const payload = JSON.parse(new TextDecoder().decode(response.Payload));
                const body = payload.body ? JSON.parse(payload.body) : {};

                // 実行制限チェック
                if (body.skipped && body.error === 'ALREADY_EXECUTED_TODAY') {
                  results.push({
                    type: 'highschool',
                    status: 'skipped',
                    skipped: true,
                    error: body.error,
                    lastExecutionDate: body.lastExecutionDate,
                    message: body.message,
                  });
                  log.info('Highschool scraping skipped - already executed today');
                  return;
                }

                // スクレイピングLambdaから返される詳細な結果を使用
                const result = body.results?.find((r: any) => r.type === 'highschool') || {
                  type: 'highschool',
                  success: body.success || false,
                  count: body.count || 0,
                  error: body.error,
                };

                results.push({
                  type: 'highschool',
                  status: 'completed',
                  success: result.success,
                  count: result.count || 0,
                  error: result.error,
                  message: body.message,
                });

                log.info('Highschool scraping completed:', result);
              })
              .catch(error => {
                results.push({ type: 'highschool', status: 'failed', error: error.message });
                log.error('Highschool scraping failed:', error);
              })
          );
        }

        // Trigger university scraping (synchronous for immediate feedback)
        if (type === 'university' || type === 'both') {
          const univCommand = new InvokeCommand({
            FunctionName: scrapingFunctionName,
            InvocationType: 'RequestResponse', // Synchronous invocation for faster completion detection
            Payload: JSON.stringify({
              type: 'university',
              year: year,
              source: 'Frontend', // フロントエンドからの実行を明示
            }),
          });

          promises.push(
            lambdaClient
              .send(univCommand)
              .then(response => {
                const payload = JSON.parse(new TextDecoder().decode(response.Payload));
                const body = payload.body ? JSON.parse(payload.body) : {};

                // 実行制限チェック
                if (body.skipped && body.error === 'ALREADY_EXECUTED_TODAY') {
                  results.push({
                    type: 'university',
                    status: 'skipped',
                    skipped: true,
                    error: body.error,
                    lastExecutionDate: body.lastExecutionDate,
                    message: body.message,
                  });
                  log.info('University scraping skipped - already executed today');
                  return;
                }

                // スクレイピングLambdaから返される詳細な結果を使用
                const result = body.results?.find((r: any) => r.type === 'university') || {
                  type: 'university',
                  success: body.success || false,
                  count: body.count || 0,
                  error: body.error,
                };

                results.push({
                  type: 'university',
                  status: 'completed',
                  success: result.success,
                  count: result.count || 0,
                  error: result.error,
                  message: body.message,
                });

                log.info('University scraping completed:', result);
              })
              .catch(error => {
                results.push({ type: 'university', status: 'failed', error: error.message });
                log.error('University scraping failed:', error);
              })
          );
        }

        // Wait for all scraping to complete
        await Promise.all(promises);

        // Check if all were skipped
        const allSkipped = results.every(r => r.status === 'skipped');
        const anySkipped = results.some(r => r.status === 'skipped');

        if (allSkipped && results.length > 0) {
          // すべてスキップされた場合
          const firstSkipped = results[0];
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: false,
              skipped: true,
              error: 'ALREADY_EXECUTED_TODAY',
              message: '本日のスクレイピングは既に実行済みです',
              lastExecutionDate: firstSkipped.lastExecutionDate,
              timestamp: new Date().toISOString(),
            }),
          };
        }

        const response = {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: anySkipped
              ? '部分的に完了（一部は本日実行済み）'
              : `Scraping completed for ${type}`,
            results: results,
            timestamp: new Date().toISOString(),
            completed: true,
            partiallySkipped: anySkipped,
          }),
        };

        log.requestEnd(response.statusCode, Date.now() - startTime);
        return response;
      } catch (error: any) {
        log.error('Scraping trigger error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to trigger scraping',
            message: error.message,
          }),
        };
      }
    }

    // Scraping history endpoint
    if (cleanPath.startsWith('scraping/history')) {
      try {
        const queryParams = event.queryStringParameters || {};
        const environment = queryParams.environment || 'dev'; // dev/prod
        const limit = parseInt(queryParams.limit || '50', 10);
        const offset = parseInt(queryParams.offset || '0', 10);

        log.debug(
          `Scraping history query: environment=${environment}, limit=${limit}, offset=${offset}`
        );

        const bucketName = process.env.S3_DATA_BUCKET || 'pro-candidate-data-dev';
        const historyService = new ScrapingHistoryService(bucketName);
        const historyData = await historyService.getScrapingHistory(environment, limit, offset);

        const response = {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: historyData.records,
            metadata: {
              environment,
              total: historyData.total,
              limit,
              offset,
              hasMore: historyData.hasMore,
              currentCount: historyData.records.length,
            },
          }),
        };

        log.requestEnd(response.statusCode, Date.now() - startTime);
        return response;
      } catch (error: any) {
        log.error('Scraping history error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch scraping history',
            message: error.message,
          }),
        };
      }
    }

    // Not found
    const response = {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Not Found',
        path: path,
        method: method,
        availableEndpoints: [
          '/health',
          '/statistics',
          '/players',
          '/schools',
          '/years/available',
          '/scraping/trigger',
          '/scraping/history',
        ],
      }),
    };

    log.requestEnd(response.statusCode, Date.now() - startTime);
    return response;
  } catch (error: any) {
    log.error('API error:', error);
    const response = {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
      }),
    };

    log.requestEnd(response.statusCode, Date.now() - startTime);
    return response;
  }
};
