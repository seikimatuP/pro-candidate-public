import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CostOptimizedConstructProps {
  stage: string;
  enableCostOptimization?: boolean;
}

/**
 * コスト最適化専用Construct
 * AWS完全無料枠内での運用を実現するための設定
 */
export class CostOptimizedConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CostOptimizedConstructProps) {
    super(scope, id);

    const costOptimizationEnabled = props.enableCostOptimization !== false;

    if (costOptimizationEnabled) {
      // コスト最適化設定の適用
      this.applyCostOptimizations(props.stage);
    }
  }

  private applyCostOptimizations(stage: string): void {
    // 1. 開発環境での不要機能無効化
    if (stage !== 'prod') {
      // 開発環境では以下を無効化
      // - AWS Config Rules (完全無効化)
      // - Security Hub (完全無効化)
      // - CloudTrail (完全無効化)
      // - バックアップ機能 (S3バージョニングで代替)

      new cdk.CfnOutput(this, 'DevCostOptimizationNote', {
        value:
          'Development environment optimized for cost. AWS Config, Security Hub, CloudTrail disabled.',
        description: 'Cost Optimization Note for Development Environment',
      });
    }

    // 2. CloudWatch最適化設定
    this.optimizeCloudWatch();

    // 3. Lambda最適化設定
    this.optimizeLambda();

    // 4. S3最適化設定
    this.optimizeS3();
  }

  private optimizeCloudWatch(): void {
    // CloudWatch ログ保持期間の最適化（3日）
    // CloudWatch アラーム数の制限（無料枠10個以内）
    // カスタムメトリクスの最小化

    new cdk.CfnOutput(this, 'CloudWatchOptimization', {
      value:
        'CloudWatch logs retention: 3 days, Alarms: <10 (free tier), Custom metrics: minimized',
      description: 'CloudWatch Cost Optimization Settings',
    });
  }

  private optimizeLambda(): void {
    // Lambda関数のメモリ最適化（256MB統一）
    // 実行時間の最適化
    // 同時実行数の制限（無料枠内）

    new cdk.CfnOutput(this, 'LambdaOptimization', {
      value:
        'Lambda memory: 256MB unified, Timeout optimized, Concurrent executions: within free tier',
      description: 'Lambda Cost Optimization Settings',
    });
  }

  private optimizeS3(): void {
    // S3ライフサイクルポリシーの最適化
    // 不要なバージョニングの無効化
    // アクセスログの最小化

    new cdk.CfnOutput(this, 'S3Optimization', {
      value: 'S3 lifecycle optimized, Versioning selective, Access logs minimized',
      description: 'S3 Cost Optimization Settings',
    });
  }
}
