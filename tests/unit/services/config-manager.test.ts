import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ConfigManager } from '../../../pro-candidate-aws/lambda/config-manager';

// Logger mock
vi.mock('../../../pro-candidate-aws/lambda/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ConfigManager', () => {
  let configManager: any;
  const ssmMock = mockClient(SSMClient);
  const secretsMock = mockClient(SecretsManagerClient);
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    ssmMock.reset();
    secretsMock.reset();
    s3Mock.reset();
    vi.clearAllMocks();

    process.env.AWS_REGION = 'ap-northeast-1';
    process.env.STAGE = 'test';
    process.env.NODE_ENV = 'test';
    process.env.S3_DATA_BUCKET = 'test-bucket';
    process.env.CONFIG_S3_PATH = 'config/test-config.json';

    configManager = new ConfigManager();
  });

  afterEach(() => {
    delete process.env.TEST_VAR;
  });

  describe('getEnvironmentVariable', () => {
    it('環境変数の値を取得できる', () => {
      process.env.TEST_VAR = 'test-value';
      const result = configManager.getEnvironmentVariable('TEST_VAR');
      expect(result).toBe('test-value');
    });

    it('環境変数が存在しない場合、デフォルト値を返す', () => {
      const result = configManager.getEnvironmentVariable('NONEXISTENT_VAR', 'default');
      expect(result).toBe('default');
    });

    it('環境変数が存在しない場合、デフォルト値がnullなら空文字を返す', () => {
      const result = configManager.getEnvironmentVariable('NONEXISTENT_VAR');
      expect(result).toBe('');
    });
  });

  describe('getSSMParameter', () => {
    it('SSMから値を取得してキャッシュする', async () => {
      ssmMock.on(GetParameterCommand).resolves({
        Parameter: { Value: 'ssm-value' },
      });

      // 1回目: SSMから取得
      const result1 = await configManager.getSSMParameter('test-param');
      expect(result1).toBe('ssm-value');
      expect(ssmMock.calls()).toHaveLength(1);

      // 2回目: キャッシュから取得
      const result2 = await configManager.getSSMParameter('test-param');
      expect(result2).toBe('ssm-value');
      expect(ssmMock.calls()).toHaveLength(1); // 呼び出し回数は増えない
    });

    it('キャッシュ期限切れの場合は再取得する', async () => {
      ssmMock.on(GetParameterCommand).resolves({
        Parameter: { Value: 'ssm-value' },
      });

      // キャッシュTTLを短く設定して取得
      await configManager.getSSMParameter('test-param', 0.001); // 1ms

      // 少し待つ
      await new Promise(resolve => setTimeout(resolve, 10));

      // 再取得
      await configManager.getSSMParameter('test-param');
      expect(ssmMock.calls()).toHaveLength(2);
    });

    it('エラー時はnullを返しログ出力する', async () => {
      ssmMock.on(GetParameterCommand).rejects(new Error('SSM Error'));

      const result = await configManager.getSSMParameter('test-param');
      expect(result).toBeNull();
    });
  });

  describe('getS3Config', () => {
    const mockConfig = {
      scraping: { timeout: 5000 },
      processing: { batchSize: 50 },
    };

    it('S3から設定を取得してキャッシュする', async () => {
      // S3のレスポンスモック (transformToStringメソッドを持つBody)
      s3Mock.on(GetObjectCommand).resolves({
        Body: { transformToString: () => Promise.resolve(JSON.stringify(mockConfig)) } as any,
      });

      const result = await configManager.getS3Config();
      expect(result).toEqual(mockConfig);
      expect(s3Mock.calls()).toHaveLength(1);

      // キャッシュ確認
      const result2 = await configManager.getS3Config();
      expect(result2).toEqual(mockConfig);
      expect(s3Mock.calls()).toHaveLength(1);
    });

    it('環境変数が未設定の場合はデフォルト設定を返す', async () => {
      delete process.env.S3_DATA_BUCKET;
      const result = await configManager.getS3Config();
      expect(result).toEqual(configManager.getDefaultConfig());
      expect(s3Mock.calls()).toHaveLength(0);
    });

    it('S3レスポンスが空の場合はエラーとしてデフォルト設定を返す', async () => {
      s3Mock.on(GetObjectCommand).resolves({ Body: undefined });
      const result = await configManager.getS3Config();
      expect(result).toEqual(configManager.getDefaultConfig());
    });

    it('S3エラー時はデフォルト設定を返す', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 Error'));
      const result = await configManager.getS3Config();
      expect(result).toEqual(configManager.getDefaultConfig());
    });
  });

  describe('getSecret', () => {
    const mockSecret = { key: 'secret-value' };

    it('Secrets Managerから値を取得してキャッシュする', async () => {
      secretsMock.on(GetSecretValueCommand).resolves({
        SecretString: JSON.stringify(mockSecret),
      });

      const result = await configManager.getSecret('test-secret');
      expect(result).toEqual(mockSecret);
      expect(secretsMock.calls()).toHaveLength(1);

      // キャッシュ確認
      const result2 = await configManager.getSecret('test-secret');
      expect(result2).toEqual(mockSecret);
      expect(secretsMock.calls()).toHaveLength(1);
    });

    it('SecretStringが空の場合はnullを返す', async () => {
      secretsMock.on(GetSecretValueCommand).resolves({ SecretString: undefined });
      const result = await configManager.getSecret('test-secret');
      expect(result).toBeNull();
    });

    it('エラー時はnullを返す', async () => {
      secretsMock.on(GetSecretValueCommand).rejects(new Error('Secret Error'));
      const result = await configManager.getSecret('test-secret');
      expect(result).toBeNull();
    });
  });

  describe('getAllConfig', () => {
    it('全ソースからの設定を統合して返す', async () => {
      // Setup
      process.env.APP_VERSION_PARAM = '/app/version';
      process.env.FEATURE_FLAGS_PARAM = '/app/features';

      ssmMock.on(GetParameterCommand).callsFake(input => {
        if (input.Name === '/app/version')
          return Promise.resolve({ Parameter: { Value: '1.0.0' } });
        if (input.Name === '/app/features')
          return Promise.resolve({ Parameter: { Value: '{"newFeature": true}' } });
        return Promise.resolve({});
      });

      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToString: () => Promise.resolve(JSON.stringify({ advanced: { setting: true } })),
        } as any,
      });

      const config = await configManager.getAllConfig();

      expect(config.environment.stage).toBe('test');
      expect(config.app?.version).toBe('1.0.0');
      expect(config.features).toEqual({ newFeature: true });
      expect(config.advanced).toEqual({ advanced: { setting: true } });
    });

    it('エラー時も基本設定は返す', async () => {
      ssmMock.on(GetParameterCommand).rejects(new Error('SSM Error'));
      const config = await configManager.getAllConfig();
      expect(config.environment.stage).toBe('test');
    });
  });

  describe('getScrapingConfig', () => {
    const mockScrapingConfig = {
      scraping: {
        urls: { highschool: 'http://h', university: 'http://u' },
        settings: { timeout: 1000 },
      },
      metadata: { version: '1.0.0' },
    };

    it('S3からスクレイピング設定を取得する', async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToString: () => Promise.resolve(JSON.stringify(mockScrapingConfig)),
        } as any,
      });

      const config = await configManager.getScrapingConfig();
      expect(config).toEqual(mockScrapingConfig);
    });

    it('S3バケット未設定時はデフォルト設定を返す', async () => {
      delete process.env.S3_DATA_BUCKET;
      const config = await configManager.getScrapingConfig();
      expect(config.metadata.source).toBe('environment-variables');
    });

    it('エラー時はデフォルト設定を返す', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 Error'));
      const config = await configManager.getScrapingConfig();
      expect(config.metadata.source).toBe('environment-variables');
    });
  });

  describe('getDefaultScrapingConfig', () => {
    it('デフォルトのスクレイピング設定を返す', () => {
      const config = configManager.getDefaultScrapingConfig();

      expect(config).toHaveProperty('scraping');
      expect(config.scraping).toHaveProperty('urls');
      expect(config.scraping.urls).toHaveProperty('highschool');
      expect(config.scraping.urls).toHaveProperty('university');
      expect(config.scraping).toHaveProperty('settings');
      expect(config.scraping.settings).toHaveProperty('timeout');
      expect(config.metadata).toHaveProperty('version');
    });

    it('デフォルト設定のタイムアウトは30000である', () => {
      const config = configManager.getDefaultScrapingConfig();
      expect(config.scraping.settings.timeout).toBe(30000);
    });
  });

  describe('getDefaultConfig', () => {
    it('デフォルト設定を返す', () => {
      const config = configManager.getDefaultConfig();

      expect(config).toHaveProperty('scraping');
      expect(config).toHaveProperty('notifications');
      expect(config).toHaveProperty('processing');
      expect(config.scraping).toHaveProperty('timeout');
    });

    it('デフォルト設定のタイムアウトは30000である', () => {
      const config = configManager.getDefaultConfig();
      expect(config.scraping.timeout).toBe(30000);
    });
  });

  describe('clearCache', () => {
    it('キャッシュをクリアできる', () => {
      // キャッシュクリアはエラーなく実行できることを確認
      expect(() => configManager.clearCache()).not.toThrow();
    });
  });
});
