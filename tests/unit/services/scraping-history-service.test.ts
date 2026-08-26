import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ScrapingHistoryService } from '../../../pro-candidate-aws/lambda/scraping-history-service';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

// Mock S3 Client
const s3Mock = mockClient(S3Client as any);

// Mock logger
vi.mock('../../../pro-candidate-aws/lambda/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('ScrapingHistoryService', () => {
  let service: ScrapingHistoryService;
  const bucketName = 'test-bucket';

  beforeEach(() => {
    s3Mock.reset();
    // @ts-ignore
    const client = new S3Client({ region: 'ap-northeast-1' });
    service = new ScrapingHistoryService(bucketName, client);
    vi.clearAllMocks();
  });

  describe('getScrapingHistory', () => {
    test('should return history records when index and records exist', async () => {
      // Mock index
      const indexData = {
        totalRecords: 2,
        records: [{ filename: '2024/11/record1.json' }, { filename: '2024/11/record2.json' }],
      };

      // Mock records
      const record1 = { id: 'record1', type: 'highschool' };
      const record2 = { id: 'record2', type: 'university' };

      s3Mock.onAnyCommand().callsFake(async (input: any) => {
        // Check command name indirectly or assume based on input params
        // Since we can't easily check constructor name on the input object (it's the input payload, not the command instance),
        // we have to rely on the input properties.
        // GetObjectCommand has 'Bucket' and 'Key'.
        // PutObjectCommand has 'Bucket', 'Key', 'Body'.

        if (input.Key === 'scraping-history/index.json' && !input.Body) {
          return {
            Body: { transformToString: () => Promise.resolve(JSON.stringify(indexData)) },
          };
        }
        if (input.Key === 'scraping-history/records/2024/11/record1.json') {
          return {
            Body: { transformToString: () => Promise.resolve(JSON.stringify(record1)) },
          };
        }
        if (input.Key === 'scraping-history/records/2024/11/record2.json') {
          return {
            Body: { transformToString: () => Promise.resolve(JSON.stringify(record2)) },
          };
        }
        // Return undefined for unmatched to let other handlers try?
        // Or throw if we want to be strict.
        return undefined;
      });

      const result = await service.getScrapingHistory('dev');

      expect(result.total).toBe(2);
      expect(result.records).toHaveLength(2);
      expect(result.records[0]).toEqual(record1);
      expect(result.records[1]).toEqual(record2);
    });

    test('should return empty list when index does not exist', async () => {
      const error = new Error('NoSuchKey');
      error.name = 'NoSuchKey';
      s3Mock.onAnyCommand().rejects(error);

      const result = await service.getScrapingHistory('dev');

      expect(result.records).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('saveScrapingHistory', () => {
    test('should save history record and update index', async () => {
      const record = {
        id: 'test-id',
        timestamp: '2024-11-24T12:00:00Z',
        type: 'highschool',
        environment: 'dev',
        year: 2024,
        summary: { totalCurrent: 10, totalPrevious: 5, totalDifference: 5 },
        differences: {},
      };

      // Mock existing index
      const existingIndex = {
        records: [],
        totalRecords: 0,
      };

      // Sequence:
      // 1. PutObject (Record)
      // 2. GetObject (Index)
      // 3. PutObject (Index)

      s3Mock.onAnyCommand().callsFake(async (input: any) => {
        if (input.Key === 'scraping-history/index.json' && !input.Body) {
          // GetObject for Index
          return {
            Body: { transformToString: () => Promise.resolve(JSON.stringify(existingIndex)) },
          };
        }
        // PutObject calls return empty object
        return {};
      });

      await service.saveScrapingHistory(record, 'dev');

      // Verify PutObjectCommand calls
      // 1. Save record
      // 2. Update index
      expect(s3Mock.calls()).toHaveLength(3); // GetIndex, PutRecord, PutIndex

      // Verify record save
      const putRecordCall = s3Mock
        .calls()
        .find(call => call.args[0].input.Key?.includes('scraping-history/records/'));
      expect(putRecordCall).toBeDefined();

      // Verify index update
      const putIndexCall = s3Mock
        .calls()
        .find(call => call.args[0].input.Key === 'scraping-history/index.json');
      expect(putIndexCall).toBeDefined();
    });
  });

  describe('compareWithPrevious', () => {
    test('should correctly calculate differences', async () => {
      const currentResult = {
        success: true,
        count: 2,
        players: [{ name: 'Player A' } as any, { name: 'Player B' } as any],
      };

      // Mock previous data
      const previousData = {
        count: 1,
        playerNames: ['Player A'],
      };

      s3Mock.onAnyCommand().resolves({
        Body: { transformToString: () => Promise.resolve(JSON.stringify(previousData)) },
      });

      const diff = await service.compareWithPrevious(currentResult, 'highschool', 'dev');

      expect(diff.highschool.difference).toBe(1);
      expect(diff.highschool.newPlayers).toContain('Player B');
      expect(diff.highschool.removedPlayers).toHaveLength(0);
    });

    test('should calculate differences for type=both', async () => {
      const currentResult = {
        success: true,
        count: 4,
        players: [],
        highschool: {
          success: true,
          count: 2,
          players: [{ name: 'HS Player A' } as any, { name: 'HS Player B' } as any],
        },
        university: {
          success: true,
          count: 2,
          players: [{ name: 'Uni Player A' } as any, { name: 'Uni Player B' } as any],
        },
      };

      // Mock: highschool前回データ→university前回データの順
      s3Mock
        .on(GetObjectCommand, { Key: 'previous-counts/highschool-last.json' })
        .resolves({
          Body: {
            transformToString: () =>
              Promise.resolve(JSON.stringify({ count: 1, playerNames: ['HS Player A'] })),
          },
        })
        .on(GetObjectCommand, { Key: 'previous-counts/university-last.json' })
        .resolves({
          Body: {
            transformToString: () =>
              Promise.resolve(JSON.stringify({ count: 1, playerNames: ['Uni Player A'] })),
          },
        });

      const diff = await service.compareWithPrevious(currentResult, 'both', 'dev');

      expect(diff.highschool.difference).toBe(1);
      expect(diff.highschool.newPlayers).toContain('HS Player B');
      expect(diff.university.difference).toBe(1);
      expect(diff.university.newPlayers).toContain('Uni Player B');
    });

    test('should handle removed players', async () => {
      const currentResult = {
        success: true,
        count: 1,
        players: [{ name: 'Player A' } as any],
      };

      const previousData = {
        count: 2,
        playerNames: ['Player A', 'Player B'],
      };

      s3Mock.onAnyCommand().resolves({
        Body: { transformToString: () => Promise.resolve(JSON.stringify(previousData)) },
      });

      const diff = await service.compareWithPrevious(currentResult, 'highschool', 'dev');

      expect(diff.highschool.difference).toBe(-1);
      expect(diff.highschool.removedPlayers).toContain('Player B');
    });

    test('should handle no previous data', async () => {
      const currentResult = {
        success: true,
        count: 2,
        players: [{ name: 'Player A' } as any, { name: 'Player B' } as any],
      };

      const error = new Error('NoSuchKey');
      error.name = 'NoSuchKey';
      s3Mock.onAnyCommand().rejects(error);

      const diff = await service.compareWithPrevious(currentResult, 'highschool', 'dev');

      expect(diff.highschool.previousCount).toBe(0);
      expect(diff.highschool.currentCount).toBe(2);
      expect(diff.highschool.difference).toBe(2);
    });

    test('should handle unsuccessful current result', async () => {
      const currentResult = {
        success: false,
        count: 0,
        players: [],
      };

      const previousData = {
        count: 2,
        playerNames: ['Player A', 'Player B'],
      };

      s3Mock.onAnyCommand().resolves({
        Body: { transformToString: () => Promise.resolve(JSON.stringify(previousData)) },
      });

      const diff = await service.compareWithPrevious(currentResult, 'highschool', 'dev');

      expect(diff.highschool.currentCount).toBe(0);
      expect(diff.highschool.previousCount).toBe(2);
    });
  });

  describe('getPreviousCountData', () => {
    test('should return previous count data', async () => {
      const previousData = {
        count: 10,
        timestamp: '2024-11-24T12:00:00Z',
        playerNames: ['Player A', 'Player B'],
      };

      s3Mock.onAnyCommand().resolves({
        Body: { transformToString: () => Promise.resolve(JSON.stringify(previousData)) },
      });

      const result = await service.getPreviousCountData('highschool', 'dev');

      expect(result.count).toBe(10);
      expect(result.playerNames).toHaveLength(2);
    });

    test('should return null when NoSuchKey error', async () => {
      const error = new Error('NoSuchKey');
      error.name = 'NoSuchKey';
      s3Mock.onAnyCommand().rejects(error);

      const result = await service.getPreviousCountData('highschool', 'dev');

      expect(result).toBeNull();
    });

    test('should return null when other error occurs', async () => {
      const error = new Error('Network error');
      s3Mock.onAnyCommand().rejects(error);

      const result = await service.getPreviousCountData('highschool', 'dev');

      expect(result).toBeNull();
    });
  });

  describe('calculateSummary', () => {
    test('should calculate summary from differences', () => {
      const differences = {
        highschool: { currentCount: 100, previousCount: 80, difference: 20 },
        university: { currentCount: 150, previousCount: 140, difference: 10 },
      };

      const summary = service.calculateSummary(differences);

      expect(summary.totalCurrent).toBe(250);
      expect(summary.totalPrevious).toBe(220);
      expect(summary.totalDifference).toBe(30);
    });

    test('should handle single type differences', () => {
      const differences = {
        highschool: { currentCount: 50, previousCount: 60, difference: -10 },
      };

      const summary = service.calculateSummary(differences);

      expect(summary.totalCurrent).toBe(50);
      expect(summary.totalPrevious).toBe(60);
      expect(summary.totalDifference).toBe(-10);
    });

    test('should handle empty differences', () => {
      const differences = {};

      const summary = service.calculateSummary(differences);

      expect(summary.totalCurrent).toBe(0);
      expect(summary.totalPrevious).toBe(0);
      expect(summary.totalDifference).toBe(0);
    });
  });

  describe('updatePreviousCounts', () => {
    test('should update previous counts data', async () => {
      const differences = {
        highschool: {
          currentCount: 100,
          previousCount: 90,
          difference: 10,
          newPlayers: ['New Player'],
          removedPlayers: [],
        },
      };

      // Mock getPreviousCountData
      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToString: () =>
            Promise.resolve(
              JSON.stringify({
                count: 90,
                playerNames: ['Player A', 'Player B'],
              })
            ),
        },
      });

      s3Mock.on(PutObjectCommand).resolves({});

      await service.updatePreviousCounts(differences, 'dev');

      const putCalls = s3Mock.calls().filter(call => call.args[0].input.Body);
      expect(putCalls.length).toBeGreaterThan(0);
    });

    test('should handle update error', async () => {
      const differences = {
        highschool: {
          currentCount: 100,
          previousCount: 90,
          difference: 10,
          newPlayers: ['New Player'],
          removedPlayers: [],
        },
      };

      // Mock: Get成功、Put失敗
      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToString: () => Promise.resolve(JSON.stringify({ count: 90, playerNames: [] })),
        },
      });
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 Put error'));

      await expect(service.updatePreviousCounts(differences, 'dev')).rejects.toThrow(
        'S3 Put error'
      );
    });
  });

  describe('getLastExecutionDate', () => {
    test('should return last execution date', async () => {
      const indexData = {
        records: [
          { type: 'highschool', timestamp: '2024-11-24T12:00:00Z' },
          { type: 'university', timestamp: '2024-11-23T12:00:00Z' },
        ],
      };

      s3Mock.onAnyCommand().resolves({
        Body: { transformToString: () => Promise.resolve(JSON.stringify(indexData)) },
      });

      const result = await service.getLastExecutionDate('highschool', 'dev');

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2024-11-24T12:00:00.000Z');
    });

    test('should return date for type=both matching any type', async () => {
      const indexData = {
        records: [{ type: 'university', timestamp: '2024-11-24T12:00:00Z' }],
      };

      s3Mock.onAnyCommand().resolves({
        Body: { transformToString: () => Promise.resolve(JSON.stringify(indexData)) },
      });

      const result = await service.getLastExecutionDate('both', 'dev');

      expect(result).toBeInstanceOf(Date);
    });

    test('should return null when no matching records', async () => {
      const indexData = {
        records: [{ type: 'other', timestamp: '2024-11-24T12:00:00Z' }],
      };

      s3Mock.onAnyCommand().resolves({
        Body: { transformToString: () => Promise.resolve(JSON.stringify(indexData)) },
      });

      const result = await service.getLastExecutionDate('highschool', 'dev');

      expect(result).toBeNull();
    });

    test('should return null when index does not exist', async () => {
      const error = new Error('NoSuchKey');
      error.name = 'NoSuchKey';
      s3Mock.onAnyCommand().rejects(error);

      const result = await service.getLastExecutionDate('highschool', 'dev');

      expect(result).toBeNull();
    });

    test('should return null when other error occurs', async () => {
      s3Mock.onAnyCommand().rejects(new Error('Network error'));

      const result = await service.getLastExecutionDate('highschool', 'dev');

      expect(result).toBeNull();
    });
  });

  describe('getScrapingHistory pagination', () => {
    test('should apply pagination with limit and offset', async () => {
      const indexData = {
        totalRecords: 5,
        records: [
          { filename: '2024/11/record1.json' },
          { filename: '2024/11/record2.json' },
          { filename: '2024/11/record3.json' },
          { filename: '2024/11/record4.json' },
          { filename: '2024/11/record5.json' },
        ],
      };

      s3Mock.onAnyCommand().callsFake(async (input: any) => {
        if (input.Key === 'scraping-history/index.json' && !input.Body) {
          return {
            Body: { transformToString: () => Promise.resolve(JSON.stringify(indexData)) },
          };
        }
        // レコード取得
        return {
          Body: {
            transformToString: () => Promise.resolve(JSON.stringify({ id: 'record' })),
          },
        };
      });

      // limit=2, offset=1
      const result = await service.getScrapingHistory('dev', 2, 1);

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(5);
    });

    test('should handle record fetch failure gracefully', async () => {
      const indexData = {
        totalRecords: 2,
        records: [{ filename: '2024/11/record1.json' }, { filename: '2024/11/record2.json' }],
      };

      let callCount = 0;
      s3Mock.onAnyCommand().callsFake(async (input: any) => {
        callCount++;
        if (input.Key === 'scraping-history/index.json') {
          return {
            Body: { transformToString: () => Promise.resolve(JSON.stringify(indexData)) },
          };
        }
        // 最初のレコードは成功、2番目は失敗
        if (input.Key?.includes('record1')) {
          return {
            Body: {
              transformToString: () => Promise.resolve(JSON.stringify({ id: 'record1' })),
            },
          };
        }
        throw new Error('Failed to fetch record');
      });

      const result = await service.getScrapingHistory('dev');

      // record2のfetch失敗はfilterで除外
      expect(result.records).toHaveLength(1);
      expect(result.records[0].id).toBe('record1');
    });

    test('should throw error for non-NoSuchKey errors in getScrapingHistory', async () => {
      const error = new Error('Access denied');
      error.name = 'AccessDenied';
      s3Mock.onAnyCommand().rejects(error);

      await expect(service.getScrapingHistory('dev')).rejects.toThrow('Access denied');
    });
  });

  describe('saveScrapingHistory error handling', () => {
    test('should throw error when save fails', async () => {
      const record = {
        id: 'test-id',
        timestamp: '2024-11-24T12:00:00Z',
        type: 'highschool',
        environment: 'dev',
        year: 2024,
        summary: { totalCurrent: 10, totalPrevious: 5, totalDifference: 5 },
        differences: {},
      };

      s3Mock.onAnyCommand().rejects(new Error('S3 Put error'));

      await expect(service.saveScrapingHistory(record, 'dev')).rejects.toThrow('S3 Put error');
    });
  });

  describe('updateHistoryIndex', () => {
    test('should create new index when NoSuchKey', async () => {
      const record = {
        id: 'test-id',
        timestamp: '2024-11-24T12:00:00Z',
        type: 'highschool',
        environment: 'dev',
        year: 2024,
        summary: { totalCurrent: 10, totalPrevious: 5, totalDifference: 5 },
        differences: {},
      };

      let putCallArgs: any = null;

      s3Mock.onAnyCommand().callsFake(async (input: any) => {
        // レコード保存（最初のPut）
        if (input.Key?.includes('scraping-history/records/') && input.Body) {
          return {};
        }
        // インデックス取得（Get）- NoSuchKey
        if (input.Key === 'scraping-history/index.json' && !input.Body) {
          const error = new Error('NoSuchKey');
          error.name = 'NoSuchKey';
          throw error;
        }
        // インデックス保存（2番目のPut）
        if (input.Key === 'scraping-history/index.json' && input.Body) {
          putCallArgs = input;
          return {};
        }
        return {};
      });

      await service.saveScrapingHistory(record, 'dev');

      // 新規インデックスが作成されていることを確認
      expect(putCallArgs).toBeDefined();
      const indexBody = JSON.parse(putCallArgs.Body);
      expect(indexBody.totalRecords).toBe(1);
      expect(indexBody.records).toHaveLength(1);
    });

    test('should limit records to 100', async () => {
      const record = {
        id: 'new-id',
        timestamp: '2024-11-24T12:00:00Z',
        type: 'highschool',
        environment: 'dev',
        year: 2024,
        summary: { totalCurrent: 10, totalPrevious: 5, totalDifference: 5 },
        differences: {},
      };

      // 100件のレコードを持つ既存インデックス
      const existingRecords = Array.from({ length: 100 }, (_, i) => ({
        id: `old-${i}`,
        timestamp: '2024-11-01T12:00:00Z',
        type: 'highschool',
        filename: `2024/11/old-${i}.json`,
      }));

      const existingIndex = {
        totalRecords: 100,
        records: existingRecords,
      };

      let putIndexBody: any = null;

      s3Mock.onAnyCommand().callsFake(async (input: any) => {
        if (input.Key?.includes('scraping-history/records/') && input.Body) {
          return {};
        }
        if (input.Key === 'scraping-history/index.json' && !input.Body) {
          return {
            Body: { transformToString: () => Promise.resolve(JSON.stringify(existingIndex)) },
          };
        }
        if (input.Key === 'scraping-history/index.json' && input.Body) {
          putIndexBody = JSON.parse(input.Body);
          return {};
        }
        return {};
      });

      await service.saveScrapingHistory(record, 'dev');

      // 100件を超えないこと、最新が先頭
      expect(putIndexBody.records).toHaveLength(100);
      expect(putIndexBody.records[0].id).toBe('new-id');
    });

    test('should throw error when index update fails', async () => {
      const record = {
        id: 'test-id',
        timestamp: '2024-11-24T12:00:00Z',
        type: 'highschool',
        environment: 'dev',
        year: 2024,
        summary: { totalCurrent: 10, totalPrevious: 5, totalDifference: 5 },
        differences: {},
      };

      s3Mock.onAnyCommand().callsFake(async (input: any) => {
        if (input.Key?.includes('scraping-history/records/') && input.Body) {
          return {};
        }
        if (input.Key === 'scraping-history/index.json' && !input.Body) {
          return {
            Body: {
              transformToString: () => Promise.resolve(JSON.stringify({ records: [] })),
            },
          };
        }
        if (input.Key === 'scraping-history/index.json' && input.Body) {
          throw new Error('Index update failed');
        }
        return {};
      });

      await expect(service.saveScrapingHistory(record, 'dev')).rejects.toThrow(
        'Index update failed'
      );
    });

    test('should throw non-NoSuchKey error when getting index', async () => {
      const record = {
        id: 'test-id',
        timestamp: '2024-11-24T12:00:00Z',
        type: 'highschool',
        environment: 'dev',
        year: 2024,
        summary: { totalCurrent: 10, totalPrevious: 5, totalDifference: 5 },
        differences: {},
      };

      s3Mock.onAnyCommand().callsFake(async (input: any) => {
        if (input.Key?.includes('scraping-history/records/') && input.Body) {
          return {};
        }
        if (input.Key === 'scraping-history/index.json' && !input.Body) {
          // NoSuchKey以外のエラー（例：Access Denied）をスロー
          const error = new Error('Access Denied');
          error.name = 'AccessDeniedException';
          throw error;
        }
        return {};
      });

      await expect(service.saveScrapingHistory(record, 'dev')).rejects.toThrow('Access Denied');
    });
  });
});
