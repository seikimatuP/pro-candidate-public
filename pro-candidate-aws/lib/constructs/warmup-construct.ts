import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface WarmupConstructProps {
  stage: string;
  targetFunctions: lambda.IFunction[];
}

/**
 * Lambda ウォームアップ Construct
 *
 * CloudWatch Events を使用して定期的に Lambda 関数をウォームアップし、
 * コールドスタート時間を短縮する。
 */
export class WarmupConstruct extends Construct {
  public readonly warmupFunction: lambda.Function;
  public readonly warmupRule: events.Rule;

  constructor(scope: Construct, id: string, props: WarmupConstructProps) {
    super(scope, id);

    // ウォームアップ Lambda 関数を作成
    this.warmupFunction = new lambda.Function(this, 'WarmupFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'warmup-handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
      timeout: cdk.Duration.seconds(60),
      memorySize: 128,
      description: `Lambda warmup function for ${props.stage} environment`,
      environment: {
        STAGE: props.stage,
        TARGET_FUNCTIONS: props.targetFunctions
          .map((fn: lambda.IFunction) => fn.functionName)
          .join(','),
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // ウォームアップ関数に対象関数を呼び出す権限を追加
    props.targetFunctions.forEach((fn: lambda.IFunction) => {
      this.warmupFunction.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          resources: [fn.functionArn],
          effect: iam.Effect.ALLOW,
        })
      );
    });

    // CloudWatch Events ルールで定期的にウォームアップを実行
    // 5分ごとに実行（無料枠内: 月100万イベント以下）
    this.warmupRule = new events.Rule(this, 'WarmupRule', {
      description: `Warmup rule for ${props.stage} Lambda functions`,
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      enabled: true,
    });

    // ルールのターゲットをウォームアップ関数に設定
    this.warmupRule.addTarget(
      new targets.LambdaFunction(this.warmupFunction, {
        event: events.RuleTargetInput.fromObject({
          _warmup: true,
          timestamp: new Date().toISOString(),
        }),
      })
    );

    // 追加のタグ設定
    cdk.Tags.of(this).add('Purpose', 'Lambda Warmup');
    cdk.Tags.of(this).add('Environment', props.stage);
  }
}
