import * as fs from 'fs';
import * as path from 'path';

/**
 * CDK設定インターフェース
 */
export interface CdkConfig {
  project: {
    name: string;
    displayName: string;
    description: string;
  };
  aws: {
    account: string;
    region: string;
  };
  environments: {
    [key: string]: EnvironmentConfig;
  };
  resources: {
    s3: {
      dataBucketPrefix: string;
      frontendBucketPrefix: string;
    };
    lambda: {
      memorySize: number;
      timeout: number;
    };
    dynamodb: {
      tableName: string;
    };
  };
  tags: {
    [key: string]: string;
  };
}

/**
 * 環境別設定インターフェース
 */
export interface EnvironmentConfig {
  stackName: string;
  enableScheduling: boolean;
  alertEmail: string;
  apiGateway?: {
    url: string;
  };
  cognito?: {
    userPoolId: string;
    clientId: string;
  };
  cloudfront?: {
    distributionId: string;
  };
}

/**
 * CDK設定を読み込む
 */
export function loadCdkConfig(): CdkConfig {
  // 設定ファイルのパスを解決
  const configPath = path.join(__dirname, '../../config/cdk-config.json');

  // ファイルが存在しない場合はデフォルト設定を返す
  if (!fs.existsSync(configPath)) {
    console.warn('CDK設定ファイルが見つかりません。デフォルト設定を使用します。');
    return getDefaultConfig();
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as CdkConfig;

    // 環境変数で上書き可能
    if (process.env.CDK_ACCOUNT) {
      config.aws.account = process.env.CDK_ACCOUNT;
    }
    if (process.env.CDK_REGION) {
      config.aws.region = process.env.CDK_REGION;
    }
    if (process.env.CDK_PROJECT_NAME) {
      config.project.name = process.env.CDK_PROJECT_NAME;
    }

    return config;
  } catch (error) {
    console.error('CDK設定ファイルの読み込みに失敗しました:', error);
    return getDefaultConfig();
  }
}

/**
 * デフォルト設定を取得
 */
function getDefaultConfig(): CdkConfig {
  return {
    project: {
      name: process.env.CDK_PROJECT_NAME || 'pro-candidate',
      displayName: 'プロ野球志望届管理システム',
      description: 'Pro Baseball Player Data Collection System',
    },
    aws: {
      account: process.env.CDK_DEFAULT_ACCOUNT || process.env.CDK_ACCOUNT || '131492497870',
      region: process.env.CDK_DEFAULT_REGION || process.env.CDK_REGION || 'ap-northeast-1',
    },
    environments: {
      dev: {
        stackName: 'ProBaseballStack-dev',
        enableScheduling: false,
        alertEmail: 'admin@pro-candidate.com',
      },
      prod: {
        stackName: 'ProBaseballStack-prod',
        enableScheduling: true,
        alertEmail: 'admin@pro-candidate.com',
      },
    },
    resources: {
      s3: {
        dataBucketPrefix: 'pro-candidate-data',
        frontendBucketPrefix: 'pro-candidate-frontend',
      },
      lambda: {
        memorySize: 256,
        timeout: 300,
      },
      dynamodb: {
        tableName: 'ProBaseballPlayers',
      },
    },
    tags: {
      Project: 'ProBaseballScrapingSystem',
      ManagedBy: 'CDK',
      CostCenter: 'DataCollection',
    },
  };
}

/**
 * 環境別設定を取得
 */
export function getEnvironmentConfig(stage: string): EnvironmentConfig {
  const config = loadCdkConfig();

  // Object.prototype.hasOwnProperty.call を使用してセキュリティ警告を回避
  if (!Object.prototype.hasOwnProperty.call(config.environments, stage)) {
    throw new Error(`環境 '${stage}' の設定が見つかりません`);
  }

  const envConfig = config.environments[stage];
  return envConfig;
}

/**
 * プロジェクト設定を取得
 */
export function getProjectConfig() {
  const config = loadCdkConfig();
  return config.project;
}

/**
 * AWS設定を取得
 */
export function getAwsConfig() {
  const config = loadCdkConfig();
  return config.aws;
}

/**
 * リソース設定を取得
 */
export function getResourceConfig() {
  const config = loadCdkConfig();
  return config.resources;
}

/**
 * タグ設定を取得
 */
export function getTagsConfig(stage: string) {
  const config = loadCdkConfig();
  return {
    ...config.tags,
    Environment: stage,
  };
}
