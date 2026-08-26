import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  putMetric,
  measureOperation,
  recordMemoryUsage,
  recordProcessedCount,
  recordApiCall,
  recordCacheMetrics,
  resetDefaultClient,
  CloudWatchClientInterface,
} from '../../../pro-candidate-aws/lambda/monitoring-helper';

// モッククライアント作成
function createMockClient(): CloudWatchClientInterface & { send: ReturnType<typeof vi.fn> } {
  return {
    send: vi.fn().mockResolvedValue({}),
  };
}

describe('monitoring-helper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.STAGE = 'dev';
    process.env.AWS_REGION = 'ap-northeast-1';
    resetDefaultClient();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('putMetric', () => {
    it('メトリクスを正常に送信できること', async () => {
      const mockClient = createMockClient();

      await putMetric('TestMetric', 100, 'Count', {}, mockClient);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const command = mockClient.send.mock.calls[0][0];
      expect(command.input.Namespace).toBe('ProBaseballSystem');
      expect(command.input.MetricData[0].MetricName).toBe('TestMetric');
      expect(command.input.MetricData[0].Value).toBe(100);
      expect(command.input.MetricData[0].Unit).toBe('Count');
    });

    it('ディメンション付きでメトリクスを送信できること', async () => {
      const mockClient = createMockClient();

      await putMetric(
        'TestMetric',
        50,
        'Milliseconds',
        { Environment: 'prod', Function: 'test-function' },
        mockClient
      );

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const command = mockClient.send.mock.calls[0][0];
      const dimensions = command.input.MetricData[0].Dimensions;
      expect(dimensions).toContainEqual({ Name: 'Environment', Value: 'prod' });
      expect(dimensions).toContainEqual({ Name: 'Function', Value: 'test-function' });
    });

    it('デフォルト値でメトリクスを送信できること', async () => {
      const mockClient = createMockClient();

      await putMetric('TestMetric', 1, undefined, undefined, mockClient);

      const command = mockClient.send.mock.calls[0][0];
      expect(command.input.MetricData[0].Unit).toBe('Count');
      expect(command.input.MetricData[0].Dimensions).toEqual([]);
    });

    it('エラー発生時にログを出力して続行すること', async () => {
      const mockClient = createMockClient();
      mockClient.send.mockRejectedValue(new Error('CloudWatch error'));

      // エラーを投げずに完了することを確認
      await expect(putMetric('TestMetric', 100, 'Count', {}, mockClient)).resolves.toBeUndefined();
    });
  });

  describe('measureOperation', () => {
    it('操作を実行して時間を計測できること', async () => {
      const mockClient = createMockClient();
      const operation = vi.fn().mockResolvedValue('result');

      const result = await measureOperation('TestOperation', operation, mockClient);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledTimes(1);
      // Duration と Success の2つのメトリクスが送信される
      expect(mockClient.send).toHaveBeenCalledTimes(2);
    });

    it('成功時にSuccessメトリクスを送信すること', async () => {
      const mockClient = createMockClient();
      const operation = vi.fn().mockResolvedValue('success');

      await measureOperation('TestOperation', operation, mockClient);

      const calls = mockClient.send.mock.calls;
      const successCall = calls.find(
        call => call[0].input.MetricData[0].MetricName === 'TestOperationSuccess'
      );
      expect(successCall).toBeDefined();
      expect(successCall[0].input.MetricData[0].Value).toBe(1);
    });

    it('失敗時にErrorメトリクスを送信すること', async () => {
      const mockClient = createMockClient();
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(measureOperation('TestOperation', operation, mockClient)).rejects.toThrow(
        'Operation failed'
      );

      const calls = mockClient.send.mock.calls;
      const errorCall = calls.find(
        call => call[0].input.MetricData[0].MetricName === 'TestOperationError'
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[0].input.MetricData[0].Value).toBe(1);
    });

    it('実行時間をDurationメトリクスとして送信すること', async () => {
      const mockClient = createMockClient();
      const operation = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });

      await measureOperation('TestOperation', operation, mockClient);

      const calls = mockClient.send.mock.calls;
      const durationCall = calls.find(
        call => call[0].input.MetricData[0].MetricName === 'TestOperationDuration'
      );
      expect(durationCall).toBeDefined();
      expect(durationCall[0].input.MetricData[0].Unit).toBe('Milliseconds');
      // CI環境ではタイマーの精度が低いため、5ms以上であれば成功とする
      expect(durationCall[0].input.MetricData[0].Value).toBeGreaterThanOrEqual(5);
    });
  });

  describe('recordMemoryUsage', () => {
    it('メモリ使用量を記録できること', async () => {
      const mockClient = createMockClient();
      process.env.AWS_LAMBDA_FUNCTION_NAME = 'test-function';

      await recordMemoryUsage(mockClient);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const command = mockClient.send.mock.calls[0][0];
      expect(command.input.MetricData[0].MetricName).toBe('MemoryUsed');
      expect(command.input.MetricData[0].Unit).toBe('Bytes');
      expect(command.input.MetricData[0].Value).toBeGreaterThan(0);
    });

    it('Lambda関数名がない場合はunknownを使用すること', async () => {
      const mockClient = createMockClient();
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;

      await recordMemoryUsage(mockClient);

      const command = mockClient.send.mock.calls[0][0];
      const dimensions = command.input.MetricData[0].Dimensions;
      expect(dimensions).toContainEqual({ Name: 'Function', Value: 'unknown' });
    });
  });

  describe('recordProcessedCount', () => {
    it('処理数を記録できること', async () => {
      const mockClient = createMockClient();

      await recordProcessedCount('highschool', 150, mockClient);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const command = mockClient.send.mock.calls[0][0];
      expect(command.input.MetricData[0].MetricName).toBe('ProcessedPlayers');
      expect(command.input.MetricData[0].Value).toBe(150);
      const dimensions = command.input.MetricData[0].Dimensions;
      expect(dimensions).toContainEqual({ Name: 'DataType', Value: 'highschool' });
    });

    it('university タイプを記録できること', async () => {
      const mockClient = createMockClient();

      await recordProcessedCount('university', 200, mockClient);

      const command = mockClient.send.mock.calls[0][0];
      const dimensions = command.input.MetricData[0].Dimensions;
      expect(dimensions).toContainEqual({ Name: 'DataType', Value: 'university' });
    });
  });

  describe('recordApiCall', () => {
    it('成功したAPI呼び出しを記録できること', async () => {
      const mockClient = createMockClient();

      await recordApiCall('/players', 200, 150, mockClient);

      expect(mockClient.send).toHaveBeenCalledTimes(2); // ResponseTime + ApiSuccess
      const calls = mockClient.send.mock.calls;

      // ResponseTimeメトリクス
      const responseTimeCall = calls.find(
        call => call[0].input.MetricData[0].MetricName === 'ApiResponseTime'
      );
      expect(responseTimeCall).toBeDefined();
      expect(responseTimeCall[0].input.MetricData[0].Value).toBe(150);
      expect(responseTimeCall[0].input.MetricData[0].Unit).toBe('Milliseconds');

      // ApiSuccessメトリクス
      const successCall = calls.find(
        call => call[0].input.MetricData[0].MetricName === 'ApiSuccess'
      );
      expect(successCall).toBeDefined();
    });

    it('失敗したAPI呼び出しを記録できること', async () => {
      const mockClient = createMockClient();

      await recordApiCall('/players', 500, 50, mockClient);

      const calls = mockClient.send.mock.calls;
      const errorCall = calls.find(call => call[0].input.MetricData[0].MetricName === 'ApiError');
      expect(errorCall).toBeDefined();
    });

    it('4xxエラーをエラーとして記録すること', async () => {
      const mockClient = createMockClient();

      await recordApiCall('/players', 404, 30, mockClient);

      const calls = mockClient.send.mock.calls;
      const errorCall = calls.find(call => call[0].input.MetricData[0].MetricName === 'ApiError');
      expect(errorCall).toBeDefined();
    });

    it('ステータスコードをディメンションに含めること', async () => {
      const mockClient = createMockClient();

      await recordApiCall('/health', 200, 10, mockClient);

      const command = mockClient.send.mock.calls[0][0];
      const dimensions = command.input.MetricData[0].Dimensions;
      expect(dimensions).toContainEqual({ Name: 'StatusCode', Value: '200' });
      expect(dimensions).toContainEqual({ Name: 'Endpoint', Value: '/health' });
    });
  });

  describe('recordCacheMetrics', () => {
    it('キャッシュヒットを記録できること', async () => {
      const mockClient = createMockClient();

      await recordCacheMetrics(true, 'players_highschool_2024', mockClient);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const command = mockClient.send.mock.calls[0][0];
      expect(command.input.MetricData[0].MetricName).toBe('CacheHit');
      expect(command.input.MetricData[0].Value).toBe(1);
    });

    it('キャッシュミスを記録できること', async () => {
      const mockClient = createMockClient();

      await recordCacheMetrics(false, 'players_university_2024', mockClient);

      const command = mockClient.send.mock.calls[0][0];
      expect(command.input.MetricData[0].MetricName).toBe('CacheMiss');
    });

    it('長いキャッシュキーを50文字に切り詰めること', async () => {
      const mockClient = createMockClient();
      const longKey = 'a'.repeat(100);

      await recordCacheMetrics(true, longKey, mockClient);

      const command = mockClient.send.mock.calls[0][0];
      const dimensions = command.input.MetricData[0].Dimensions;
      const cacheKeyDimension = dimensions.find(
        (d: { Name: string; Value: string }) => d.Name === 'CacheKey'
      );
      expect(cacheKeyDimension.Value.length).toBe(50);
    });
  });

  describe('環境変数', () => {
    it('STAGE環境変数がない場合はdevを使用すること', async () => {
      const mockClient = createMockClient();
      delete process.env.STAGE;

      await recordProcessedCount('highschool', 10, mockClient);

      const command = mockClient.send.mock.calls[0][0];
      const dimensions = command.input.MetricData[0].Dimensions;
      expect(dimensions).toContainEqual({ Name: 'Environment', Value: 'dev' });
    });

    it('prod環境でprodを使用すること', async () => {
      const mockClient = createMockClient();
      process.env.STAGE = 'prod';

      await recordProcessedCount('highschool', 10, mockClient);

      const command = mockClient.send.mock.calls[0][0];
      const dimensions = command.input.MetricData[0].Dimensions;
      expect(dimensions).toContainEqual({ Name: 'Environment', Value: 'prod' });
    });
  });
});
