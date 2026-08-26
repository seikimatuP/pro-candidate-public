# トラブルシューティング

**最終更新**: 2026-08-23 - pnpm コマンド体系・認証仕様に追随

## 🚨 緊急時対応

```bash
# システム状態確認
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Errors
pnpm run test:e2e:api:prod

# パフォーマンス問題
aws logs tail /aws/lambda/pro-baseball-scraping-prod --follow
aws logs tail /aws/lambda/pro-baseball-api-prod --follow

# データ問題
aws s3 ls s3://pro-candidate-data-prod/players/
scripts/verify-lambda-environment.sh prod
```

> デプロイのやり直しは GitHub Actions から行う（`cdk deploy` のローカル実行は禁止）。
> `gh workflow run deploy-infra.yml --ref develop`

## 🔧 よくある問題

### 環境構築

```bash
# インストール失敗（npm は使わない）
pnpm store prune && rm -rf node_modules && pnpm install

# lockfile 破損（ERR_PNPM_BROKEN_LOCKFILE）
pnpm install --frozen-lockfile   # CI と同条件で確認
pnpm install --lockfile-only     # 壊れていたら再生成

# Node.js バージョン
node --version  # Lambda ランタイムは 22.x、CI も node 22
nvm use 22
```

### TypeScript

```bash
# 型エラー
pnpm exec tsc --noEmit
pnpm exec tsc --noEmit --strict

# モジュール解決
rm -rf node_modules && pnpm install
```

### E2Eテスト

```bash
# 認証エラー（401 が返る）
# → Doppler の e2e_dev / e2e_prod に COGNITO_USERNAME / COGNITO_PASSWORD があるか確認
doppler secrets --config e2e_dev --only-names

# 403 が返る場合は admin グループ未所属
COGNITO_PASSWORD=... scripts/ensure-cognito-admin.sh dev

# タイムアウト
pnpm run test:e2e:dev:debug  # ステップ実行確認

# ブラウザ問題
pnpm run test:e2e:dev:headed # ブラウザ表示で確認
```

### AWS

```bash
# デプロイ失敗
aws configure list
gh run list --workflow=deploy-infra.yml

# Lambda エラー
aws logs describe-log-groups --log-group-name-prefix /aws/lambda
scripts/verify-lambda-environment.sh prod

# S3 アクセス
aws s3 ls s3://pro-candidate-data-prod/
aws sts get-caller-identity
```

### API が 401 / 403 を返す

API Gateway の Cognito 認証は dev / prod とも有効。認証不要なのは
`GET /health` `GET /statistics` `GET /schools` `GET /years/available` の 4 本だけ。

- **401**: トークンが無い・無効（API Gateway の authorizer が返す）
- **403**: 認証は通っているが `cognito:groups` に `admin` が無い（Lambda が返す）

## 📞 サポート

- CloudWatch Dashboard: [監視コンソール](https://console.aws.amazon.com/cloudwatch)
- GitHub Actions: [CI/CDログ](https://github.com/actions)

## 🔍 システム検証

### Lambda環境検証

```bash
# 完全検証（12項目チェック）
scripts/verify-lambda-environment.sh dev
scripts/verify-lambda-environment.sh prod

# APIヘルスチェック
pnpm run test:e2e:api:dev   # 最速
pnpm run test:e2e:api:prod  # 最速
```

### データ整合性確認

```bash
# S3データ確認
aws s3 ls s3://pro-candidate-data-dev/players/ --human-readable
aws s3 ls s3://pro-candidate-data-prod/players/ --human-readable

# バックアップ作成（S3 を直接コピー）
aws s3 sync s3://pro-candidate-data-prod/players/ ./backup/players/
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
