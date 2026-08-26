import { describe, test, expect, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { handler as apiHandler } from '../../../pro-candidate-aws/lambda/api';
import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';

// Create mock clients
const s3Mock = mockClient(S3Client);
const lambdaMock = mockClient(LambdaClient);

// Mock dependencies
const mockGetScrapingHistory = vi.fn();
vi.mock('../../../pro-candidate-aws/lambda/scraping-history-service', () => {
  return {
    ScrapingHistoryService: class {
      getScrapingHistory = mockGetScrapingHistory;
    },
  };
});
vi.mock('../../../pro-candidate-aws/lambda/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    requestStart: vi.fn(),
    requestEnd: vi.fn(),
  },
}));
vi.mock('../../../pro-candidate-aws/lambda/monitoring-helper', () => ({
  recordMetric: vi.fn(),
  logError: vi.fn(),
  measureOperation: vi.fn(),
  recordApiCall: vi.fn(),
}));
vi.mock('../../../pro-candidate-aws/lambda/config-manager', () => ({
  ConfigManager: vi.fn().mockImplementation(() => ({
    getAllConfig: vi.fn().mockResolvedValue({}),
    getScrapingConfig: vi.fn().mockResolvedValue({}),
  })),
}));

// Mock context and callback
const mockContext = {} as Context;
const mockCallback: Callback = vi.fn();

const handler = (event: APIGatewayProxyEvent, context: Context, callback: Callback) =>
  apiHandler(
    {
      ...event,
      requestContext: {
        ...(event.requestContext || {}),
        authorizer: { claims: { 'cognito:groups': 'admin' } },
      },
    } as APIGatewayProxyEvent,
    context,
    callback
  );

