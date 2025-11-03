import * as cdk from 'aws-cdk-lib';

export interface PlayerData {
  id: string;
  name: string;
  school: string;
  type: 'highschool' | 'university';
  year: number;
  position?: string;
  prefecture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapingConfig {
  urls: {
    highschool: string;
    university: string;
  };
  schedule: {
    rate: string; // EventBridge schedule expression
    enabled: boolean;
  };
  cache: {
    ttl: number; // seconds
    enabled: boolean;
  };
}

export interface LambdaEnvironment {
  [key: string]: string;
  S3_DATA_BUCKET: string;
  CACHE_TTL: string;
  LOG_LEVEL: string;
  ENVIRONMENT: string;
  NODE_ENV: string;
  STAGE: string;
}

export interface StackProps extends cdk.StackProps {
  stage: 'dev' | 'staging' | 'prod';
  bucketName?: string;
  enableScheduling: boolean;
  tableName?: string; // 後方互換性のため残す
  frontendUrl?: string; // フロントエンドURL (Cognito callback用)
  alertEmail?: string; // 監視アラート通知先メールアドレス
}