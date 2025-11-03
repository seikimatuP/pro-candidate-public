# 🚨 緊急時対応ガイド

**作成日**: 2025-06-28 - 野球選手データ管理システム緊急対応  
**目的**: システム障害・データ問題の即座解決

## ⚡ 緊急度別対応フロー

### 🔴 Critical（即座対応・5分以内）

#### システム完全停止

```bash
# 1. 即座確認（30秒）
curl -I "$PROD_API_URL/health" || echo "API停止確認"
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Errors

# 2. 緊急復旧（2分）
npm run deploy:aws  # 緊急デプロイ
scripts/verify-lambda-environment.sh prod

# 3. 代替手段（2分）
# 静的バックアップページ表示
aws s3 cp s3://pro-candidate-backup/emergency.html s3://pro-candidate-frontend-prod/index.html
```

#### データ完全破損

```bash
# 1. 損失確認（1分）
aws s3 ls s3://pro-candidate-data-prod/players/ || echo "データ消失"

# 2. 即座復旧（3分）
aws s3 sync s3://pro-candidate-backup/latest/ s3://pro-candidate-data-prod/
scripts/verify-lambda-environment.sh prod

# 3. 整合性確認（1分）
curl "$PROD_API_URL/players?type=highschool&year=2024" | jq '.data | length'
```

### 🟡 High（10分以内対応）

#### API応答遅延・タイムアウト

```bash
# 1. 原因特定（3分）
aws logs tail /aws/lambda/pro-baseball-scraping --follow | head -20
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Duration

# 2. 緊急最適化（5分）
# Lambda メモリ増加
aws lambda update-function-configuration \
  --function-name pro-baseball-scraping \
  --memory-size 1024

# 3. 確認・AI分析（2分）
npm run test:e2e:api:prod
./scripts/gemini debug "$(aws logs get-log-events --log-group-name /aws/lambda/api-handler)"
```

#### 認証システム障害

```bash
# 1. 認証状態確認（2分）
aws cognito-idp admin-get-user --user-pool-id ap-northeast-1_5m7pnXzt8 --username admin

# 2. 緊急ユーザー作成（3分）
aws cognito-idp admin-create-user \
  --user-pool-id ap-northeast-1_5m7pnXzt8 \
  --username emergency-admin \
  --temporary-password TempPass123!

# 3. 権限確認（5分）
# フロントエンドから緊急ログイン確認
npm run test:e2e:auth:prod
```

### 🟢 Medium（30分以内対応）

#### 部分的データ不整合

```bash
# 1. 不整合範囲特定（10分）
for year in 2022 2023 2024; do
  curl "$PROD_API_URL/players?type=highschool&year=$year" | jq '.data | length'
done

# 2. 段階的修正（15分）
# 問題年度のみ再スクレイピング
curl -X POST "$PROD_API_URL/scraping/trigger" \
  -H "Content-Type: application/json" \
  -d '{"type": "highschool", "year": 2024}'

# 3. AI品質確認（5分）
./scripts/gemini review "$(curl '$PROD_API_URL/players?type=highschool&year=2024' | jq '.data[0:10]')"
```

#### パフォーマンス劣化

```bash
# 1. ボトルネック特定（10分）
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S)

# 2. キャッシュ最適化（15分）
# S3 キャッシュクリア・再生成
aws s3 rm s3://pro-candidate-data-prod/cache/ --recursive
curl "$PROD_API_URL/players/statistics"  # キャッシュ再生成

# 3. 効果確認（5分）
npm run test:performance:prod
```

## 📞 エスカレーション・連絡体制

### 🚨 即座エスカレーション条件

- **ユーザー影響**: 全機能停止・データ完全アクセス不可
- **データ損失**: 1週間以上のデータ消失
- **セキュリティ**: 不正アクセス・情報漏洩疑い
- **SLA違反**: 連続30分以上の機能停止

### 📋 連絡手順

```bash
# 1. ステータス確認・記録
echo "$(date): システム障害発生" >> /tmp/incident.log
curl "$PROD_API_URL/health" 2>&1 >> /tmp/incident.log

# 2. AI分析・緊急提案
./scripts/gemini chat "緊急システム障害: $(cat /tmp/incident.log | tail -5) 対応策提案"

# 3. 外部通知（必要時）
# Slack・メール・GitHub Issue等
```

## 🔧 復旧検証チェックリスト

### システム機能確認

```bash
# ✅ API基本機能
curl "$PROD_API_URL/health"                    # ヘルスチェック
curl "$PROD_API_URL/players?type=highschool"   # データ取得
curl "$PROD_API_URL/years/available"           # 年度情報

# ✅ フロントエンド確認
npm run test:e2e:api:prod    # 3秒・API専用
npm run test:e2e:prod        # 6分・フル確認

# ✅ データ整合性
aws s3 ls s3://pro-candidate-data-prod/players/ --human-readable
curl "$PROD_API_URL/scraping/history?limit=1" | jq '.data[0]'
```

### パフォーマンス確認

```bash
# ✅ レスポンス時間
time curl "$PROD_API_URL/players?type=highschool&year=2024"  # <2秒目標

# ✅ Lambda メトリクス
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --metric-name Errors

# ✅ コスト影響確認
aws ce get-cost-and-usage --time-period Start=$(date +%Y-%m-%d),End=$(date +%Y-%m-%d)
```

### AI品質確認

```bash
# ✅ データ品質AI分析
./scripts/gemini review "$(curl '$PROD_API_URL/players?type=both&year=2024' | jq '.data[0:5]')"

# ✅ システム状態AI診断
./scripts/gemini debug "$(scripts/verify-lambda-environment.sh prod 2>&1)"

# ✅ 今後の対策AI提案
./scripts/gemini chat "今回の障害を踏まえた予防策・監視強化案"
```

## 📚 事後対応・改善

### インシデント記録

```bash
# 障害報告書生成
cat > incident_$(date +%Y%m%d_%H%M).md << EOF
# インシデント報告書

## 発生時刻
$(date)

## 影響範囲
- システム: [影響システム]
- ユーザー: [影響ユーザー数]
- 期間: [障害時間]

## 原因
[根本原因]

## 対応
[実施した対応]

## 今後の対策
[再発防止策]
EOF
```

### 再発防止策

```bash
# 監視強化
aws cloudwatch put-metric-alarm \
  --alarm-name "ProBaseball-API-HighLatency" \
  --alarm-description "API応答時間監視" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 5000

# AI予防分析
./scripts/gemini chat "類似障害の予防策・早期検知システム設計"
```

---

**🎯 緊急事態に冷静かつ迅速に対応し、野球データ管理システムの可用性を最大限確保します。**

**📱 連絡先**: 緊急時は即座にインシデント対応を開始し、必要に応じて外部エスカレーション実施
