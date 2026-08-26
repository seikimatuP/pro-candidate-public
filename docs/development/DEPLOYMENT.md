# AWS デプロイメント

**最終更新**: 2026-08-23 - デプロイ経路と認証仕様に追随

## 🚀 デプロイ方法

```bash
# dev環境: develop への push（paths フィルタに該当する変更のみ）
git push origin develop

# prod環境: GitHub Release の publish がトリガー
gh release create v1.x.x --title "Version 1.x.x" --notes-file release-notes.md --target develop
```

**push すれば必ずデプロイされるわけではない**。デプロイワークフローは allowlist 方式の
`paths` フィルタを持つ。

| ワークフロー          | 起動する変更           |
| --------------------- | ---------------------- |
| `deploy-frontend.yml` | `frontend/**`          |
| `deploy-infra.yml`    | `pro-candidate-aws/**` |

`docs/` や `tests/` のみの変更ではデプロイも E2E も走らない（Quality Check のみ起動）。
E2E だけ検証したい場合は `gh workflow run e2e-test.yml --ref develop -f environment=dev` を使う。

> **禁止**: `cdk deploy` / `cdk destroy` のローカル実行。デプロイは GitHub Actions のみ。

## 📐 CI/CD構成

**分離型パイプライン**: インフラ（8-12分）・フロントエンド（3-5分）・並列実行

フロントエンドのデプロイは S3 同期だけでは反映されない。CloudFront の invalidation が必須で、
`deploy-frontend.yml` は `create-invalidation` 後に `wait invalidation-completed` まで実行する。

## ☁️ AWS構成

### 主要サービス

| サービス    | 役割                | コスト     |
| ----------- | ------------------- | ---------- |
| Lambda      | API・スクレイピング | $0.00-0.20 |
| S3          | データ・配信        | $0.10-0.20 |
| API Gateway | RESTful API         | $0.00-0.10 |
| CloudFront  | CDN                 | $0.00-0.20 |

**総月額**: $0.50以下（無料枠化達成）

### 環境別設定

```bash
# dev環境
API: https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev/
Frontend: https://d3brmn978dqs63.cloudfront.net

# prod環境
API: https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod/
Frontend: https://dh2yk8y9mj9wl.cloudfront.net
```

## 🔧 設定・検証

### 環境変数

```bash
# AWS設定
AWS_REGION=ap-northeast-1
AWS_ACCOUNT_ID=your-account-id

# GitHub Secrets必須
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

# Doppler Service Token（ビルド・E2E用）
DOPPLER_TOKEN_DEV
DOPPLER_TOKEN_PRD
DOPPLER_TOKEN_E2E_DEV
DOPPLER_TOKEN_E2E_PROD
```

詳細は [Doppler セットアップ](DOPPLER_SETUP.md) を参照。

### 検証コマンド

```bash
scripts/verify-lambda-environment.sh dev   # dev環境検証
scripts/verify-lambda-environment.sh prod  # prod環境検証
pnpm run test:e2e:api:prod                 # API ヘルスチェック
```

### API 認証

API Gateway の Cognito 認証は dev / prod とも有効。認証不要なのは
`GET /health` `GET /statistics` `GET /schools` `GET /years/available` の 4 本だけで、
それ以外は ID トークン＋`admin` グループが必要（401＝未認証、403＝admin 非所属）。
デプロイ後の疎通確認に `/players` を素で叩くと 401 が返るのが正常。

## 🔨 トラブルシューティング

### デプロイ失敗

```bash
# GitHub Actions確認
gh run list --workflow=deploy-infra.yml

# 権限確認
aws sts get-caller-identity
aws configure list

# 再実行
gh workflow run deploy-infra.yml --ref develop
```

### Lambda エラー

```bash
# ログ確認
aws logs describe-log-groups --log-group-name-prefix /aws/lambda
aws logs tail /aws/lambda/pro-baseball-scraping-dev --follow
aws logs tail /aws/lambda/pro-baseball-api-dev --follow
```

### S3 問題

```bash
# バケット確認
aws s3 ls s3://pro-candidate-data-prod/
aws s3api get-bucket-website --bucket pro-candidate-frontend-prod

# SPA 404問題（解決済み）
CDK Custom Resource自動設定 → 404→index.htmlリダイレクト
```

## 📊 監視・運用

```bash
# CloudWatch確認
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Errors

# コスト確認
aws ce get-cost-and-usage --time-period Start=2025-06-01,End=2025-06-30
```

詳細は[TROUBLESHOOTING.md](../operation/TROUBLESHOOTING.md)参照
