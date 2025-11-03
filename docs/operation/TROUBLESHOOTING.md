# トラブルシューティング

**最終更新**: 2025-06-28 - 文章量削減最適化

## 🚨 緊急時対応

```bash
# システム停止
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Errors
npm run test:e2e:api:prod
npm run deploy:aws

# パフォーマンス問題
aws logs tail /aws/lambda/pro-baseball-scraping --follow
./scripts/gemini debug "$(aws logs get-log-events --log-group-name /aws/lambda/api-handler)"

# データ問題
aws s3 ls s3://pro-candidate-data-prod/players/
scripts/verify-lambda-environment.sh prod
```

## 🔧 よくある問題

### 環境構築

```bash
# npm install失敗
npm cache clean --force && rm -rf node_modules && npm install

# Node.js バージョン
node --version  # v18.x必要
nvm use 18

# 権限エラー
npm config set prefix ~/.npm-global
```

### TypeScript

```bash
# 型エラー
npm run typecheck
npx tsc --noEmit --strict
./scripts/gemini debug "$(npx tsc --noEmit 2>&1)"

# モジュール解決
rm -rf node_modules/@types && npm install --save-dev @types/node
```

### E2Eテスト

```bash
# 認証エラー
E2E_BASE_URL=https://xxx.cloudfront.net npm run test:e2e:dev

# タイムアウト
npm run test:e2e:dev:debug  # ステップ実行確認

# ブラウザ問題
npm run test:e2e:dev:headed # ブラウザ表示で確認
```

### AWS

```bash
# デプロイ失敗
aws configure list
npm run deploy:aws

# Lambda エラー
aws logs describe-log-groups --log-group-name-prefix /aws/lambda
scripts/verify-lambda-environment.sh prod

# S3 アクセス
aws s3 ls s3://pro-candidate-data-prod/
aws iam get-user
```

### AI支援

```bash
# エラー解析
./scripts/gemini debug "エラーメッセージ"
./scripts/gemini explain "AWS Lambda timeout"
```

## 📞 サポート

- CloudWatch Dashboard: [監視コンソール](https://console.aws.amazon.com/cloudwatch)
- GitHub Actions: [CI/CDログ](https://github.com/actions)
- AI支援: `./scripts/gemini help`

## 🔍 システム検証

### Lambda環境検証

```bash
# 完全検証（12項目チェック）
scripts/verify-lambda-environment.sh dev
scripts/verify-lambda-environment.sh prod

# APIヘルスチェック
npm run test:e2e:api:dev   # 3秒・最速
npm run test:e2e:api:prod  # 3秒・最速
```

### データ整合性確認

```bash
# S3データ確認
aws s3 ls s3://pro-candidate-data-dev/players/ --human-readable
aws s3 ls s3://pro-candidate-data-prod/players/ --human-readable

# バックアップ作成
npm run backup:s3
```

### パフォーマンス監視

```bash
# CloudWatchメトリクス
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --start-time 2025-06-28T00:00:00Z \
  --end-time 2025-06-29T00:00:00Z

# コスト確認
aws ce get-cost-and-usage \
  --time-period Start=2025-06-01,End=2025-06-30 \
  --granularity MONTHLY
```

詳細は[DEPLOYMENT.md](../development/DEPLOYMENT.md)参照
