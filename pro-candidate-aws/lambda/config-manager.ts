import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { log } from './logger';

interface Config {
  environment: {
    stage: string;
    nodeEnv: string;
    logLevel: string;
    s3Bucket: string;
    cacheTtl: number;
  };
  scraping: {
    highschoolUrl: string;
    universityUrl: string;
    timeout: number;
    retryCount: number;
    userAgent: string;
  };
  app?: {
    version: string | null;
  };
  features?: Record<string, any>;
  advanced?: any;
  encryption?: {
    masterKey: string;
  };
}

interface ScrapingConfig {
  scraping: {
    urls: {
      highschool: string;
      university: string;
    };
    settings: {
      timeout: number;
      retryCount: number;
      userAgent: string;
      delayBetweenRequests: number;
    };
  };
  metadata: {
    version: string;
    lastUpdated: string;
    source: string;
  };
}

/**
 * 統合設定管理クラス（4段階Tier設定）
 */
export class ConfigManager {
  private region: string;
  private ssmClient: SSMClient;
  private secretsClient: SecretsManagerClient;
  private s3Client: S3Client;
  private cache: Map<string, any>;
  private cacheExpiry: Map<string, number>;
  private defaultCacheTtl: number;

  constructor() {
    this.region = process.env.AWS_REGION || 'ap-northeast-1';
    this.ssmClient = new SSMClient({ region: this.region });
    this.secretsClient = new SecretsManagerClient({ region: this.region });
    this.s3Client = new S3Client({ region: this.region });

    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultCacheTtl = 300; // 5分
  }

  /**
   * Tier 1: 環境変数から取得（最速・無料）
   */
  public getEnvironmentVariable(key: string, defaultValue: string | null = null): string {
    return process.env[key] || defaultValue || '';
  }

