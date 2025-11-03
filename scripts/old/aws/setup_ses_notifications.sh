#!/bin/bash

# SNSトピック作成
TOPIC_ARN=$(aws sns create-topic --name ses-bounce-notifications --region ap-northeast-1 --output text --query 'TopicArn')
echo "SNSトピック作成: $TOPIC_ARN"

# メール購読設定
aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint yuta.nozue@gmail.com \
  --region ap-northeast-1

echo "📧 メール購読設定完了（確認メールをチェックしてください）"

# SES設定セット作成（まだない場合）
aws ses put-configuration-set \
  --configuration-set Name=pro-baseball-scraping \
  --region ap-northeast-1 2>/dev/null || echo "設定セット既存"

# バウンス通知設定
aws ses create-configuration-set-event-destination \
  --configuration-set-name pro-baseball-scraping \
  --event-destination Name=bounce-notifications \
    Enabled=true \
    SNSDestination="{\"TopicARN\":\"$TOPIC_ARN\"}" \
    MatchingEventTypes='["bounce","complaint","delivery","reject"]' \
  --region ap-northeast-1

echo "✅ SESバウンス通知設定完了"
