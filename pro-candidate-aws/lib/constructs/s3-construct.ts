import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';

export interface S3ConstructProps {
  bucketName: string;
  stage: string;
}

export class S3Construct extends Construct {
  public readonly dataBucket: s3.IBucket;
  public readonly replicationBucket?: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    // プロ野球選手データ用S3バケット
    if (props.stage === 'prod') {
      // 本番環境では既存バケットを参照
      this.dataBucket = s3.Bucket.fromBucketName(
        this,
        'PlayerDataBucket',
        `${props.bucketName}-${props.stage}`
      );
    } else {
      // 開発環境では新規作成
      this.dataBucket = new s3.Bucket(this, 'PlayerDataBucket', {
        bucketName: `${props.bucketName}-${props.stage}`,

        // セキュリティ設定強化
        publicReadAccess: false,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED, // AES-256暗号化（無料）

        // バージョニング設定（全環境で有効化）
        versioned: true,

        // ライフサイクル設定（ストレージ最適化・コスト削減）
        lifecycleRules: [
          {
            id: 'DeleteOldVersions',
            enabled: true,
            noncurrentVersionExpiration: cdk.Duration.days(30), // 旧バージョン30日後削除
          },
          {
            id: 'CacheCleanup',
            enabled: true,
            prefix: 'cache/',
            expiration: cdk.Duration.days(7), // キャッシュ7日後削除
          },
          {
            id: 'LogsCleanup',
            enabled: true,
            prefix: 'logs/',
            expiration: cdk.Duration.days(14), // ログ14日後削除
          },
          {
            id: 'TempDataCleanup',
            enabled: true,
            prefix: 'temp/',
            expiration: cdk.Duration.days(1), // 一時データ1日後削除
          },
          {
            id: 'TransitionToIA',
            enabled: true,
            transitions: [
              {
                storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                transitionAfter: cdk.Duration.days(30), // 30日後IA移行
              },
              {
                storageClass: s3.StorageClass.GLACIER,
                transitionAfter: cdk.Duration.days(90), // 90日後Glacier移行
              },
            ],
          },
        ],

        // 削除設定
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,

        // CORS設定（フロントエンドからのアクセス用）
        cors: [
          {
            allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
            allowedOrigins: ['*'], // 本番では特定ドメインに制限
            allowedHeaders: ['*'],
            maxAge: 3000,
          },
        ],
      });
    }

    // クロスリージョンレプリケーション用バケット（循環依存回避のため一時的に無効化）
    // if (props.stage === 'prod') {
    //   // 循環依存の原因となるためコメントアウト
    // }

    // メインバケットのタグ設定
    cdk.Tags.of(this.dataBucket).add('Project', 'ProBaseballScrapingSystem');
    cdk.Tags.of(this.dataBucket).add('Environment', props.stage);
    cdk.Tags.of(this.dataBucket).add('CostCenter', 'DataStorage');
    cdk.Tags.of(this.dataBucket).add('DataClassification', 'Internal');

    // 出力
    new cdk.CfnOutput(this, 'DataBucketName', {
      value: this.dataBucket.bucketName,
      description: 'Primary data bucket name',
    });

    if (this.replicationBucket) {
      new cdk.CfnOutput(this, 'ReplicationBucketName', {
        value: this.replicationBucket.bucketName,
        description: 'Cross-region replication bucket name',
      });
    }
  }
}
