/**
 * AWS CDK 共通構成パターン
 * 重複を避けるための共通インターフェースと基底クラス
 */

import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';

/**
 * 基本的な構成プロパティ
 */
export interface BaseConstructProps {
  /** デプロイステージ (dev, staging, prod) */
  stage: string;
  /** プロジェクト名 */
  projectName?: string;
  /** 追加タグ */
  tags?: Record<string, string>;
}

/**
 * 環境固有設定
 */
export interface EnvironmentConfig {
  /** 本番環境かどうか */
  isProduction: boolean;
  /** 開発環境かどうか */
  isDevelopment: boolean;
  /** AWS リージョン */
  region: string;
  /** アカウントID */
  account?: string;
}

/**
 * 共通リソース設定
 */
export interface CommonResourceConfig {
  /** リソースの命名接頭辞 */
  resourcePrefix: string;
  /** 削除保護の有効化 */
  enableDeletionProtection: boolean;
  /** バックアップの有効化 */
  enableBackup: boolean;
  /** 監視の有効化 */
  enableMonitoring: boolean;
}

/**
 * 基底 Construct クラス
 * 共通機能とパターンを提供
 */
export abstract class BaseConstruct extends Construct {
  protected readonly stage: string;
  protected readonly projectName: string;
  protected readonly environmentConfig: EnvironmentConfig;
  protected readonly resourceConfig: CommonResourceConfig;

  constructor(scope: Construct, id: string, props: BaseConstructProps) {
    super(scope, id);

    this.stage = props.stage;
    this.projectName = props.projectName || 'pro-candidate';
    
    // 環境設定の初期化
    this.environmentConfig = this.createEnvironmentConfig(props.stage);
    
    // リソース設定の初期化  
    this.resourceConfig = this.createResourceConfig(props.stage);

    // 共通タグの適用
    this.applyCommonTags(props.tags);
  }

  /**
   * 環境設定を作成
   */
  protected createEnvironmentConfig(stage: string): EnvironmentConfig {
    return {
      isProduction: stage === 'prod',
      isDevelopment: stage === 'dev',
      region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
      account: process.env.CDK_DEFAULT_ACCOUNT
    };
  }

  /**
   * リソース設定を作成
   */
  protected createResourceConfig(stage: string): CommonResourceConfig {
    const isProduction = stage === 'prod';
    
    return {
      resourcePrefix: `${this.projectName}-${stage}`,
      enableDeletionProtection: isProduction,
      enableBackup: isProduction,
      enableMonitoring: true
    };
  }

  /**
   * 共通タグを適用
   */
  protected applyCommonTags(additionalTags?: Record<string, string>): void {
    const commonTags = {
      Project: this.projectName,
      Environment: this.stage,
      ManagedBy: 'CDK',
      ...additionalTags
    };

    Object.entries(commonTags).forEach(([key, value]) => {
      if (value) {
        cdk.Tags.of(this).add(key, value);
      }
    });
  }

  /**
   * リソース名を生成
   */
  protected createResourceName(resourceType: string, suffix?: string): string {
    const parts = [this.resourceConfig.resourcePrefix, resourceType];
    if (suffix) {
      parts.push(suffix);
    }
    return parts.join('-');
  }

  /**
   * 削除ポリシーを取得
   */
  protected getRemovalPolicy(): cdk.RemovalPolicy {
    return this.environmentConfig.isProduction 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;
  }

  /**
   * バックアップ設定が有効かどうか
   */
  protected shouldEnableBackup(): boolean {
    return this.resourceConfig.enableBackup;
  }

  /**
   * 監視設定が有効かどうか
   */
  protected shouldEnableMonitoring(): boolean {
    return this.resourceConfig.enableMonitoring;
  }
}

/**
 * S3 バケット用の共通設定
 */
export interface S3BucketConfig {
  /** バケット名 */
  bucketName: string;
  /** バージョニング有効化 */
  versioned: boolean;
  /** 暗号化設定 */
  encryption: boolean;
  /** ライフサイクル設定 */
  lifecycle: boolean;
}

/**
 * Lambda 関数用の共通設定
 */
export interface LambdaConfig {
  /** 関数名 */
  functionName: string;
  /** メモリサイズ (MB) */
  memorySize: number;
  /** タイムアウト (秒) */
  timeout: number;
  /** 環境変数 */
  environment: Record<string, string>;
}

/**
 * 環境別設定を取得するヘルパー関数
 */
export function getEnvironmentConfig<T>(stage: string, configs: {
  prod?: T;
  dev?: T;
  default: T;
}): T {
  if (stage === 'prod' && configs.prod) {
    return configs.prod;
  }
  if (stage === 'dev' && configs.dev) {
    return configs.dev;
  }
  return configs.default;
}

/**
 * AWS CDK で使用する共通インポート
 */
export const CommonImports = {
  // Core
  Construct,
  cdk,
  
  // Common services
  get s3() { return import('aws-cdk-lib/aws-s3'); },
  get lambda() { return import('aws-cdk-lib/aws-lambda'); },
  get iam() { return import('aws-cdk-lib/aws-iam'); },
  get apigateway() { return import('aws-cdk-lib/aws-apigateway'); },
  get cloudfront() { return import('aws-cdk-lib/aws-cloudfront'); },
  get cognito() { return import('aws-cdk-lib/aws-cognito'); },
  get cloudwatch() { return import('aws-cdk-lib/aws-cloudwatch'); }
};