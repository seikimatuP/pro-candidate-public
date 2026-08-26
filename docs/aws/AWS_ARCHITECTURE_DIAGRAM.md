# プロ野球志望届データ収集ツール - AWS アーキテクチャ構成図

> **図は [`docs/architecture/aws-architecture.drawio`](../architecture/aws-architecture.drawio) が正**（唯一の正本）。
> 構成が変わったらまずそちらを更新すること。本ドキュメント内の図は補助的な説明であり、細部は drawio 側を参照する。

対象リージョンは `ap-northeast-1`。スタックは `ProBaseballStack-dev` と `ProBaseballStack-prod` の
2本を同一コードから生成する（`pro-candidate-aws/bin/pro-candidate-aws.ts`）。
以下の `${stage}` は `dev` または `prod` に展開される。

## 全体像

```
【閲覧フロー】
Browser ─┬─► CloudFront (OAI) ──► S3: pro-candidate-frontend-${stage}
         │                        React + TypeScript + Vite
         │
         └─► API Gateway (REST) ──► Lambda: api ──► S3: pro-candidate-data-${stage}
             Cognito authorizer      128MB / 30s     JSON ファイル群

【収集フロー】
EventBridge ──► Lambda: scraping ──► 外部サイト（高校生・大学生の志望届ページ）
prod のみ       512MB / 5分              │
平日 17:30 JST                           ▼
                                  Lambda: dataProcessing ──► S3: pro-candidate-data-${stage}
                                  128MB / 3分

【常時ウォーム】
EventBridge ──► Lambda: warmup
5分ごと         128MB / 60s
dev・prod とも
```

## Lambda 関数（4本・すべて Node.js 22.x）

| 関数名                             | メモリ | タイムアウト | 役割                       |
| ---------------------------------- | ------ | ------------ | -------------------------- |
| `pro-baseball-api-${stage}`        | 128MB  | 30 秒        | REST API のバックエンド    |
| `pro-baseball-scraping-${stage}`   | 512MB  | 5 分         | 外部サイトからのデータ収集 |
| `pro-baseball-processing-${stage}` | 128MB  | 3 分         | 収集データの整形・集計     |
| Warmup 関数（関数名は自動採番）    | 128MB  | 60 秒        | コールドスタート抑制       |

`reservedConcurrentExecutions` は未設定（アカウント側の制約でデプロイできないため）。

## API Gateway

REST API + CORS。Cognito authorizer は **dev / prod とも有効**。

| エンドポイント                                                             | 認証                       |
| -------------------------------------------------------------------------- | -------------------------- |
| `GET /health` `GET /statistics` `GET /schools` `GET /years/available`      | 不要（公開）               |
| `/players` 系・`/schools/{school}/players`・`/scraping/*`・`ANY /{proxy+}` | Cognito + `admin` グループ |

実名（氏名）を含むレスポンスは全て管理者限定。`admin` の判定は authorizer に加えて
Lambda 側（`lambda/api.ts`）でも `cognito:groups` を検証する二重防御になっており、
`admin` クレームが無ければ 403 を返す（fail closed）。

## EventBridge ルール

| ルール                 | 環境      | スケジュール                            | 既定 |
| ---------------------- | --------- | --------------------------------------- | ---- |
| スクレイピング本番実行 | prod のみ | 平日 17:30 JST（cron UTC 8:30 MON-FRI） | 有効 |
| Warmup                 | dev・prod | 5 分ごと                                | 有効 |
| テスト実行（5 分間隔） | dev のみ  | 5 分ごと                                | 無効 |
| 当日単発テスト         | dev のみ  | synth 時点の日付で 1 回                 | 無効 |

dev に定期スクレイピングを置いていないのは、相手サイトへ二重にアクセスしないため。

## データストア

- **データ用 S3**: `pro-candidate-data-${stage}`（JSON ファイル）
  - prod は既存バケットを参照し、暗号化・パブリックアクセスブロック・バージョニングを
    Custom Resource で強制。dev は CDK が新規作成する
- **フロント用 S3**: `pro-candidate-frontend-${stage}`
- 配信は CloudFront 経由。オリジンアクセスは **OAI**（OAC ではない）

## セキュリティ・監視

- **Cognito**: User Pool による認証（dev / prod とも有効）。セルフサインアップは無効で、
  アカウントは運営者が招待・作成する。`admin` グループは CDK 管理外で、
  `scripts/ensure-cognito-admin.sh` が冪等に用意する（[COGNITO_ADMIN_SETUP.md](COGNITO_ADMIN_SETUP.md)）
- **IAM**: 最小権限
- **CloudWatch アラーム**: 2 種類
  - `Critical-Lambda-Errors-${stage}-cdk`（dev・prod）: 3 関数の合算エラーが 5 分で 10 件超えたら SNS 通知
  - `lambda-free-tier-usage-alert-${stage}-cdk`（prod のみ）: Lambda 呼び出しが月 100 万件の 80% に達したら通知
- **Budget**: 月額 **$20**（`MONTHLY_BUDGET_USD`）。アカウント全体が対象のため **prod スタックのみ**が作成する
  （dev/prod 双方で作ると二重通知になるため）。実績ベースで 50% / 80% / 100% にメール通知

## CDK Construct 構成

`pro-candidate-aws/lib/pro-candidate-aws-stack.ts` が組み立てる Construct は 10 個。

| Construct                 | 備考                            |
| ------------------------- | ------------------------------- |
| `S3Construct`             | データ用バケット                |
| `LambdaConstruct`         | 業務 Lambda 3 本 + スケジュール |
| `CognitoConstruct`        | User Pool（dev/prod とも）      |
| `ApiGatewayConstruct`     | REST API + authorizer           |
| `SimpleFrontendConstruct` | フロント用バケット              |
| `CloudFrontConstruct`     | OAI 経由の配信                  |
| `MonitoringConstruct`     | CloudWatch アラーム             |
| `BudgetConstruct`         | prod のみ                       |
| `CostOptimizedConstruct`  | コスト最適化設定                |
| `WarmupConstruct`         | Warmup Lambda + ルール          |

## 技術スタック

| Layer          | Technology                | Purpose                |
| -------------- | ------------------------- | ---------------------- |
| Frontend       | React + TypeScript + Vite | User Interface         |
| API            | AWS API Gateway + Lambda  | RESTful API            |
| Auth           | Amazon Cognito            | 認証・admin 判定       |
| Data           | S3 + JSON                 | Data Storage           |
| Infrastructure | AWS CDK (TypeScript)      | Infrastructure as Code |
| Monitoring     | CloudWatch + AWS Budgets  | Observability          |
| Security       | IAM Roles + Policies      | Access Control         |

## 環境ごとの差分まとめ

| 項目                    | dev                          | prod               |
| ----------------------- | ---------------------------- | ------------------ |
| Cognito authorizer      | 有効                         | 有効               |
| 定期スクレイピング      | なし（テスト用ルールは無効） | 平日 17:30 JST     |
| Warmup（5 分ごと）      | 有効                         | 有効               |
| CloudWatch アラーム     | 1 件                         | 2 件               |
| Budget                  | なし                         | $20/月             |
| データ用・フロント用 S3 | CDK が新規作成               | 既存バケットを参照 |