  /**
   * Tier 2: SSM Parameter Store から取得（無料枠）
   */
  public async getSSMParameter(
    parameterName: string,
    cacheTtl: number = this.defaultCacheTtl
  ): Promise<string | null> {
    // キャッシュチェック
    if (this.cache.has(parameterName)) {
      const expiry = this.cacheExpiry.get(parameterName);
      if (expiry && Date.now() < expiry) {
        return this.cache.get(parameterName);
      }
    }

    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true,
      });
      const response = await this.ssmClient.send(command);
      const value = response.Parameter?.Value || null;

      // キャッシュに保存
      if (value) {
        this.cache.set(parameterName, value);
        this.cacheExpiry.set(parameterName, Date.now() + cacheTtl * 1000);
      }

      return value;
    } catch (error) {
      log.error(`Failed to get SSM parameter ${parameterName}:`, error);
      return null;
    }
  }

  /**
   * Tier 3: S3設定ファイルから取得（$0.01/月未満）
   */
  public async getS3Config(cacheTtl: number = 300): Promise<any> {
    const cacheKey = 's3-config';

    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry && Date.now() < expiry) {
        return this.cache.get(cacheKey);
      }
    }

    try {
      const configPath = this.getEnvironmentVariable('CONFIG_S3_PATH');
      const bucket = this.getEnvironmentVariable('S3_DATA_BUCKET');

      if (!configPath || !bucket) {
        log.warn('S3 config path or bucket not configured');
        return this.getDefaultConfig();
      }

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: configPath,
      });

      const response = await this.s3Client.send(command);
      const configText = await response.Body?.transformToString();

      if (!configText) {
        throw new Error('Empty response body from S3');
      }

      const config = JSON.parse(configText);

      // キャッシュに保存
      this.cache.set(cacheKey, config);
      this.cacheExpiry.set(cacheKey, Date.now() + cacheTtl * 1000);

      return config;
    } catch (error) {
      log.error('Failed to load S3 config:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Tier 4: Secrets Manager から取得（最機密データ）
   */
  public async getSecret(secretArn: string, cacheTtl: number = 600): Promise<any> {
    // キャッシュチェック
    if (this.cache.has(secretArn)) {
      const expiry = this.cacheExpiry.get(secretArn);
      if (expiry && Date.now() < expiry) {
        return this.cache.get(secretArn);
      }
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretArn });
      const response = await this.secretsClient.send(command);

      if (!response.SecretString) {
        return null;
      }

      const secretValue = JSON.parse(response.SecretString);

      // キャッシュに保存（機密データは短時間）
      this.cache.set(secretArn, secretValue);
      this.cacheExpiry.set(secretArn, Date.now() + cacheTtl * 1000);

      return secretValue;
    } catch (error) {
      log.error(`Failed to get secret ${secretArn}:`, error);
      return null;
    }
  }

  /**
   * 統合設定取得メソッド
   */
  public async getAllConfig(): Promise<Config> {
    const config: Config = {
      // Tier 1: 環境変数
      environment: {
        stage: this.getEnvironmentVariable('STAGE'),
        nodeEnv: this.getEnvironmentVariable('NODE_ENV'),
        logLevel: this.getEnvironmentVariable('LOG_LEVEL'),
        s3Bucket: this.getEnvironmentVariable('S3_DATA_BUCKET'),
        cacheTtl: parseInt(this.getEnvironmentVariable('CACHE_TTL'), 10) || 43200,
      },

      // スクレイピング設定
      scraping: {
        highschoolUrl: this.getEnvironmentVariable('HIGHSCHOOL_BASE_URL'),
        universityUrl: this.getEnvironmentVariable('UNIVERSITY_BASE_URL'),
        timeout: parseInt(this.getEnvironmentVariable('API_TIMEOUT'), 10) || 30000,
        retryCount: parseInt(this.getEnvironmentVariable('MAX_RETRY_COUNT'), 10) || 3,
        userAgent: this.getEnvironmentVariable('USER_AGENT'),
      },
    };

    try {
      // Tier 2: SSM Parameters
      const appVersionParam = this.getEnvironmentVariable('APP_VERSION_PARAM');
      const featureFlagsParam = this.getEnvironmentVariable('FEATURE_FLAGS_PARAM');

      if (appVersionParam) {
        config.app = {
          version: await this.getSSMParameter(appVersionParam),
        };
      }

      if (featureFlagsParam) {
        const flagsJson = await this.getSSMParameter(featureFlagsParam);
        if (flagsJson) {
          config.features = JSON.parse(flagsJson);
        }
      }

      // Tier 3: S3設定ファイル
      const s3Config = await this.getS3Config();
      if (s3Config) {
        config.advanced = s3Config;
      }

      // Tier 4: Secrets Manager（最機密データ）- コスト削減のため一時的に無効化
      // const masterKeyArn = this.getEnvironmentVariable('MASTER_ENCRYPTION_KEY_ARN');
      // if (masterKeyArn) {
      //   const secretValue = await this.getSecret(masterKeyArn);
      //   if (secretValue) {
      //     config.encryption = {
      //       masterKey: secretValue.key
      //     };
      //   }
      // }
    } catch (error) {
      log.error('Error loading extended config:', error);
    }

    return config;
  }

  /**
   * スクレイピング設定取得（S3専用）
   * @param {number} cacheTtl キャッシュ有効期限（秒）
   * @returns {Promise<ScrapingConfig>} スクレイピング設定
   */
  public async getScrapingConfig(cacheTtl: number = 600): Promise<ScrapingConfig> {
    const cacheKey = 'scraping-config';

    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry && Date.now() < expiry) {
        return this.cache.get(cacheKey);
      }
    }

    try {
      const bucket = this.getEnvironmentVariable('S3_DATA_BUCKET');
      const configPath = 'config/aws-scraping-config.json';

      if (!bucket) {
        log.warn('S3 bucket not configured for scraping config');
        return this.getDefaultScrapingConfig();
      }

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: configPath,
      });

      const response = await this.s3Client.send(command);
      const configText = await response.Body?.transformToString();

      if (!configText) {
        throw new Error('Empty response body from S3');
      }

      const config = JSON.parse(configText);

      // キャッシュに保存
      this.cache.set(cacheKey, config);
      this.cacheExpiry.set(cacheKey, Date.now() + cacheTtl * 1000);

      log.debug('Scraping config loaded from S3:', {
        version: config.metadata?.version,
        lastUpdated: config.metadata?.lastUpdated,
      });

      return config;
    } catch (error) {
      log.error('Failed to load scraping config from S3:', error);
      return this.getDefaultScrapingConfig();
    }
  }

  /**
   * デフォルトスクレイピング設定
   */
  private getDefaultScrapingConfig(): ScrapingConfig {
    return {
      scraping: {
        urls: {
          highschool: this.getEnvironmentVariable(
            'HIGHSCHOOL_BASE_URL',
            'https://www.jhbf.or.jp/pro-aspiring'
          ),
          university: this.getEnvironmentVariable(
            'UNIVERSITY_BASE_URL',
            'https://www.jubf.net/system/prog/procandidate.php'
          ),
        },
        settings: {
          timeout: 30000,
          retryCount: 3,
          userAgent:
            'Mozilla/5.0 (compatible; DataScraper/1.0; AWS Lambda; +mailto:yuta.nozue@gmail.com)',
          delayBetweenRequests: 1000,
        },
      },
      metadata: {
        version: '1.0.0-fallback',
        lastUpdated: new Date().toISOString(),
        source: 'environment-variables',
      },
    };
  }

  /**
   * デフォルト設定
   */
  private getDefaultConfig(): any {
    return {
      scraping: {
        timeout: 30000,
        retryCount: 3,
        userAgent:
          'Mozilla/5.0 (compatible; DataScraper/1.0; AWS Lambda; +mailto:yuta.nozue@gmail.com)',
      },
      processing: {
        batchSize: 100,
        maxConcurrency: 5,
      },
      notifications: {
        enabled: false,
      },
    };
  }

  /**
   * キャッシュクリア
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
