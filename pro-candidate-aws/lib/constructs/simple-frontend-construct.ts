import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';

export interface SimpleFrontendConstructProps {
  stage: string;
}

export class SimpleFrontendConstruct extends Construct {
  public readonly bucket: s3.IBucket;
  public readonly frontendBucket: s3.IBucket;

  private static readonly INDEX_DOCUMENT = 'index.html';

  constructor(scope: Construct, id: string, props: SimpleFrontendConstructProps) {
    super(scope, id);

    // S3バケット for 静的ホスティング
    if (props.stage === 'prod') {
      // 本番環境では既存バケットを参照（SPA設定は手動管理）
      // Note: prodバケットはS3 Website設定で404 -> index.htmlリダイレクト設定済み
      this.bucket = s3.Bucket.fromBucketName(
        this,
        'FrontendBucket',
        `pro-candidate-frontend-${props.stage}`
      );
    } else {
      // 開発環境では新規作成
      this.bucket = new s3.Bucket(this, 'FrontendBucket', {
        bucketName: `pro-candidate-frontend-${props.stage}`,
        websiteIndexDocument: SimpleFrontendConstruct.INDEX_DOCUMENT,
        websiteErrorDocument: SimpleFrontendConstruct.INDEX_DOCUMENT, // SPA用: 404エラー時index.htmlを返す（URLは保持）
        publicReadAccess: true, // パブリック読み取り許可
        blockPublicAccess: new s3.BlockPublicAccess({
          blockPublicAcls: false,
          blockPublicPolicy: false, // パブリックポリシーを許可
          ignorePublicAcls: false,
          restrictPublicBuckets: false, // パブリックバケットを許可
        }),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      });

      // L1 Constructで明示的にwebsiteConfiguration設定（既存バケット更新保証）
      const cfnBucket = this.bucket.node.defaultChild as s3.CfnBucket;
      cfnBucket.websiteConfiguration = {
        indexDocument: SimpleFrontendConstruct.INDEX_DOCUMENT,
        errorDocument: SimpleFrontendConstruct.INDEX_DOCUMENT,
        // RoutingRulesは設定しない（URLを変更しないため）
      };

      // Note: SPA対応はwebsiteErrorDocumentのみで実現
      // 404エラー時にindex.htmlの内容を返し、元のURLは保持される
      // これによりReact Routerが正しくルーティングできる
    }

    // Alias for compatibility
    this.frontendBucket = this.bucket;

    // Note: SPA設定詳細
    // dev環境: websiteErrorDocumentによるSPA対応
    //   - 404エラー時にindex.htmlの内容を返す（HTTPステータス: 404、Content: index.html）
    //   - 元のURLは保持され、React Routerが正しくルーティング
    //   - RoutingRulesは使用しない（301リダイレクトはURLを変更してしまうため）
    // prod環境: 既存バケット使用・手動でS3 Website設定済み（同様のwebsiteErrorDocument設定）

    // Note: フロントエンドデプロイは別のGitHub Actionsワークフローで実行
    // このConstructではS3バケットの作成とSPA設定を行い、
    // 実際のファイルアップロードは frontend-deploy.yml で処理

    // 出力値
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name for frontend hosting',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: this.bucket.bucketWebsiteUrl,
      description: 'Frontend website URL',
    });

    // タグ設定
    cdk.Tags.of(this.bucket).add('Project', 'ProBaseballScrapingSystem');
    cdk.Tags.of(this.bucket).add('Environment', props.stage);
  }
}