describe('API Lambda Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    s3Mock.reset();
    lambdaMock.reset();
    process.env.S3_DATA_BUCKET = 'test-bucket';
    process.env.ENVIRONMENT = 'test';
    process.env.AWS_REGION = 'ap-northeast-1';
  });

  describe('CORS and Health Check', () => {
    test('should handle OPTIONS request (CORS preflight)', async () => {
      const event = { path: '/players', httpMethod: 'OPTIONS' } as any;
      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200);
      expect(response!.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    test('should handle root path health check', async () => {
      const event = { path: '/', httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.message).toBe('Hello from Pro Baseball API');
    });

    test('should handle /health endpoint', async () => {
      const event = { path: '/health', httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.message).toBe('Hello from Pro Baseball API');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('environment');
    });
  });

  describe('/players endpoint', () => {
    test('should get specific type players data', async () => {
      const mockData = {
        players: [{ id: 1, name: 'Test Player' }],
        metadata: { total: 1 },
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToString: () => Promise.resolve(JSON.stringify(mockData)),
        } as any,
      });

      const event = {
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters: { type: 'highschool', year: '2024' },
      } as any;

      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.count).toBe(1);
    });

    test('should return empty data when no players found', async () => {
      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });

      const event = {
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters: { type: 'university', year: '2023' },
      } as any;

      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.count).toBe(0);
    });

    test('should combine highschool and university data', async () => {
      const hsData = { players: [{ id: 1, name: 'HS Player', type: 'highschool' }] };
      const univData = { players: [{ id: 2, name: 'Univ Player', type: 'university' }] };

      s3Mock.on(GetObjectCommand).callsFake(input => {
        if (input.Key.includes('highschool')) {
          return Promise.resolve({
            Body: { transformToString: () => Promise.resolve(JSON.stringify(hsData)) } as any,
          });
        } else if (input.Key.includes('university')) {
          return Promise.resolve({
            Body: { transformToString: () => Promise.resolve(JSON.stringify(univData)) } as any,
          });
        }
        return Promise.reject({ name: 'NoSuchKey' });
      });

      const event = {
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters: { year: '2024' },
      } as any;

      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.success).toBe(true);
      expect(body.count).toBe(2);
      expect(body.metadata).toHaveProperty('highschoolCount');
      expect(body.metadata).toHaveProperty('universityCount');
    });

    test('should handle S3 error in players endpoint', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 Access Denied'));

      const event = {
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters: { type: 'highschool', year: '2024' },
      } as any;

      const response = await handler(event, mockContext, mockCallback);
      // API returns 200 with error details for most S3 errors
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      // When S3 fails, returns empty data
      expect(body.data).toEqual([]);
    });
  });

  describe('/schools endpoint', () => {
    test('should return schools endpoint placeholder', async () => {
      const event = { path: '/schools', httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('implementation pending');
    });
  });

  describe('/years/available endpoint', () => {
    test('should return available years from S3', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          { Key: 'players/highschool/2024.json' },
          { Key: 'players/highschool/2023.json' },
          { Key: 'players/university/2024.json' },
        ],
      });

      const event = { path: '/years/available', httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);

      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('years');
      expect(body.data).toHaveProperty('defaultYear');
      expect(body.data.existingYears).toContain(2024);
    });

    test('should return fallback years on S3 error', async () => {
      s3Mock.on(ListObjectsV2Command).rejects(new Error('S3 Error'));

      const event = { path: '/years/available', httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);

      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.success).toBe(true);
      expect(body.metadata.source).toBe('fallback');
      expect(Array.isArray(body.data.years)).toBe(true);
    });
  });

  describe('/statistics endpoint', () => {
    test('should return statistics data', async () => {
      const hsData = {
        players: [
          {
            name: 'Player 1',
            position: '投手',
            prefecture: '東京都',
            year: 2024,
            filingDate: '2024-09-01',
          },
          {
            name: 'Player 2',
            position: '内野手',
            prefecture: '大阪府',
            year: 2024,
            filingDate: '2024-09-01',
          },
        ],
      };
      const univData = {
        players: [{ name: 'Player 3', position: '外野手', year: 2024 }],
      };

      s3Mock.on(GetObjectCommand).callsFake(input => {
        if (input.Key.includes('highschool')) {
          return Promise.resolve({
            Body: { transformToString: () => Promise.resolve(JSON.stringify(hsData)) } as any,
          });
        } else if (input.Key.includes('university')) {
          return Promise.resolve({
            Body: { transformToString: () => Promise.resolve(JSON.stringify(univData)) } as any,
          });
        }
        return Promise.reject({ name: 'NoSuchKey' });
      });

      const event = { path: '/statistics', httpMethod: 'GET' } as any;
      // 集計APIは未認証の公開ダッシュボードから利用できることも同時に検証する。
      const response = await apiHandler(event, mockContext, mockCallback);

      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('totalPlayers');
      expect(body.data).toHaveProperty('byType');
      expect(body.data).toHaveProperty('byPosition');
      expect(body.data.totalPlayers).toBe(3);
      expect(body.data.byDate['2024-09-01']).toEqual({ highschool: 2, university: 0 });
      expect(JSON.stringify(body)).not.toContain('Player 1');
    });

    test('should handle error in statistics endpoint', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 Error'));

      const event = { path: '/statistics', httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);

      // Statistics endpoint returns 200 even when no data found
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      // With all S3 errors, statistics should be empty
      expect(body.data.totalPlayers).toBe(0);
    });

    test('S3に実在する最新年度を集計対象にする', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          { Key: 'players/highschool/2024.json' },
          { Key: 'players/highschool/2026.json' },
          { Key: 'players/university/2025.json' },
        ],
      });
      s3Mock.on(GetObjectCommand).callsFake(input => {
        if (input.Key === 'players/highschool/2026.json') {
          return Promise.resolve({
            Body: {
              transformToString: () =>
                Promise.resolve(JSON.stringify({ players: [{ name: 'Player 1', year: 2026 }] })),
            } as any,
          });
        }
        return Promise.reject({ name: 'NoSuchKey' });
      });

      const event = { path: '/statistics', httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);

      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      // 2024固定ではなく、列挙結果の最新年度（2026）を読む
      expect(body.data.year).toBe(2026);
      expect(body.data.byYear).toEqual({ '2026': 1 });

      const requestedKeys = s3Mock
        .commandCalls(GetObjectCommand)
        .map(call => call.args[0].input.Key);
      expect(requestedKeys).toEqual([
        'players/highschool/2026.json',
        'players/university/2026.json',
      ]);
    });

    test('年度が列挙できないときは前年度へフォールバックする', async () => {
      s3Mock.on(ListObjectsV2Command).rejects(new Error('S3 Error'));
      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });

      const event = { path: '/statistics', httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);

      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.data.year).toBe(new Date().getFullYear() - 1);
      expect(body.data.totalPlayers).toBe(0);
    });
  });

  describe('/scraping/trigger endpoint', () => {
    test('should reject non-POST requests', async () => {
      const event = { path: '/scraping/trigger', httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(405);
    });

    test('should trigger scraping successfully', async () => {
      lambdaMock.on(InvokeCommand).resolves({
        StatusCode: 200,
        Payload: new TextEncoder().encode(
          JSON.stringify({
            body: JSON.stringify({
              success: true,
              count: 5,
              results: [{ type: 'highschool', success: true, count: 5 }],
            }),
          })
        ),
      });

      const event = {
        path: '/scraping/trigger',
        httpMethod: 'POST',
        body: JSON.stringify({ type: 'highschool', year: 2024 }),
      } as any;

      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.success).toBe(true);
    });

    test('should handle already executed today error', async () => {
      lambdaMock.on(InvokeCommand).resolves({
        StatusCode: 200,
        Payload: new TextEncoder().encode(
          JSON.stringify({
            body: JSON.stringify({
              skipped: true,
              error: 'ALREADY_EXECUTED_TODAY',
              message: '本日のスクレイピングは既に実行済みです',
              lastExecutionDate: '2024-01-01',
            }),
          })
        ),
      });

      const event = {
        path: '/scraping/trigger',
        httpMethod: 'POST',
        body: JSON.stringify({ type: 'highschool', year: 2024 }),
      } as any;

      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.skipped).toBe(true);
      expect(body.error).toBe('ALREADY_EXECUTED_TODAY');
    });

    test('should handle Lambda invocation error', async () => {
      lambdaMock.on(InvokeCommand).rejects(new Error('Lambda Error'));

      const event = {
        path: '/scraping/trigger',
        httpMethod: 'POST',
        body: JSON.stringify({ type: 'both', year: 2024 }),
      } as any;

      const response = await handler(event, mockContext, mockCallback);
      // On Lambda error, returns 200 with failed status in results
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.results.some((r: any) => r.status === 'failed')).toBe(true);
    });
  });

  describe('/scraping/history endpoint', () => {
    test('should get scraping history', async () => {
      mockGetScrapingHistory.mockResolvedValue({
        records: [{ id: '1', timestamp: '2024-01-01', type: 'highschool' }],
        total: 1,
        hasMore: false,
      });

      const event = {
        path: '/scraping/history',
        httpMethod: 'GET',
        queryStringParameters: { environment: 'dev', limit: '10', offset: '0' },
      } as any;

      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.metadata).toHaveProperty('total');
    });

    test('should handle history service error', async () => {
      mockGetScrapingHistory.mockRejectedValue(new Error('History Error'));

      const event = {
        path: '/scraping/history',
        httpMethod: 'GET',
      } as any;

      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(500);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown path', async () => {
      const event = { path: '/unknown', httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(404);
      const body = JSON.parse(response!.body);
      expect(body.error).toBe('Not Found');
      expect(body).toHaveProperty('availableEndpoints');
    });

    test('should handle undefined path parameters', async () => {
      const event = { httpMethod: 'GET' } as any;
      const response = await handler(event, mockContext, mockCallback);
      expect(response!.statusCode).toBe(200); // Should default to health check
    });
  });
});
