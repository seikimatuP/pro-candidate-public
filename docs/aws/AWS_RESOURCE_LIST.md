# AWS Resource List

AWS 環境におけるリソース一覧（dev/prod 環境対応）

## Lambda Functions

| リソース名              | Dev 環境                    | Prod 環境                    | 機能                 | メモリ | タイムアウト |
| ----------------------- | --------------------------- | ---------------------------- | -------------------- | ------ | ------------ |
| pro-baseball-scraping   | pro-baseball-scraping-dev   | pro-baseball-scraping-prod   | データスクレイピング | 512MB  | 15 分        |
| pro-baseball-api        | pro-baseball-api-dev        | pro-baseball-api-prod        | RESTful API          | 256MB  | 30 秒        |
| pro-baseball-processing | pro-baseball-processing-dev | pro-baseball-processing-prod | データ処理・変換     | 1024MB | 10 分        |

## S3 Buckets

| リソース名       | Dev 環境                   | Prod 環境                   | 用途                          | アクセス制御 |
| ---------------- | -------------------------- | --------------------------- | ----------------------------- | ------------ |
| プレイヤーデータ | pro-candidate-data-dev     | pro-candidate-data-prod     | JSON ファイル形式の選手データ | Private      |
| フロントエンド   | pro-candidate-frontend-dev | pro-candidate-frontend-prod | React SPA 配信                | PublicRead   |

※ ログ・一時データ・キャッシュはデータバケット内のプレフィックス（`logs/` `temp/` `cache/`）で
ライフサイクル管理しており、専用バケットは作らない。

※ prod のデータバケットは既存バケットを `fromBucketName` で取り込んでいるため CDK のバケット設定が効かない。
そのため暗号化（AES256）・Public Access Block 全 true・バージョニングを、デプロイ時に
AwsCustomResource で冪等に強制している（`lib/constructs/s3-construct.ts`）。
dev は CDK で新規作成し、同等の設定をバケット定義側で行っている。

## API Gateway

| リソース名   | Dev 環境             | Prod 環境             | 認証                                |
| ------------ | -------------------- | --------------------- | ----------------------------------- |
| プロ野球 API | pro-baseball-api-dev | pro-baseball-api-prod | Cognito authorizer（dev/prod とも） |

### エンドポイント別の認証要件

| エンドポイント                                      | 認証                       |
| --------------------------------------------------- | -------------------------- |
| `GET /health`                                       | 不要                       |
| `GET /statistics`（氏名・学校名を含まない集計のみ） | 不要                       |
| `GET /schools`                                      | 不要                       |
| `GET /years/available`                              | 不要                       |
| `/players`・`/players/{id}`・`/players/search`      | Cognito + `admin` グループ |
| `GET /schools/{school}/players`                     | Cognito + `admin` グループ |
| `/scraping/trigger`・`/scraping/history`            | Cognito + `admin` グループ |
| `ANY /{proxy+}`（未定義パスのキャッチオール）       | Cognito + `admin` グループ |

※ 認証は dev / prod の両方で有効。`admin` の判定は API Gateway の authorizer に加えて
Lambda 側でも ID トークンの `cognito:groups` を検証する（二重防御）。
認証ヘッダー無しの API 直叩きは dev/prod とも 401 になる。

## DynamoDB Tables

| リソース名 | Dev 環境 | Prod 環境 | 用途 | 備考              |
| ---------- | -------- | --------- | ---- | ----------------- |
| -          | -        | -         | -    | S3 に完全移行済み |

## CloudFront Distributions

| リソース名         | Dev 環境                      | Prod 環境                    | 配信元            | キャッシュ設定 |
| ------------------ | ----------------------------- | ---------------------------- | ----------------- | -------------- |
| フロントエンド配信 | d3brmn978dqs63.cloudfront.net | dh2yk8y9mj9wl.cloudfront.net | S3 フロントエンド | TTL: 24 時間   |

※ フロントエンドのデプロイでは CloudFront invalidation を必須にしている（`deploy-frontend.yml`）。

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

| リソース名     | Dev 環境                    | Prod 環境                    | 用途       | 機能                             |
| -------------- | --------------------------- | ---------------------------- | ---------- | -------------------------------- |
| ユーザープール | pro-candidate-dev-user-pool | pro-candidate-prod-user-pool | 認証・認可 | MFA 任意・セルフサインアップ無効 |

※ `admin` グループは CDK 管理外。`AWS::Cognito::UserPoolGroup` を CDK で作ると
CloudFormation の Early Validation（`AWS::EarlyValidation::ResourceExistenceCheck`）が
既存グループとの重複でチェンジセットごと失敗させ、スタック全体がデプロイ不能になる。
そのため `scripts/ensure-cognito-admin.sh <dev|prod>` が冪等に用意する
（`deploy-infra.yml` と `e2e-test.yml` の E2E 実行前に Doppler 経由で実行）。
詳細は [COGNITO_ADMIN_SETUP.md](COGNITO_ADMIN_SETUP.md)。

※ セルフサインアップは無効（`selfSignUpEnabled: false`）。アカウントは運営者が招待・作成する。

## EventBridge (CloudWatch Events)

| リソース名         | Dev 環境                                     | Prod 環境                           | スケジュール                | ターゲット            |
| ------------------ | -------------------------------------------- | ----------------------------------- | --------------------------- | --------------------- |
| スクレイピング実行 | なし（prod のみ）                            | pro-baseball-scraping-schedule-prod | 平日 08:30 UTC（JST 17:30） | pro-baseball-scraping |
| スクレイピング試験 | pro-baseball-scraping-test-dev（既定で無効） | なし                                | 5分間隔                     | pro-baseball-scraping |

※ 定期実行ルールは prod にのみ作成する（取得元の公式サイトへ dev/prod から二重アクセスしないため）。ルールは通年で発火し、実際に走るかどうかは下記 SSM パラメータの稼働期間で Lambda 側が判定する。

## Systems Manager Parameter Store

| パラメータ名                  | Dev 環境                                    | Prod 環境                                    | 用途                                                                   | 暗号化 |
| ----------------------------- | ------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| /pro-baseball/config/sheet-id | /pro-baseball/dev/config/sheet-id           | /pro-baseball/prod/config/sheet-id           | シート ID                                                              | 標準   |
| /pro-baseball/config/urls     | /pro-baseball/dev/config/urls               | /pro-baseball/prod/config/urls               | スクレイピング先 URL                                                   | 標準   |
| scraping-schedule-period      | /pro-candidate/dev/scraping-schedule-period | /pro-candidate/prod/scraping-schedule-period | 定期スクレイピングの稼働期間（JST・両端を含む JSON。空なら実行しない） | 標準   |

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

| 項目                   | Dev 環境                                | Prod 環境                                     |
| ---------------------- | --------------------------------------- | --------------------------------------------- |
| API 認証               | Cognito authorizer + admin グループ検証 | Cognito authorizer + admin グループ検証       |
| CORS 許可オリジン      | `*`                                     | 本番 CloudFront ドメインのみ                  |
| データバケット公開設定 | Public Access Block 全 true             | Public Access Block 全 true（毎デプロイ強制） |
| データバケット暗号化   | AES256（S3 マネージド）                 | AES256（S3 マネージド・毎デプロイ強制）       |
| 配信の HTTPS 化        | CloudFront（HTTPS）                     | CloudFront（HTTPS）                           |

※ VPC・セキュリティグループ・WAF は CDK では定義していない（Lambda は VPC 非接続）。
導入する場合は `pro-candidate-aws/lib/` に追加すること。

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
