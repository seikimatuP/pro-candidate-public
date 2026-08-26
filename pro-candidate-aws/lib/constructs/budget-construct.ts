import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';

export interface BudgetConstructProps {
  stage: string;
  /** 月次予算額（USD） */
  monthlyBudgetUsd: number;
  /** 閾値超過時の通知先メールアドレス */
  alertEmail: string;
}

/**
 * AWS Budgets によるコスト上限ガード
 *
 * 一般公開でリクエストが跳ねた際に課金の暴発へ気付けるようにする。
 * 実コスト（COST）ベースの月次予算を作成し、実績が閾値を超えた時点でメール通知する。
 *
 * 注意点:
 * - AWS Budgets はグローバルサービスだが、CloudFormation リソース
 *   `AWS::Budgets::Budget` はどのリージョンのスタックからでも作成できる。
 *   本スタック（ap-northeast-1）から作成して問題ない。
 * - 予算はアカウント全体のコストを対象とする（コスト配分タグの有効化が必要な
 *   タグフィルタは使わない）。そのため dev/prod の両スタックで作ると同じ範囲の
 *   予算が二重にでき、同じ通知が2通届く。作成は prod スタックのみとする。
 */
export class BudgetConstruct extends Construct {
  public readonly budget: budgets.CfnBudget;

  constructor(scope: Construct, id: string, props: BudgetConstructProps) {
    super(scope, id);

    // 実績が予算の何%に達したら通知するか
    const thresholdPercentages = [50, 80, 100];

    this.budget = new budgets.CfnBudget(this, 'MonthlyCostBudget', {
      budget: {
        budgetName: `pro-candidate-monthly-cost-${props.stage}`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: props.monthlyBudgetUsd,
          unit: 'USD',
        },
        costTypes: {
          // クレジット・返金・税金を除いた「実際に使った分」で判定する
          includeCredit: false,
          includeDiscount: true,
          includeOtherSubscription: true,
          includeRecurring: true,
          includeRefund: false,
          includeSubscription: true,
          includeSupport: true,
          includeTax: false,
          includeUpfront: true,
          useAmortized: false,
          useBlended: false,
        },
      },
      notificationsWithSubscribers: thresholdPercentages.map(threshold => ({
        notification: {
          notificationType: 'ACTUAL', // 実績ベース（予測ではない）
          comparisonOperator: 'GREATER_THAN',
          threshold,
          thresholdType: 'PERCENTAGE',
        },
        subscribers: [
          {
            subscriptionType: 'EMAIL',
            address: props.alertEmail,
          },
        ],
      })),
    });
  }
}
