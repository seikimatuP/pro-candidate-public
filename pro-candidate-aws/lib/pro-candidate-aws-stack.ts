import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { S3Construct } from './constructs/s3-construct';
import { LambdaConstruct } from './constructs/lambda-construct';
import { ApiGatewayConstruct } from './constructs/api-gateway-construct';
import { CognitoConstruct } from './constructs/cognito-construct';
import { SimpleFrontendConstruct } from './constructs/simple-frontend-construct';
import { CloudFrontConstruct } from './constructs/cloudfront-construct'; // 無料枠内で有効化
import { MonitoringConstruct } from './constructs/monitoring-construct';
import { CostOptimizedConstruct } from './constructs/cost-optimized-construct';
import { WarmupConstruct } from './constructs/warmup-construct';
import { StackProps } from './interfaces/types';

export class ProCandidateAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // 1. S3データストレージ構築
    const s3Construct = new S3Construct(this, 'S3Construct', {
      bucketName: props.bucketName || 'pro-candidate-data',
      stage: props.stage,
    });

    // 2. Lambda構築（段階的復旧）
    const lambdaConstruct = new LambdaConstruct(this, 'LambdaConstruct', {
      dataBucket: s3Construct.dataBucket,
      stage: props.stage,
      environment: {
        // Tier 1: 基本設定（Lambda環境変数 - 完全無料）
        S3_DATA_BUCKET: s3Construct.dataBucket.bucketName,
        CACHE_TTL: '43200', // 12時間
        LOG_LEVEL: props.stage === 'prod' ? 'WARN' : 'DEBUG',
        ENVIRONMENT: props.stage,
        NODE_ENV: props.stage === 'prod' ? 'production' : 'development',
        STAGE: props.stage,

        // スクレイピング設定（S3外部化完了 - フォールバック用のみ）
        // メイン設定はS3: config/aws-scraping-config.json

        // S3設定ファイルパス
        CONFIG_S3_PATH: `config/${props.stage}/app-config.json`,

        // SSM Parameter paths
        APP_VERSION_PARAM: `/pro-candidate/${props.stage}/app/version`,
        FEATURE_FLAGS_PARAM: `/pro-candidate/${props.stage}/features/flags`,

        // Secrets Manager ARN - コスト削減のため一時的に無効化（$0.40/月削減）
        // MASTER_ENCRYPTION_KEY_ARN: `arn:aws:secretsmanager:ap-northeast-1:${this.account}:secret:pro-candidate/${props.stage}/encryption/master-key`,

        // API設定
        API_TIMEOUT: '30000',
        MAX_RETRY_COUNT: '3',
        USER_AGENT: 'Mozilla/5.0 (compatible; DataScraper/1.0; AWS Lambda)',

        // フロントエンドURL（CloudFrontから動的に設定）
        // Note: CloudFront構築後に更新される
        DASHBOARD_URL: '',
      },
    });

    // 3. Cognito認証構築（一時的にHTTP回避）
    const cognitoConstruct = new CognitoConstruct(this, 'CognitoConstruct', {
      stage: props.stage,
      frontendUrl: props.frontendUrl || 'https://example.com/callback',
    });

    // 4. API Gateway構築
    const apiConstruct = new ApiGatewayConstruct(this, 'ApiGatewayConstruct', {
      apiFunction: lambdaConstruct.apiFunction,
      stage: props.stage,
      userPool: props.stage === 'prod' ? cognitoConstruct.userPool : undefined, // dev環境では認証無効
    });

    // 5. フロントエンド構築（S3静的ホスティング）
    const frontendConstruct = new SimpleFrontendConstruct(this, 'SimpleFrontendConstruct', {
      stage: props.stage,
    });

    // 6. CloudFront CDN構築（HTTPS化・SPA対応）- 無料枠内で有効化
    // SPA完全対応・BrowserRouter使用可能・HTTPS標準対応
    // 無料枠: 100GB/月データ転送 + 200万リクエスト/月（完全に枠内）
    const cloudFrontConstruct = new CloudFrontConstruct(this, 'CloudFrontConstruct', {
      frontendBucket: frontendConstruct.frontendBucket,
      stage: props.stage,
    });

    // CloudFront URLをLambda環境変数に追加
    lambdaConstruct.scrapingFunction.addEnvironment(
      'DASHBOARD_URL',
      cloudFrontConstruct.distributionUrl
    );
    lambdaConstruct.apiFunction.addEnvironment(
      'DASHBOARD_URL',
      cloudFrontConstruct.distributionUrl
    );
    lambdaConstruct.dataProcessingFunction.addEnvironment(
      'DASHBOARD_URL',
      cloudFrontConstruct.distributionUrl
    );

    // 7. 監視・アラート構築（コスト最適化対応）
    // eslint-disable-next-line sonarjs/constructor-for-side-effects
    new MonitoringConstruct(this, 'MonitoringConstruct', {
      stage: props.stage,
      scrapingFunction: lambdaConstruct.scrapingFunction,
      apiFunction: lambdaConstruct.apiFunction,
      dataProcessingFunction: lambdaConstruct.dataProcessingFunction,
      apiGateway: apiConstruct.api,
      alertEmail: props.alertEmail || 'admin@pro-candidate.com',
      // Config Rules 完全無効化（コスト削減: $8-12/月）
      enableConfigRules: false,
      // Security Hub 完全無効化（コスト削減: 開発環境不要）
      enableSecurityHub: false,
    });

    // 8. コスト最適化専用設定
    const costOptimizedConstruct = new CostOptimizedConstruct(this, 'CostOptimizedConstruct', {
      stage: props.stage,
      enableCostOptimization: true,
    });

    // コスト監視アラームの設定
    costOptimizedConstruct.createCostMonitoringAlarms(props.stage);

    // 9. Lambda ウォームアップ設定（コールドスタート軽減）
    // 5分ごとに Lambda 関数を呼び出してコールドスタート時間を短縮
    // eslint-disable-next-line sonarjs/constructor-for-side-effects
    new WarmupConstruct(this, 'WarmupConstruct', {
      stage: props.stage,
      targetFunctions: [
        lambdaConstruct.scrapingFunction,
        lambdaConstruct.apiFunction,
        lambdaConstruct.dataProcessingFunction,
      ],
    });

    // 10. バックアップ機能構築（コスト削減のため無効化）
    // S3バージョニングと手動バックアップで代替
    // $0.20/月のコスト削減効果
    // if (props.stage !== 'prod') {
    //   const backupConstruct = new BackupConstruct(this, 'BackupConstruct', {
    //     dataBucket: s3Construct.dataBucket,
    //     stage: props.stage,
    //   });
    // }

    // 10. 出力値
    new cdk.CfnOutput(this, 'S3DataBucketName', {
      value: s3Construct.dataBucket.bucketName,
      description: 'S3 bucket name for player data storage',
    });

    new cdk.CfnOutput(this, 'ScrapingFunctionName', {
      value: lambdaConstruct.scrapingFunction.functionName,
      description: 'Lambda function name for scraping',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: apiConstruct.api.url,
      description: 'API Gateway endpoint URL',
    });

    // CloudFront Distribution URL（HTTPS対応・SPA完全対応）
    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: cloudFrontConstruct.distributionUrl,
      description: 'CloudFront Distribution URL (HTTPS) - SPA対応・無料枠内運用',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: cognitoConstruct.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'CognitoClientId', {
      value: cognitoConstruct.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    // タグ設定
    cdk.Tags.of(this).add('Project', 'ProBaseballScrapingSystem');
    cdk.Tags.of(this).add('Environment', props.stage);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
