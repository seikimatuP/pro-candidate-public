# AWS Resource List

AWS 環境におけるリソース一覧（dev/prod 環境対応）

## Lambda Functions

| リソース名                   | Dev 環境                         | Prod 環境                         | 機能                 | メモリ | タイムアウト |
| ---------------------------- | -------------------------------- | --------------------------------- | -------------------- | ------ | ------------ |
| pro-baseball-scraping        | pro-baseball-scraping-dev        | pro-baseball-scraping-prod        | データスクレイピング | 512MB  | 15 分        |
| pro-baseball-api             | pro-baseball-api-dev             | pro-baseball-api-prod             | RESTful API          | 256MB  | 30 秒        |
| pro-baseball-data-processing | pro-baseball-data-processing-dev | pro-baseball-data-processing-prod | データ処理・変換     | 1024MB | 10 分        |

## S3 Buckets

| リソース名         | Dev 環境                  | Prod 環境                  | 用途                          | アクセス制御 |
| ------------------ | ------------------------- | -------------------------- | ----------------------------- | ------------ |
| プレイヤーデータ   | pro-baseball-data-dev     | pro-baseball-data-prod     | JSON ファイル形式の選手データ | Private      |
| フロントエンド     | pro-baseball-frontend-dev | pro-baseball-frontend-prod | React SPA 配信                | PublicRead   |
| ログ・バックアップ | pro-baseball-logs-dev     | pro-baseball-logs-prod     | ログファイル・バックアップ    | Private      |

## API Gateway

| リソース名   | Dev 環境           | Prod 環境           | エンドポイント              | 認証    |
| ------------ | ------------------ | ------------------- | --------------------------- | ------- |
| プロ野球 API | ProBaseballAPI-dev | ProBaseballAPI-prod | /players, /schools, /health | Cognito |

## DynamoDB Tables

| リソース名 | Dev 環境 | Prod 環境 | 用途 | 備考              |
| ---------- | -------- | --------- | ---- | ----------------- |
| -          | -        | -         | -    | S3 に完全移行済み |

## CloudFront Distributions

| リソース名         | Dev 環境           | Prod 環境                   | 配信元            | キャッシュ設定 |
| ------------------ | ------------------ | --------------------------- | ----------------- | -------------- |
| フロントエンド配信 | dev.cloudfront.net | pro-baseball.cloudfront.net | S3 フロントエンド | TTL: 24 時間   |

## IAM Roles

| リソース名         | Dev 環境                  | Prod 環境                  | 権限                      | 使用先           |
| ------------------ | ------------------------- | -------------------------- | ------------------------- | ---------------- |
| Lambda 実行ロール  | ProBaseballLambdaRole-dev | ProBaseballLambdaRole-prod | S3 read/write, CloudWatch | Lambda Functions |
| API Gateway ロール | ProBaseballAPIRole-dev    | ProBaseballAPIRole-prod    | Lambda invoke             | API Gateway      |

## CloudWatch

| リソース名  | Dev 環境                           | Prod 環境                           | 監視対象               | アラート設定  |
| ----------- | ---------------------------------- | ----------------------------------- | ---------------------- | ------------- |
| Lambda 監視 | /aws/lambda/pro-baseball-\*-dev    | /aws/lambda/pro-baseball-\*-prod    | エラー率、実行時間     | > 5% エラー率 |
| API 監視    | /aws/apigateway/ProBaseballAPI-dev | /aws/apigateway/ProBaseballAPI-prod | レスポンス時間、エラー | > 500ms       |

## Cognito

| リソース名     | Dev 環境               | Prod 環境               | 用途       | 機能     |
| -------------- | ---------------------- | ----------------------- | ---------- | -------- |
| ユーザープール | pro-baseball-users-dev | pro-baseball-users-prod | 認証・認可 | MFA 有効 |

## EventBridge (CloudWatch Events)

