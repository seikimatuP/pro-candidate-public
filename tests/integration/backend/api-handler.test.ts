import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { handler as apiHandler } from '../../../pro-candidate-aws/lambda/api';
import { resetExclusionListCache } from '../../../pro-candidate-aws/lambda/exclusion-list';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// @ts-ignore - aws-sdk-client-mock has @smithy/types version mismatch with AWS SDK v3 (3.x vs 4.x) in CI
const s3Mock = mockClient(S3Client);
// @ts-ignore - aws-sdk-client-mock has @smithy/types version mismatch with AWS SDK v3 (3.x vs 4.x) in CI
const lambdaMock = mockClient(LambdaClient);

// 同じ型不整合でコマンドクラスを .on()/.commandCalls() に直接渡せないため、any 経由で呼ぶ
const s3On = (command: unknown, input?: unknown): any =>
  input === undefined
    ? (s3Mock as any).on(command)
    : (s3Mock as any).on(command, input as Record<string, unknown>);
const s3CommandCalls = (command: unknown): unknown[] => (s3Mock as any).commandCalls(command);

const asAdmin = (event: APIGatewayProxyEvent): APIGatewayProxyEvent =>
  ({
    ...event,
    requestContext: {
      ...(event.requestContext || {}),
      authorizer: { claims: { 'cognito:groups': 'admin' } },
    },
  }) as APIGatewayProxyEvent;

// 既存の正常系テストは管理者として実行する。認可失敗は専用テストで raw handler を使う。
const handler = (event: APIGatewayProxyEvent, context: any, callback: any) =>
  apiHandler(asAdmin(event), context, callback);

/** S3が返す「キーが存在しない」エラー */
const noSuchKeyError = (): Error => {
  const error = new Error('The specified key does not exist.');
  error.name = 'NoSuchKey';
  return error;
};

