# AWS デプロイメント

**最終更新**: 2025-06-28 - 文章量削減最適化

## 🚀 デプロイ方法

```bash
# 自動（推奨）
git push origin develop              # dev環境
git tag v1.x.x && git push origin v1.x.x  # prod環境

# 緊急時手動
cd pro-candidate-aws && npm install && cdk deploy ProBaseballStack-dev
```

## 📐 CI/CD構成

**分離型パイプライン**: インフラ（8-12分）・フロントエンド（3-5分）・並列実行

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
GOOGLE_GEMINI_API_KEY
```

### 検証コマンド

```bash
scripts/verify-lambda-environment.sh dev   # dev環境検証
scripts/verify-lambda-environment.sh prod  # prod環境検証
npm run test:e2e:api:prod                  # API ヘルスチェック
```

## 🔨 トラブルシューティング

### デプロイ失敗

```bash
# GitHub Actions確認
gh run list --workflow=aws-deploy.yml

# 権限確認
aws sts get-caller-identity
aws configure list

# 再実行
gh workflow run aws-deploy.yml --ref develop
```

### Lambda エラー

```bash
# ログ確認
aws logs describe-log-groups --log-group-name-prefix /aws/lambda
aws logs tail /aws/lambda/pro-baseball-scraping --follow

# AI支援
./scripts/gemini debug "$(aws logs get-log-events --log-group-name /aws/lambda/api-handler)"
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