| リソース名         | Dev 環境                  | Prod 環境                  | スケジュール  | ターゲット            |
| ------------------ | ------------------------- | -------------------------- | ------------- | --------------------- |
| スクレイピング実行 | pro-baseball-schedule-dev | pro-baseball-schedule-prod | 毎日 6:00 UTC | pro-baseball-scraping |

## Systems Manager Parameter Store

| パラメータ名                  | Dev 環境                          | Prod 環境                          | 用途                 | 暗号化 |
| ----------------------------- | --------------------------------- | ---------------------------------- | -------------------- | ------ |
| /pro-baseball/config/sheet-id | /pro-baseball/dev/config/sheet-id | /pro-baseball/prod/config/sheet-id | シート ID            | 標準   |
| /pro-baseball/config/urls     | /pro-baseball/dev/config/urls     | /pro-baseball/prod/config/urls     | スクレイピング先 URL | 標準   |

## コスト概算（2025-06-08 更新）

| 環境     | 最適化前  | 最適化後  | 削減額        | 主要コスト要因             |
| -------- | --------- | --------- | ------------- | -------------------------- |
| Dev      | $0.60     | $0.35     | -$0.25        | Lambda 実行、S3 ストレージ |
| Prod     | $0.55     | $0.55     | $0.00         | Lambda 実行、S3 転送       |
| **合計** | **$1.15** | **$0.90** | **-$0.25/月** | **CloudWatch 最適化済み**  |

### Phase2 実行後予想（Secrets Manager 最適化）

| 環境     | Phase1 後 | Phase2 後 | 削減額        | 主要変更             |
| -------- | --------- | --------- | ------------- | -------------------- |
| Dev      | $0.35     | $0.15     | -$0.20        | Secrets Manager 削除 |
| Prod     | $0.55     | $0.35     | -$0.20        | Secrets Manager 削除 |
| **合計** | **$0.90** | **$0.50** | **-$0.40/月** | **環境変数置き換え** |

### 最終目標（Phase3 完了後）

- **Route 53 削除**: -$0.50/月
- **最終月額**: **$0.00**（完全無料枠内運用）

## 環境別設定

### Dev 環境

- CloudFormation スタック: `ProBaseballStack-dev`
- ログレベル: DEBUG
- キャッシュ TTL: 5 分
- 自動スケーリング: 無効

### Prod 環境

- CloudFormation スタック: `ProBaseballStack-prod`
- ログレベル: WARN
- キャッシュ TTL: 1 時間
- 自動スケーリング: 有効

## セキュリティ設定

| 項目                 | Dev 環境                 | Prod 環境               |
| -------------------- | ------------------------ | ----------------------- |
| VPC                  | デフォルト VPC           | カスタム VPC            |
| セキュリティグループ | 開発用（22,80,443 許可） | 本番用（80,443 のみ）   |
| SSL 証明書           | 自己署名                 | AWS Certificate Manager |
| WAF                  | 無効                     | 有効（基本ルール）      |

## 監視・アラート

### CloudWatch Alarms

| アラート名             | 閾値         | アクション |
| ---------------------- | ------------ | ---------- |
| Lambda Error Rate      | > 5%         | SNS 通知   |
| API Gateway 5xx Errors | > 10 件/5 分 | SNS 通知   |
| S3 GetObject Errors    | > 50 件/時間 | SNS 通知   |

### ダッシュボード

- **Dev**: 基本メトリクス（CPU、メモリ、エラー率）
- **Prod**: 詳細監視（ビジネスメトリクス含む）

## デプロイメント

| 項目             | 方法            | 使用ツール     |
| ---------------- | --------------- | -------------- |
| インフラ         | AWS CDK         | TypeScript     |
| アプリケーション | CI/CD Pipeline  | GitHub Actions |
| 設定管理         | Parameter Store | AWS CLI/CDK    |

---

**最終更新**: 2025-06-08  
**バージョン**: 1.0  
**作成者**: Claude Code
