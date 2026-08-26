#!/bin/bash

# SESバウンス率監視アラーム作成
aws cloudwatch put-metric-alarm \
  --alarm-name "SES-High-Bounce-Rate" \
  --alarm-description "SESのバウンス率が5%を超えた場合に通知" \
  --namespace "AWS/SES" \
  --metric-name "Reputation.BounceRate" \
  --statistic Average \
  --period 900 \
  --threshold 0.05 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --treat-missing-data notBreaching \
  --region ap-northeast-1

echo "✅ バウンス率監視アラーム作成完了"

# 個別メール送信失敗検知（Send vs Bounce）
aws cloudwatch put-metric-alarm \
  --alarm-name "SES-Email-Bounce-Detected" \
  --alarm-description "メールバウンス（不達）を検知" \
  --namespace "AWS/SES" \
  --metric-name "Bounce" \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --treat-missing-data notBreaching \
  --region ap-northeast-1

echo "✅ バウンス検知アラーム作成完了"

# 苦情率監視（スパム報告）
aws cloudwatch put-metric-alarm \
  --alarm-name "SES-High-Complaint-Rate" \
  --alarm-description "苦情率が0.1%を超えた場合に通知" \
  --namespace "AWS/SES" \
  --metric-name "Reputation.ComplaintRate" \
  --statistic Average \
  --period 900 \
  --threshold 0.001 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --treat-missing-data notBreaching \
  --region ap-northeast-1

echo "✅ 苦情率監視アラーム作成完了"
