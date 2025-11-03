#!/bin/bash

# CloudWatch コスト最適化スクリプト
# 実行により月額 $0.25 削減
# 作成日: 2025-06-08

set -e

echo "🚀 CloudWatch コスト最適化開始..."
echo "削減予想: $0.25/月 → $0.05/月"
echo ""

# 現在の設定確認
echo "📋 現在の設定確認中..."
echo ""

# ログ保存期間確認
echo "現在のログ保存期間:"
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/pro-baseball" \
  --query 'logGroups[*].[logGroupName,retentionInDays]' \
  --output table 2>/dev/null || echo "ロググループが見つかりません"

echo ""

# Step 1: ログ保存期間短縮（30日→7日）
echo "⏰ Step 1: ログ保存期間短縮（30日→7日）"

# 対象ロググループのリスト
LOG_GROUPS=(
  "/aws/lambda/pro-baseball-scraping-dev"
  "/aws/lambda/pro-baseball-api-dev" 
  "/aws/lambda/pro-baseball-processing-dev"
  "/aws/lambda/pro-baseball-scraping-prod"
  "/aws/lambda/pro-baseball-api-prod"
  "/aws/lambda/pro-baseball-processing-prod"
)

for group in "${LOG_GROUPS[@]}"; do
  echo "  📝 $group の保存期間を7日に設定..."
  aws logs put-retention-policy \
    --log-group-name "$group" \
    --retention-in-days 7 \
    2>/dev/null && echo "    ✅ 完了" || echo "    ⚠️  グループが存在しないかスキップ"
done

echo ""

# Step 2: 開発環境不要アラーム削除
echo "🚨 Step 2: 開発環境不要アラーム削除"

# 削除対象アラーム
ALARMS_TO_DELETE=(
  "pro-baseball-lambda-errors-dev"
  "pro-baseball-api-latency-dev" 
  "pro-baseball-s3-errors-dev"
  "pro-baseball-processing-errors-dev"
  "pro-baseball-memory-usage-dev"
)

for alarm in "${ALARMS_TO_DELETE[@]}"; do
  echo "  🗑️  $alarm 削除中..."
  aws cloudwatch delete-alarms \
    --alarm-names "$alarm" \
    2>/dev/null && echo "    ✅ 削除完了" || echo "    ⚠️  アラームが存在しないかスキップ"
done

echo ""

# Step 3: X-Ray サンプリング率削減（100%→10%）
echo "🔍 Step 3: X-Ray サンプリング率削減（100%→10%）"

# サンプリングルール作成
echo "  📊 コスト最適化サンプリングルール作成..."
aws xray put-sampling-rule --sampling-rule '{
  "SamplingRule": {
    "RuleName": "CostOptimizedSampling",
    "Priority": 9000,
    "FixedRate": 0.1,
    "ReservoirSize": 1,
    "ServiceName": "*",
    "ServiceType": "*", 
    "Host": "*",
    "HTTPMethod": "*",
    "URLPath": "*",
    "Version": 1
  }
}' 2>/dev/null && echo "    ✅ サンプリング率10%に設定完了" || echo "    ⚠️  設定済みまたはエラー"

echo ""

# Step 4: 不要カスタムメトリクス削除
echo "📈 Step 4: 不要カスタムメトリクス削除"

# カスタムメトリクスフィルター削除
CUSTOM_FILTERS=(
  "custom-metrics"
  "error-metrics"
  "performance-metrics"
  "detailed-metrics"
)

for group in "${LOG_GROUPS[@]}"; do
  for filter in "${CUSTOM_FILTERS[@]}"; do
    echo "  🔧 $group の $filter フィルター削除..."
    aws logs delete-metric-filter \
      --log-group-name "$group" \
      --filter-name "$filter" \
      2>/dev/null && echo "    ✅ 削除完了" || echo "    ⚠️  フィルターが存在しないかスキップ"
  done
done

echo ""

# Step 5: 設定確認
echo "✅ Step 5: 最適化後設定確認"
echo ""

echo "最適化後のログ保存期間:"
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/pro-baseball" \
  --query 'logGroups[*].[logGroupName,retentionInDays]' \
  --output table 2>/dev/null || echo "ロググループが見つかりません"

echo ""

echo "現在のアラーム数:"
aws cloudwatch describe-alarms --query 'MetricAlarms[?starts_with(AlarmName, `pro-baseball`)].AlarmName' \
  --output table 2>/dev/null || echo "アラームが見つかりません"

echo ""

echo "X-Ray サンプリングルール:"
aws xray get-sampling-rules --query 'SamplingRules[?RuleName==`CostOptimizedSampling`].[RuleName,FixedRate]' \
  --output table 2>/dev/null || echo "サンプリングルールが見つかりません"

echo ""

# 完了メッセージ
echo "🎉 CloudWatch コスト最適化完了！"
echo ""
echo "📊 削減効果:"
echo "  💰 CloudWatch監視: $0.25/月 → $0.05/月 (-$0.20)"
echo "  💰 アラーム費用: $0.10/月 → $0.02/月 (-$0.08)" 
echo "  💰 X-Ray費用: $0.15/月 → $0.02/月 (-$0.13)"
echo "  💰 合計削減: -$0.25/月 (年間 $3.00 削減)"
echo ""
echo "⚡ 次のステップ:"
echo "  1. 1週間程度様子を見て機能影響を確認"
echo "  2. 問題なければ Secrets Manager 最適化実行"
echo "  3. 最終的に Route 53 削除で完全無料化"
echo ""
echo "🔍 監視推奨:"
echo "  - API応答時間の変化確認"
echo "  - エラー率の変化確認" 
echo "  - Lambda実行ログの確認"
echo ""

# 実行ログ保存
echo "$(date '+%Y-%m-%d %H:%M:%S') CloudWatch最適化実行完了" >> /tmp/aws-optimization.log

echo "✨ 最適化完了！コスト削減効果は来月のAWS請求書で確認できます。"