# 📊 タスク別ワークフローガイド

**作成日**: 2025-06-28 - 野球選手データ管理業務特化  
**目的**: 実践的作業フローによる開発・運用効率最大化

## 🔍 データ更新ワークフロー

### 日常データ更新（5分作業）

```bash
# 1. 環境確認
scripts/verify-lambda-environment.sh dev
npm run test:e2e:api:dev  # 3秒・API確認

# 2. スクレイピング実行
curl -X POST "$DEV_API_URL/scraping/trigger" \
  -H "Content-Type: application/json" \
  -d '{"type": "both", "year": 2024}'

# 3. データ確認・検証
curl "$DEV_API_URL/players?type=highschool&year=2024" | jq '.data | length'
curl "$DEV_API_URL/scraping/history?limit=1" | jq '.data[0]'
```

### 本番データ更新（10分作業）

```bash
# 1. dev環境テスト
npm run test:e2e:dev      # 8分・完全テスト

# 2. prod環境更新
scripts/verify-lambda-environment.sh prod
curl -X POST "$PROD_API_URL/scraping/trigger" \
  -H "Content-Type: application/json" \
  -d '{"type": "both", "year": 2024}'

# 3. 更新検証・AI確認
./scripts/gemini chat "最新のスクレイピング結果を分析して"
```

### データ品質管理

```bash
# データ整合性チェック
aws s3 ls s3://pro-candidate-data-prod/players/ --human-readable
npm run backup:s3

# AI品質分析
./scripts/gemini review "$(curl '$PROD_API_URL/players?type=highschool&year=2024' | jq '.data[0:5]')"
```

## 🔍 選手検索・分析作業

### 基本検索ワークフロー

```bash
# 1. フロントエンド検索
open http://localhost:5173/highschool
# → 学校名・ポジション・都道府県フィルタ使用

# 2. API直接検索
curl "$API_URL/players?type=highschool&year=2024&school=智弁学園" | jq '.data'

# 3. 統計分析
curl "$API_URL/players/statistics" | jq '.positionDistribution'
```

### 高度分析ワークフロー

```bash
# AI支援分析
./scripts/gemini chat "2024年度の投手と野手の地域分布傾向を分析"

# 年度比較分析
curl "$API_URL/years/available" | jq '.data'
for year in 2022 2023 2024; do
  curl "$API_URL/players?type=highschool&year=$year" | jq ".data | length"
done

# カスタム分析
./scripts/gemini explain "関西圏の強豪校出身選手の特徴分析方法"
```

### レポート生成

```bash
# HTMLレポート生成
npm run generate:report -- --year=2024 --type=both

# データエクスポート
curl "$API_URL/players?type=both&year=2024&format=csv" > players_2024.csv

# AI要約レポート
./scripts/gemini chat "$(cat players_2024.csv | head -20) この選手データの傾向をまとめて"
```

## 🚀 デプロイ・監視作業

### 開発デプロイワークフロー

```bash
# 1. ローカル品質チェック
npm run ci-check          # TypeScript・ESLint・テスト
npm run test:e2e:local    # E2E完全テスト

# 2. dev環境デプロイ
git checkout develop
git add . && git commit -m "feature: 選手検索機能強化"
git push origin develop   # 自動デプロイ実行

# 3. デプロイ確認
gh run list --workflow=aws-deploy.yml
scripts/verify-lambda-environment.sh dev
```

### 本番デプロイワークフロー

```bash
# 1. dev環境完全確認
npm run test:e2e:dev      # dev環境統合テスト
scripts/verify-lambda-environment.sh dev

# 2. プルリクエスト・レビュー
gh pr create --title "feat: 選手比較機能追加" --body "野球データ分析機能強化"

# 3. 本番リリース
git tag v1.x.x -m "v1.x.x: 選手比較機能・AI分析強化"
git push origin v1.x.x   # 自動本番デプロイ

# 4. 本番確認
scripts/verify-lambda-environment.sh prod
npm run test:e2e:prod
```

### 監視・パフォーマンス確認

```bash
# CloudWatch確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)

# コスト確認
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY

# AI分析
./scripts/gemini debug "$(aws logs get-log-events --log-group-name /aws/lambda/pro-baseball-scraping)"
```

## 🤖 AI支援デバッグ・改善

### 開発効率化ワークフロー

```bash
# コード品質向上
./scripts/gemini review "$(git diff HEAD~1..HEAD)"
./scripts/gemini explain "React Server Components最適化方法"

# バグ修正支援
./scripts/gemini debug "$(npm test 2>&1 | tail -20)"
./scripts/gemini debug "E2Eテスト timeout問題解決方法"

# パフォーマンス最適化
./scripts/gemini explain "Lambda冷却対策・S3キャッシュ最適化"
```

### 野球業務改善

```bash
# データ分析改善
./scripts/gemini chat "選手データの新しい分析指標提案"
./scripts/gemini explain "機械学習モデルによるドラフト予測実装"

# UI/UX改善
./scripts/gemini review "$(cat frontend/src/components/PlayerTable.tsx)"
./scripts/gemini chat "選手比較機能のUI設計案"
```

### 技術課題解決

```bash
# ESLint警告解決
./scripts/gemini debug "$(npm run lint 2>&1)"

# TypeScript型エラー
./scripts/gemini debug "$(npx tsc --noEmit 2>&1)"

# AWS最適化
./scripts/gemini explain "Lambda関数メモリ最適化・コスト削減方法"
```

## 📋 定期メンテナンスワークフロー

### 週次メンテナンス（30分）

```bash
# 1. 依存関係更新
npm audit && npm audit fix
git add package*.json && git commit -m "chore: セキュリティアップデート"

# 2. データバックアップ
npm run backup:s3
aws s3 sync s3://pro-candidate-data-prod/ ./backup/$(date +%Y%m%d)/

# 3. パフォーマンスチェック
npm run test:performance
./scripts/gemini chat "今週のシステムパフォーマンス分析"
```

### 月次メンテナンス（1時間）

```bash
# 1. 包括的品質チェック
npm run analyze:full
npm run test:coverage

# 2. コスト分析・最適化
aws ce get-cost-and-usage --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d)
./scripts/gemini chat "月次AWSコスト分析・最適化提案"

# 3. 機能改善計画
./scripts/gemini chat "野球データ管理システムの機能拡張提案"
```

### 年次メンテナンス（半日）

```bash
# 1. 年度データ整理
for year in 2020 2021 2022; do
  aws s3 sync s3://pro-candidate-data-prod/players/highschool/$year.json s3://pro-candidate-archive/
done

# 2. システム全体レビュー
./scripts/gemini chat "年次システム包括レビュー・来年度改善計画"

# 3. 技術スタック更新計画
npm outdated
./scripts/gemini explain "Node.js・React・AWS最新技術動向・移行計画"
```

---

**🎯 ワークフロー活用により、日常的な野球データ管理業務を効率化し、AI支援による継続的改善を実現できます。**
