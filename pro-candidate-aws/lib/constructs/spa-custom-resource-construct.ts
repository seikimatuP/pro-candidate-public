import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';

export interface SPACustomResourceConstructProps {
  bucketName: string;
  indexDocument?: string;
  errorDocument?: string;
}

export class SPACustomResourceConstruct extends Construct {
  public readonly customResource: cdk.CustomResource;

  constructor(scope: Construct, id: string, props: SPACustomResourceConstructProps) {
    super(scope, id);

    // SPA設定用Lambda関数
    const spaConfigFunction = new lambda.Function(this, 'SPAConfigFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'spa-custom-resource.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../..', 'lambda')),
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      description: 'SPA用S3 Website RoutingRules設定Custom Resource',
      environment: {
        NODE_ENV: 'production',
      },
    });

    // S3 Website設定権限を付与
    spaConfigFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutBucketWebsite',
          's3:GetBucketWebsite',
        ],
        resources: [`arn:aws:s3:::${props.bucketName}`],
      })
    );

    // Custom Resource Provider
    const provider = new cr.Provider(this, 'SPAConfigProvider', {
      onEventHandler: spaConfigFunction,
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });

    // Custom Resource
    this.customResource = new cdk.CustomResource(this, 'SPAConfigResource', {
      serviceToken: provider.serviceToken,
      properties: {
        BucketName: props.bucketName,
        IndexDocument: props.indexDocument || 'index.html',
        ErrorDocument: props.errorDocument || 'index.html',
        // バージョン管理用（プロパティ変更時の更新トリガー）
        Version: '1.0.0',
      },
    });

    // 出力
    new cdk.CfnOutput(this, 'SPAConfigStatus', {
      value: this.customResource.getAtt('Status').toString(),
      description: 'SPA Configuration Status',
    });

    new cdk.CfnOutput(this, 'SPAConfigBucket', {
      value: props.bucketName,
      description: 'SPA Configured Bucket Name',
    });

    // タグ設定
    cdk.Tags.of(spaConfigFunction).add('Component', 'SPACustomResource');
    cdk.Tags.of(this).add('Purpose', 'SPAConfiguration');
  }
}