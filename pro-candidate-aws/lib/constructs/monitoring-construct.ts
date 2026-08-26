import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export interface MonitoringConstructProps {
  stage: string;
  scrapingFunction: lambda.Function;
  apiFunction: lambda.Function;
  dataProcessingFunction: lambda.Function;
  apiGateway?: apigateway.RestApi;
  alertEmail?: string;
  enableConfigRules?: boolean;
  enableSecurityHub?: boolean;
}

export class MonitoringConstruct extends Construct {
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    // SNS Topic for alerts
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `pro-baseball-alerts-${props.stage}`,
      displayName: `Pro Baseball System Alerts - ${props.stage}`,
    });

    // Email subscription for alerts
    if (props.alertEmail) {
      this.alertTopic.addSubscription(new subscriptions.EmailSubscription(props.alertEmail));
    }

    // AWS Config Rules - 完全無効化（大幅コスト削減: $8-12/月）
    // セキュリティ：S3バケットポリシーと IAM で代替
    if (props.enableConfigRules === true && props.stage === 'prod') {
      // 本番環境でも無効化推奨（コスト最適化最優先）
      console.warn(
        '⚠️ AWS Config Rules disabled for cost optimization. Use S3 bucket policies for security.'
      );

      // 必要な場合のみ有効化（通常は無効化推奨）
      // new config.ManagedRule(this, 'S3PublicReadRule', {
      //   identifier: config.ManagedRuleIdentifiers.S3_BUCKET_PUBLIC_READ_PROHIBITED,
      //   description: 'S3 bucket public read prohibited',
      // });
    }

    // Security Hub - 完全無効化（コスト最適化: $15-25/月削減）
    if (props.enableSecurityHub === true) {
      // Security Hub は完全無効化（コスト最適化最優先）
      console.warn(
        '⚠️ Security Hub disabled for complete cost optimization. Use CloudWatch monitoring for basic security.'
      );

      // 必要な場合のみ有効化（通常は無効化推奨）
      // new securityhub.CfnHub(this, 'SecurityHub', {
      //   tags: {
      //     Environment: props.stage,
      //     CostOptimized: 'true',
      //   },
      // });
    }

    // Lambda Function Metrics（未使用のため削除）

    // Basic Lambda Error Metrics (API Gateway参照削除)
    const combinedLambdaErrors = new cloudwatch.MathExpression({
      expression: 'scrapingErrors + apiErrors + dataErrors',
      usingMetrics: {
        scrapingErrors: props.scrapingFunction.metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        apiErrors: props.apiFunction.metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        dataErrors: props.dataProcessingFunction.metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
      },
      label: 'Combined Lambda Errors',
    });

    // API Gateway Health Check Metrics（未使用のため削除）

    // X-Ray エラー率メトリクス（アラーム廃止に伴い削除）

    // Cost monitoring metrics (estimated) - ダッシュボード表示専用
    const estimatedCost = new cloudwatch.Metric({
      namespace: 'AWS/Billing',
      metricName: 'EstimatedCharges',
      dimensionsMap: {
        Currency: 'USD',
      },
      statistic: 'Maximum',
    });

    // Constants for maintainability
    const AWS_LAMBDA_NAMESPACE = 'AWS/Lambda';
    const METRIC_PERIOD = cdk.Duration.minutes(5);

    // CloudWatch Dashboard（環境別で一意性確保）
    const dashboard = new cloudwatch.Dashboard(this, 'ProBaseballDashboard', {
      dashboardName: `ProCandidate-Overview-${props.stage}`,
    });

    // Dashboard widgets（簡素化版・実際の設定と一致）

    // Lambda実行状況・エラー率
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda実行状況',
        left: [
          new cloudwatch.Metric({
            namespace: AWS_LAMBDA_NAMESPACE,
            metricName: 'Invocations',
            statistic: 'Sum',
            period: METRIC_PERIOD,
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: AWS_LAMBDA_NAMESPACE,
            metricName: 'Errors',
            statistic: 'Sum',
            period: METRIC_PERIOD,
          }),
        ],
        width: 12,
        height: 6,
      }),

      // Lambda実行時間
      new cloudwatch.GraphWidget({
        title: 'Lambda実行時間',
        left: [
          new cloudwatch.Metric({
            namespace: AWS_LAMBDA_NAMESPACE,
            metricName: 'Duration',
            statistic: 'Average',
            period: METRIC_PERIOD,
          }),
          new cloudwatch.Metric({
            namespace: AWS_LAMBDA_NAMESPACE,
            metricName: 'Duration',
            statistic: 'Maximum',
            period: METRIC_PERIOD,
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // 同時実行数・推定コスト
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '同時実行数',
        left: [
          new cloudwatch.Metric({
            namespace: AWS_LAMBDA_NAMESPACE,
            metricName: 'ConcurrentExecutions',
            statistic: 'Maximum',
            period: METRIC_PERIOD,
          }),
        ],
        width: 12,
        height: 6,
      }),

      new cloudwatch.GraphWidget({
        title: '推定コスト (USD)',
        left: [estimatedCost],
        period: cdk.Duration.days(1),
        region: 'us-east-1',
        width: 12,
        height: 6,
      })
    );

    // 削除されたダッシュボード機能の代替手段:
    // 1. CloudWatchアラーム: 自動通知（SNS経由）
    // 2. CloudWatchログ: 手動確認・Logs Insights
    // 3. X-Rayトレース: 分散トレーシング・サービスマップ
    // 4. Lambda Console: 個別関数メトリクス確認

    // CloudWatch Alarms（無料枠5個まで）
    // 実際に設定済みのアラームと一致させる

    // 1. 統合Lambdaエラーアラーム（最重要）
    new cloudwatch.Alarm(this, 'CriticalLambdaErrors', {
      metric: combinedLambdaErrors,
      threshold: 10, // 10エラー/5分
      evaluationPeriods: 1,
      alarmDescription: 'Lambda functions error rate > 5% or > 10 errors in 5 minutes',
      alarmName: `Critical-Lambda-Errors-${props.stage}-cdk`,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));

    // 2. コスト監視アラーム（aws-cost-limit-alert）は削除
    //    AWS/Billing の EstimatedCharges は us-east-1 でしか発行されず、
    //    東京リージョン（ap-northeast-1）のアラームでは機能しないため。
    //    コスト推移はダッシュボードの「推定コスト (USD)」ウィジェットで確認する。

    // 3. Lambda無料枠使用量アラーム（prod環境のみ）
    //    無料枠のアラーム上限（10個）対策として dev では作成しない
    if (props.stage === 'prod') {
      new cloudwatch.Alarm(this, 'FreeTierUsageAlarm', {
        metric: new cloudwatch.MathExpression({
          expression: '(lambda_invocations / 1000000) * 100',
          usingMetrics: {
            lambda_invocations: new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Invocations',
              statistic: 'Sum',
              period: cdk.Duration.minutes(5),
            }),
          },
        }),
        threshold: 80, // 80%以上で警告
        evaluationPeriods: 1,
        alarmDescription: `Lambda free tier usage approaching 80% for ${props.stage} environment`,
        alarmName: `lambda-free-tier-usage-alert-${props.stage}-cdk`,
      }).addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));
    }

    // 4. X-Ray エラー率アラーム（xray-errors）は削除
    //    無料枠のアラーム上限対策。X-Ray のエラーはコンソールのサービスマップで確認する。

    // CloudWatch監視用リンク
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${cdk.Stack.of(this).region}.console.aws.amazon.com/cloudwatch/home?region=${
        cdk.Stack.of(this).region
      }#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'MonitoringUrls', {
      value: `CloudWatch Metrics: https://${
        cdk.Stack.of(this).region
      }.console.aws.amazon.com/cloudwatch/home?region=${
        cdk.Stack.of(this).region
      }#metricsV2: | X-Ray: https://${
        cdk.Stack.of(this).region
      }.console.aws.amazon.com/xray/home?region=${cdk.Stack.of(this).region}`,
      description: 'CloudWatch Metrics and X-Ray Console URLs',
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'SNS Alert Topic ARN',
    });
  }
}
