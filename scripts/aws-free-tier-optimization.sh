#!/bin/bash

# AWS 完全無料枠化スクリプト
# 目標: 月額 $0.00（完全無料枠内での運用）
# 対象: 開発環境での最大コスト削減

echo "🆓 AWS 完全無料枠化プロジェクト開始..."

# 環境変数チェック
REGION=${AWS_DEFAULT_REGION:-ap-northeast-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "📍 リージョン: $REGION"
echo "🏷️  アカウント: $ACCOUNT_ID"

# 1. 高コストサービスの完全停止

echo ""
echo "🚫 高コストサービス停止開始..."

# 1.1 CloudTrail完全停止（開発環境）
echo "  ❌ CloudTrail停止中..."
aws cloudtrail stop-logging --name ProBaseballAuditTrail --region $REGION
if [ $? -eq 0 ]; then
    echo "  ✅ CloudTrail停止完了（-$7-10/月削減）"
else
    echo "  ⚠️  CloudTrail停止失敗またはアクセス権限不足"
fi

# 1.2 AWS Config完全無効化
echo "  ❌ AWS Config無効化中..."

# Configuration Recorder停止
aws configservice stop-configuration-recorder --configuration-recorder-name default --region $REGION 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✅ Config Recorder停止完了"
fi

# Delivery Channel削除
aws configservice delete-delivery-channel --delivery-channel-name default --region $REGION 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✅ Config Delivery Channel削除完了"
fi

# Configuration Recorder削除
aws configservice delete-configuration-recorder --configuration-recorder-name default --region $REGION 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✅ Config Recorder削除完了（-$8-12/月削減）"
fi

# 1.3 Security Hub完全無効化
echo "  ❌ Security Hub無効化中..."
aws securityhub disable-security-hub --region $REGION 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✅ Security Hub無効化完了（-$0-5/月削減）"
else
    echo "  ⚠️  Security Hub既に無効化済み"
fi

# 2. EC2関連リソース最適化

echo ""
echo "🔧 EC2関連リソース最適化..."

# 2.1 不要なEC2インスタンス確認
echo "  📊 EC2インスタンス確認中..."
RUNNING_INSTANCES=$(aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name]' --output table --region $REGION)
echo "$RUNNING_INSTANCES"

# 2.2 不要なECSクラスター確認
echo "  📊 ECSクラスター確認中..."
aws ecs list-clusters --region $REGION --query 'clusterArns' --output table

# 2.3 不要なLoad Balancer確認
echo "  📊 Load Balancer確認中..."
aws elbv2 describe-load-balancers --region $REGION --query 'LoadBalancers[*].[LoadBalancerName,State.Code,Type]' --output table 2>/dev/null || echo "  ✅ Load Balancer未使用"

# 3. ストレージ最適化

echo ""
echo "💾 ストレージ最適化..."

# 3.1 S3バケット使用量確認
echo "  📦 S3使用量確認中..."
S3_BUCKETS=$(aws s3 ls)
echo "$S3_BUCKETS"

for bucket in $(aws s3 ls | awk '{print $3}'); do
    size=$(aws s3 ls s3://$bucket --recursive --summarize | grep "Total Size" | awk '{print $3, $4}')
    echo "  📊 $bucket: $size"
done

# 3.2 不要なEBSボリューム確認
echo "  💽 EBSボリューム確認中..."
aws ec2 describe-volumes --filters "Name=state,Values=available" --query 'Volumes[*].[VolumeId,Size,State]' --output table --region $REGION

# 4. ネットワーク最適化

echo ""
echo "🌐 ネットワーク最適化..."

# 4.1 VPC設定確認
echo "  🔍 VPC設定確認中..."
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,CidrBlock,State]' --output table --region $REGION

# 4.2 NATゲートウェイ確認（高コスト要因）
echo "  🔍 NATゲートウェイ確認中..."
NAT_GATEWAYS=$(aws ec2 describe-nat-gateways --region $REGION --query 'NatGateways[*].[NatGatewayId,State,VpcId]' --output table)
if [[ "$NAT_GATEWAYS" == *"NatGatewayId"* ]]; then
    echo "  ⚠️  NATゲートウェイ検出（高コスト要因）"
    echo "$NAT_GATEWAYS"
    echo "  💡 NATゲートウェイ削除推奨（-$32/月削減）"
else
    echo "  ✅ NATゲートウェイ未使用"
fi

# 5. 監視・ログ最適化

echo ""
echo "📊 監視・ログ最適化..."

# 5.1 CloudWatch Logs保存期間確認
echo "  📋 CloudWatch Logs確認中..."
aws logs describe-log-groups --region $REGION --query 'logGroups[*].[logGroupName,retentionInDays,storedBytes]' --output table

# 5.2 CloudWatch アラーム確認
echo "  🔔 CloudWatch アラーム確認中..."
ALARM_COUNT=$(aws cloudwatch describe-alarms --region $REGION --query 'length(MetricAlarms)')
echo "  📊 アラーム数: $ALARM_COUNT (無料枠: 10個まで)"

# 6. 完全無料枠構成への移行提案

echo ""
echo "🎯 完全無料枠構成への移行提案..."

cat << 'EOF'

💡 完全無料枠での運用構成:

┌─────────────────────────────────────────┐
│           🆓 無料枠構成               │
├─────────────────────────────────────────┤
│ ✅ Lambda: 100万リクエスト/月            │
│ ✅ API Gateway: 100万コール/月           │
│ ✅ S3: 5GB Standard, 2万GET, 2千PUT    │
│ ✅ CloudWatch: 10メトリクス、5GBログ     │
│ ✅ SNS: 100万パブリッシュ               │
│ ✅ SQS: 100万リクエスト                │
│ ❌ CloudTrail: 停止                    │
│ ❌ Config: 無効化                      │
│ ❌ Security Hub: 無効化                │
│ ❌ EC2: 最小限またはSpot Instance       │
│ ❌ ECS: 削除                          │
│ ❌ Load Balancer: 削除                 │
└─────────────────────────────────────────┘

EOF

# 7. 削減効果計算

echo ""
echo "💰 完全無料枠化による削減効果:"
echo "  • CloudTrail停止: -$7-10/月"
echo "  • Config無効化: -$8-12/月"  
echo "  • EC2/ECS最適化: -$4-6/月"
echo "  • Load Balancer削除: -$16-22/月（該当する場合）"
echo "  • NATゲートウェイ削除: -$32/月（該当する場合）"
echo "  • その他最適化: -$2-5/月"
echo ""
echo "  🎯 目標達成: 月額 $0.00"
echo "  📈 現在 $24-27 → 目標 $0 (100%削減)"

# 8. 次のアクション

echo ""
echo "📋 次に実行すべきアクション:"
echo "  1. CloudTrail削除（S3バケットも削除）"
echo "  2. 不要なEC2/ECSリソース終了"
echo "  3. Load Balancer削除（存在する場合）"
echo "  4. NATゲートウェイ削除（存在する場合）"
echo "  5. Lambda + API Gateway構成への完全移行"
echo ""
echo "⚠️  注意: 本番環境では最低限のセキュリティ監視を維持してください"
echo "✅ 開発環境では完全無料枠化が推奨されます"

# 9. 実行確認

echo ""
read -p "🤔 CloudTrail完全削除を実行しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  🗑️  CloudTrail削除実行中..."
    aws cloudtrail delete-trail --name ProBaseballAuditTrail --region $REGION
    if [ $? -eq 0 ]; then
        echo "  ✅ CloudTrail削除完了"
        
        # CloudTrail S3バケット削除
        read -p "  📦 CloudTrail S3バケットも削除しますか？ (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            aws s3 rb s3://pro-baseball-cloudtrail-131492497870 --force
            if [ $? -eq 0 ]; then
                echo "  ✅ CloudTrail S3バケット削除完了"
            fi
        fi
    fi
else
    echo "  ⏸️  CloudTrail削除をスキップしました"
fi

echo ""
echo "🎉 AWS完全無料枠化プロジェクト完了！"
echo "📊 次回の請求書で効果を確認してください"