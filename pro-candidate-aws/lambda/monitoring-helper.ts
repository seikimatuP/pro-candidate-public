/**
 * 監視ヘルパー関数
 * Lambda関数からカスタムメトリクスを送信するためのユーティリティ
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { log } from './logger';

/**
 * CloudWatchClientのインターフェース（テスト用）
 */
export interface CloudWatchClientInterface {
  send(command: PutMetricDataCommand): Promise<unknown>;
}

/**
 * デフォルトのCloudWatchClient（遅延初期化）
 */
let defaultClient: CloudWatchClient | null = null;

function getDefaultClient(): CloudWatchClient {
  if (!defaultClient) {
    defaultClient = new CloudWatchClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
  }
  return defaultClient;
}

/**
 * テスト用: デフォルトクライアントをリセット
 */
export function resetDefaultClient(): void {
  defaultClient = null;
}

interface Dimensions {
  [key: string]: string;
}

/**
 * カスタムメトリクスをCloudWatchに送信
 * @param metricName - メトリクス名
 * @param value - メトリクス値
 * @param unit - 単位 (Count, Seconds, Bytes等)
 * @param dimensions - ディメンション（タグ）
 * @param client - CloudWatchClient（テスト用依存性注入）
 */
export async function putMetric(
  metricName: string,
  value: number,
  unit: string = 'Count',
  dimensions: Dimensions = {},
  client?: CloudWatchClientInterface
): Promise<void> {
  try {
    const cloudwatch = client ?? getDefaultClient();
    const params = {
      Namespace: 'ProBaseballSystem',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit as any,
          Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value })),
          Timestamp: new Date(),
        },
      ],
    };

    await cloudwatch.send(new PutMetricDataCommand(params));
    log.debug(`Metric sent: ${metricName}=${value} ${unit}`);
  } catch (error) {
    log.error('Failed to send metric:', error);
  }
}

/**
 * 処理時間を計測してメトリクスとして送信
 * @param operationName - 操作名
 * @param operation - 実行する関数
 * @param client - CloudWatchClient（テスト用依存性注入）
 * @returns 関数の実行結果
 */
export async function measureOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  client?: CloudWatchClientInterface
): Promise<T> {
  const startTime = Date.now();
  let success = true;

  try {
    const result = await operation();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = Date.now() - startTime;

    // 実行時間メトリクス
    await putMetric(
      `${operationName}Duration`,
      duration,
      'Milliseconds',
      {
        Environment: process.env.STAGE || 'dev',
      },
      client
    );

    // 成功/失敗カウント
    await putMetric(
      `${operationName}${success ? 'Success' : 'Error'}`,
      1,
      'Count',
      {
        Environment: process.env.STAGE || 'dev',
      },
      client
    );
  }
}

/**
 * メモリ使用量を記録
 * @param client - CloudWatchClient（テスト用依存性注入）
 */
export async function recordMemoryUsage(client?: CloudWatchClientInterface): Promise<void> {
  const used = process.memoryUsage();

  await putMetric(
    'MemoryUsed',
    used.heapUsed,
    'Bytes',
    {
      Environment: process.env.STAGE || 'dev',
      Function: process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown',
    },
    client
  );
}

/**
 * 処理したデータ数を記録
 * @param dataType - データタイプ（highschool/university）
 * @param count - 処理数
 * @param client - CloudWatchClient（テスト用依存性注入）
 */
export async function recordProcessedCount(
  dataType: string,
  count: number,
  client?: CloudWatchClientInterface
): Promise<void> {
  await putMetric(
    'ProcessedPlayers',
    count,
    'Count',
    {
      Environment: process.env.STAGE || 'dev',
      DataType: dataType,
    },
    client
  );
}

/**
 * API呼び出し結果を記録
 * @param endpoint - エンドポイント名
 * @param statusCode - HTTPステータスコード
 * @param responseTime - レスポンス時間（ミリ秒）
 * @param client - CloudWatchClient（テスト用依存性注入）
 */
export async function recordApiCall(
  endpoint: string,
  statusCode: number,
  responseTime: number,
  client?: CloudWatchClientInterface
): Promise<void> {
  // レスポンス時間
  await putMetric(
    'ApiResponseTime',
    responseTime,
    'Milliseconds',
    {
      Environment: process.env.STAGE || 'dev',
      Endpoint: endpoint,
      StatusCode: String(statusCode),
    },
    client
  );

  // ステータスコード別カウント
  const statusCategory = statusCode < 400 ? 'Success' : 'Error';
  await putMetric(
    `Api${statusCategory}`,
    1,
    'Count',
    {
      Environment: process.env.STAGE || 'dev',
      Endpoint: endpoint,
      StatusCode: String(statusCode),
    },
    client
  );
}

/**
 * キャッシュヒット率を記録
 * @param hit - キャッシュヒットしたか
 * @param cacheKey - キャッシュキー
 * @param client - CloudWatchClient（テスト用依存性注入）
 */
export async function recordCacheMetrics(
  hit: boolean,
  cacheKey: string,
  client?: CloudWatchClientInterface
): Promise<void> {
  await putMetric(
    hit ? 'CacheHit' : 'CacheMiss',
    1,
    'Count',
    {
      Environment: process.env.STAGE || 'dev',
      CacheKey: cacheKey.substring(0, 50), // キーの一部のみ
    },
    client
  );
}