describe('API Handler Integration Tests', () => {
  beforeEach(() => {
    s3Mock.reset();
    lambdaMock.reset();
    resetExclusionListCache();
    process.env.S3_DATA_BUCKET = 'test-bucket';
    process.env.ENVIRONMENT = 'test';
    process.env.AWS_REGION = 'ap-northeast-1';

    // 削除請求の除外リストは既定で「未設置」。個別のテストで上書きする
    s3On(GetObjectCommand, { Key: 'config/exclusion-list.json' }).rejects(noSuchKeyError());
  });

  it('GET /health returns 200 OK', async () => {
    const event = {
      path: '/health',
      httpMethod: 'GET',
    } as APIGatewayProxyEvent;

    // @ts-ignore - handler signature match
    const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Hello from Pro Baseball API');
    expect(body.environment).toBe('test');
  });

  it.each([
    ['GET', '/players'],
    ['POST', '/players'],
    ['PUT', '/players/player-1'],
    ['DELETE', '/players/player-1'],
    ['GET', '/players/search'],
    ['GET', '/schools/test-school/players'],
    ['POST', '/scraping/trigger'],
    ['GET', '/scraping/history'],
  ])('%s %s はadmin claimがなければ403で拒否する', async (httpMethod, path) => {
    const event = {
      path,
      httpMethod,
      requestContext: { authorizer: { claims: { 'cognito:groups': 'user' } } },
    } as unknown as APIGatewayProxyEvent;

    // @ts-ignore - handler signature match
    const result = (await apiHandler(event, {} as any, {} as any)) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error).toBe('Forbidden');
    expect(s3Mock.calls()).toHaveLength(0);
    expect(lambdaMock.calls()).toHaveLength(0);
  });

  it('GET /players returns data from S3', async () => {
    const mockData = {
      players: [{ name: 'Test Player', school: 'Test High' }],
      metadata: { total: 1 },
    };

    const s3Response: any = {
      $metadata: {},
      Body: {
        transformToString: () => Promise.resolve(JSON.stringify(mockData)),
      },
    };
    // onAnyCommand は除外リストの取得まで拾ってしまうため、キーを指定して差し替える
    s3On(GetObjectCommand, { Key: 'players/highschool/2024.json' }).resolves(s3Response);

    const event = {
      path: '/players',
      httpMethod: 'GET',
      queryStringParameters: { type: 'highschool', year: '2024' },
    } as unknown as APIGatewayProxyEvent;

    // @ts-ignore
    const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Test Player');

    // Verify S3 call（選手データの取得 → 除外リストの確認、の順に2回）
    expect(s3Mock.calls()).toHaveLength(2);
    const s3Call = s3Mock.call(0);
    expect(s3Call.args[0].input).toEqual({
      Bucket: 'test-bucket',
      Key: 'players/highschool/2024.json',
    });
  });

  // 削除請求フロー（#L2）: 保存済みの過年度データにも除外を効かせる
  it('GET /players excludes players on the deletion-request exclusion list', async () => {
    s3On(GetObjectCommand, { Key: 'config/exclusion-list.json' }).resolves({
      $metadata: {},
      Body: {
        transformToString: () =>
          Promise.resolve(
            JSON.stringify({ players: [{ name: '削除 太郎', school: 'テスト高校' }] })
          ),
      },
    } as any);
    s3On(GetObjectCommand, { Key: 'players/highschool/2024.json' }).resolves({
      $metadata: {},
      Body: {
        transformToString: () =>
          Promise.resolve(
            JSON.stringify({
              players: [
                { name: '削除太郎', school: 'テスト高校' },
                { name: '残留次郎', school: 'テスト高校' },
              ],
              metadata: {},
            })
          ),
      },
    } as any);

    const event = {
      path: '/players',
      httpMethod: 'GET',
      queryStringParameters: { type: 'highschool', year: '2024' },
    } as unknown as APIGatewayProxyEvent;

    // @ts-ignore
    const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.map((player: { name: string }) => player.name)).toEqual(['残留次郎']);
    expect(body.metadata.total).toBe(1);
  });

  it('GET /players returns 503 when the exclusion list cannot be read', async () => {
    const accessDenied = new Error('Access Denied');
    accessDenied.name = 'AccessDenied';
    s3On(GetObjectCommand, { Key: 'config/exclusion-list.json' }).rejects(accessDenied);
    s3On(GetObjectCommand, { Key: 'players/highschool/2024.json' }).resolves({
      $metadata: {},
      Body: {
        transformToString: () =>
          Promise.resolve(JSON.stringify({ players: [{ name: '選手A' }], metadata: {} })),
      },
    } as any);

    const event = {
      path: '/players',
      httpMethod: 'GET',
      queryStringParameters: { type: 'highschool', year: '2024' },
    } as unknown as APIGatewayProxyEvent;

    // @ts-ignore
    const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(503);
  });

  // 一覧APIのページング（#L7）: 1リクエストで全件を返さない
  describe('GET /players のページング', () => {
    const manyPlayers = (count: number): any => ({
      $metadata: {},
      Body: {
        transformToString: () =>
          Promise.resolve(
            JSON.stringify({
              players: Array.from({ length: count }, (_, index) => ({
                name: `選手${index}`,
                school: 'テスト高校',
              })),
              metadata: {},
            })
          ),
      },
    });

    const request = (queryStringParameters: Record<string, string>) =>
      ({
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters,
      }) as unknown as APIGatewayProxyEvent;

    it('limit未指定なら既定の100件までしか返さない', async () => {
      s3On(GetObjectCommand, { Key: 'players/highschool/2024.json' }).resolves(manyPlayers(250));

      // @ts-ignore
      const result = (await handler(
        request({ type: 'highschool', year: '2024' }),
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      const body = JSON.parse(result.body);
      expect(body.data).toHaveLength(100);
      expect(body.count).toBe(100);
      expect(body.metadata.total).toBe(250);
      expect(body.metadata.hasMore).toBe(true);
    });

    it('offsetで続きを取得でき、最終ページはhasMoreがfalseになる', async () => {
      s3On(GetObjectCommand, { Key: 'players/highschool/2024.json' }).resolves(manyPlayers(250));

      // @ts-ignore
      const result = (await handler(
        request({ type: 'highschool', year: '2024', limit: '100', offset: '200' }),
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      const body = JSON.parse(result.body);
      expect(body.data).toHaveLength(50);
      expect(body.data[0].name).toBe('選手200');
      expect(body.metadata.hasMore).toBe(false);
    });

    it('limitは上限500件で丸められる', async () => {
      s3On(GetObjectCommand, { Key: 'players/highschool/2024.json' }).resolves(manyPlayers(900));

      // @ts-ignore
      const result = (await handler(
        request({ type: 'highschool', year: '2024', limit: '5000' }),
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      const body = JSON.parse(result.body);
      expect(body.data).toHaveLength(500);
      expect(body.metadata.limit).toBe(500);
    });
  });

  it('GET /players handles S3 errors gracefully (returns 200 with empty data)', async () => {
    s3Mock.onAnyCommand().rejects(new Error('S3 Error'));

    const event = {
      path: '/players',
      httpMethod: 'GET',
      queryStringParameters: { type: 'highschool', year: '2024' },
    } as unknown as APIGatewayProxyEvent;

    // @ts-ignore
    const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

    // API returns 200 with empty data on S3 error (graceful degradation)
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.metadata.message).toContain('存在しません');
  });

  describe('GET /players の既定年度（year 未指定）', () => {
    /** `players/<type>/<year>.json` を返す S3 レスポンスを組み立てる */
    const playersObject = (playerNames: string[], lastModified?: Date): any => ({
      $metadata: {},
      LastModified: lastModified,
      Body: {
        transformToString: () =>
          Promise.resolve(
            JSON.stringify({ players: playerNames.map(name => ({ name })), metadata: {} })
          ),
      },
    });

    it('S3 に存在する最新年度を選び、metadata.year に反映する', async () => {
      s3On(ListObjectsV2Command, { Prefix: 'players/highschool/' }).resolves({
        Contents: [
          { Key: 'players/highschool/2024.json' },
          { Key: 'players/highschool/2025.json' },
        ],
      } as any);
      s3On(ListObjectsV2Command, { Prefix: 'players/university/' }).resolves({
        Contents: [{ Key: 'players/university/2025.json' }],
      } as any);
      s3On(GetObjectCommand, { Key: 'players/highschool/2025.json' }).resolves(
        playersObject(['高校生A'])
      );
      s3On(GetObjectCommand, { Key: 'players/university/2025.json' }).resolves(
        playersObject(['大学生A'])
      );

      const event = {
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters: null,
      } as unknown as APIGatewayProxyEvent;

      // @ts-ignore
      const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.metadata.year).toBe(2025);
      expect(body.count).toBe(2);
    });

    it('List に失敗したら前年度にフォールバックする', async () => {
      s3On(ListObjectsV2Command).rejects(new Error('AccessDenied'));
      s3On(GetObjectCommand).rejects(new Error('NoSuchKey'));

      const event = {
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters: null,
      } as unknown as APIGatewayProxyEvent;

      // @ts-ignore
      const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

      const body = JSON.parse(result.body);
      expect(body.metadata.year).toBe(new Date().getFullYear() - 1);
    });

    it('year を明示したときは List せずその年度を使う', async () => {
      s3On(GetObjectCommand).resolves(playersObject(['選手A']));

      const event = {
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters: { year: '2023' },
      } as unknown as APIGatewayProxyEvent;

      // @ts-ignore
      const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

      const body = JSON.parse(result.body);
      expect(body.metadata.year).toBe(2023);
      expect(s3CommandCalls(ListObjectsV2Command)).toHaveLength(0);
    });
  });

  describe('GET /players の metadata.lastUpdated', () => {
    const playersObject = (lastModified: Date): any => ({
      $metadata: {},
      LastModified: lastModified,
      Body: {
        transformToString: () =>
          Promise.resolve(JSON.stringify({ players: [{ name: '選手A' }], metadata: {} })),
      },
    });

    it('S3 オブジェクトの LastModified（複数あれば最新）を返す', async () => {
      s3On(GetObjectCommand, { Key: 'players/highschool/2025.json' }).resolves(
        playersObject(new Date('2026-08-10T01:00:00.000Z'))
      );
      s3On(GetObjectCommand, { Key: 'players/university/2025.json' }).resolves(
        playersObject(new Date('2026-08-15T02:30:00.000Z'))
      );

      const event = {
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters: { year: '2025' },
      } as unknown as APIGatewayProxyEvent;

      // @ts-ignore
      const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

      const body = JSON.parse(result.body);
      expect(body.metadata.lastUpdated).toBe('2026-08-15T02:30:00.000Z');
    });

    it('種別指定時も対象オブジェクトの LastModified を返す', async () => {
      s3On(GetObjectCommand).resolves(playersObject(new Date('2026-08-14T04:00:00.000Z')));

      const event = {
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters: { type: 'highschool', year: '2025' },
      } as unknown as APIGatewayProxyEvent;

      // @ts-ignore
      const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

      const body = JSON.parse(result.body);
      expect(body.metadata.lastUpdated).toBe('2026-08-14T04:00:00.000Z');
      expect(body.metadata.year).toBe(2025);
    });

    it('LastModified が取れないときは lastUpdated を付けない（応答時刻で埋めない）', async () => {
      s3On(GetObjectCommand).resolves({
        $metadata: {},
        Body: {
          transformToString: () =>
            Promise.resolve(JSON.stringify({ players: [{ name: '選手A' }], metadata: {} })),
        },
      } as any);

      const event = {
        path: '/players',
        httpMethod: 'GET',
        queryStringParameters: { year: '2025' },
      } as unknown as APIGatewayProxyEvent;

      // @ts-ignore
      const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

      const body = JSON.parse(result.body);
      expect(body.metadata.lastUpdated).toBeUndefined();
    });
  });

  describe('GET /statistics の都道府県集計（正規化）', () => {
    /**
     * 実データに近い形の選手レコードを返す S3 レスポンス。
     * 高校生は prefecture に表記ゆれ（全角スペース・「都」付き）が混ざり、
     * 大学生は prefecture が空で region に連盟名が入る。
     */
    const playersObject = (players: Record<string, unknown>[]): any => ({
      $metadata: {},
      LastModified: new Date('2026-08-20T00:00:00.000Z'),
      Body: {
        transformToString: () => Promise.resolve(JSON.stringify({ players, metadata: {} })),
      },
    });

    const statisticsBody = async () => {
      const event = {
        path: '/statistics',
        httpMethod: 'GET',
        queryStringParameters: null,
      } as unknown as APIGatewayProxyEvent;

      // 公開エンドポイントなので admin claim 無しの raw handler で叩く
      // @ts-ignore - handler signature match
      const result = (await apiHandler(event, {} as any, {} as any)) as APIGatewayProxyResult;
      expect(result.statusCode).toBe(200);
      return JSON.parse(result.body).data;
    };

    beforeEach(() => {
      s3On(ListObjectsV2Command, { Prefix: 'players/highschool/' }).resolves({
        Contents: [{ Key: 'players/highschool/2025.json' }],
      } as any);
      s3On(ListObjectsV2Command, { Prefix: 'players/university/' }).resolves({
        Contents: [{ Key: 'players/university/2025.json' }],
      } as any);
    });

    it('「東京」「東京都」「東　京」を東京へ統合する', async () => {
      s3On(GetObjectCommand, { Key: 'players/highschool/2025.json' }).resolves(
        playersObject([
          { name: '選手A', school: '甲府工', prefecture: '東京', filingDate: '2025-09-01' },
          { name: '選手B', school: '帝京', prefecture: '東京都', filingDate: '2025-09-01' },
          { name: '選手C', school: '日大三', prefecture: '東　京', filingDate: '2025-09-02' },
          { name: '選手D', school: '横浜', prefecture: '神奈川県', filingDate: '2025-09-02' },
        ])
      );
      s3On(GetObjectCommand, { Key: 'players/university/2025.json' }).rejects(noSuchKeyError());

      const data = await statisticsBody();

      expect(data.byPrefecture['東京']).toBe(3);
      expect(data.byPrefecture['東京都']).toBeUndefined();
      expect(data.byPrefecture['東　京']).toBeUndefined();
      expect(data.byPrefecture['神奈川']).toBe(1);
      expect(data.unresolvedPrefectureCount).toBe(0);
    });

    it('大学生は連盟名(region)ではなく大学名から都道府県を引く', async () => {
      s3On(GetObjectCommand, { Key: 'players/highschool/2025.json' }).rejects(noSuchKeyError());
      s3On(GetObjectCommand, { Key: 'players/university/2025.json' }).resolves(
        playersObject([
          {
            name: '選手E',
            school: '早稲田大学',
            region: '東京六大学野球連盟',
            filingDate: '2025-09-03',
          },
          {
            name: '選手F',
            school: '亜細亜大学',
            region: '東都大学野球連盟',
            filingDate: '2025-09-03',
          },
          {
            name: '選手G',
            school: '仙台大学',
            region: '仙台六大学野球連盟',
            filingDate: '2025-09-04',
          },
        ])
      );

      const data = await statisticsBody();

      expect(data.byPrefecture['東京']).toBe(2);
      expect(data.byPrefecture['宮城']).toBe(1);
      // 連盟名がそのまま都道府県として現れないこと
      expect(Object.keys(data.byPrefecture)).not.toContain('東京六大学野球連盟');
      expect(Object.keys(data.byPrefecture).some(key => key.includes('連盟'))).toBe(false);
      expect(data.unresolvedPrefectureCount).toBe(0);
    });

    it('対応表にない大学・都道府県未設定は unresolvedPrefectureCount に数える', async () => {
      s3On(GetObjectCommand, { Key: 'players/highschool/2025.json' }).resolves(
        playersObject([{ name: '選手H', school: '無名高', filingDate: '2025-09-05' }])
      );
      s3On(GetObjectCommand, { Key: 'players/university/2025.json' }).resolves(
        playersObject([
          {
            name: '選手I',
            school: '存在しない大学',
            region: '不明リーグ',
            filingDate: '2025-09-05',
          },
        ])
      );

      const data = await statisticsBody();

      expect(data.unresolvedPrefectureCount).toBe(2);
      expect(Object.keys(data.byPrefecture)).toHaveLength(0);
    });

    it('個人を識別できる情報（氏名・学校名）を返さない', async () => {
      s3On(GetObjectCommand, { Key: 'players/highschool/2025.json' }).resolves(
        playersObject([
          { name: '山田太郎', school: '甲府工', prefecture: '山梨', filingDate: '2025-09-06' },
        ])
      );
      s3On(GetObjectCommand, { Key: 'players/university/2025.json' }).rejects(noSuchKeyError());

      const data = await statisticsBody();

      const serialized = JSON.stringify(data);
      expect(serialized).not.toContain('山田太郎');
      expect(serialized).not.toContain('甲府工');
      expect(data.byPrefecture['山梨']).toBe(1);
      expect(data.byDate['2025-09-06']).toEqual({ highschool: 1, university: 0 });
    });
  });

  it('POST /scraping/trigger invokes Lambda twice for type="both"', async () => {
    const lambdaResponse: any = {
      $metadata: {},
      StatusCode: 200,
      Payload: new TextEncoder().encode(
        JSON.stringify({
          body: JSON.stringify({ success: true, count: 0 }),
        })
      ),
    };
    lambdaMock.onAnyCommand().resolves(lambdaResponse);

    const event = {
      path: '/scraping/trigger',
      httpMethod: 'POST',
      body: JSON.stringify({ type: 'both', year: 2024 }),
    } as unknown as APIGatewayProxyEvent;

    // @ts-ignore
    const result = (await handler(event, {} as any, {} as any)) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);

    // Verify Lambda invoke (called twice for 'both')
    expect(lambdaMock.calls()).toHaveLength(2);
  });
});
