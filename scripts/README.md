# Scripts ディレクトリ

## 概要

このディレクトリには、プロジェクトの開発・運用・保守で使用するスクリプトが含まれています。

## カテゴリ別スクリプト一覧

### 🚀 必須・頻繁に使用するスクリプト

| スクリプト名                     | 用途                             | 使用頻度 |
| -------------------------------- | -------------------------------- | -------- |
| `verify-lambda-environment.sh`   | Lambda環境検証・S3データ更新確認 | 高       |
| `run-e2e-test.sh`                | E2Eテスト実行（環境別）          | 高       |
| `ensure-cognito-admin.sh`        | Cognito admin グループの冪等用意 | 高       |
| `get-e2e-env.sh`                 | E2E環境変数取得                  | 中       |
| `build-e2e.sh`                   | E2E用ビルド                      | 中       |
| `serve-e2e-reports.js`           | E2Eレポート配信サーバー          | 中       |
| `cleanup-dependabot-branches.sh` | Dependabotブランチ整理           | 中       |
| `pre-deploy-check.js`            | デプロイ前チェック               | 中       |

### 🔧 AWS管理・最適化

| スクリプト名                    | 用途                   | 状態 |
| ------------------------------- | ---------------------- | ---- |
| `aws-free-tier-optimization.sh` | 無料枠最適化           | 現役 |
| `cloudwatch-optimize.sh`        | CloudWatch最適化       | 現役 |
| `aws-health-monitor.js`         | AWSヘルスモニター      | 現役 |
| `fix-spa-settings.sh`           | SPA設定修正            | 保留 |
| `verify-s3-website-config.sh`   | S3ウェブサイト設定確認 | 現役 |

### 🧪 テスト・品質管理

| スクリプト名            | 用途               | 状態 |
| ----------------------- | ------------------ | ---- |
| `quality-gate-check.js` | 品質ゲートチェック | 現役 |

### 🔍 experimental（実験的）

| スクリプト名                      | 用途          | 状態 |
| --------------------------------- | ------------- | ---- |
| `playwright-er-diagram-to-pdf.js` | ER図のPDF出力 | 実験 |

### 🛠️ 一括修正・セットアップ

| スクリプト名               | 用途                            | 状態 |
| -------------------------- | ------------------------------- | ---- |
| `replace-console-logs.sh`  | console 出力の logger 置換      | 随時 |
| `fix-logger-imports.sh`    | logger import の修正            | 随時 |
| `aws/setup-github-oidc.sh` | GitHub Actions 用 OIDC 初期設定 | 初回 |

### 📦 整理済み

重複・一時的・未使用だったスクリプト（SonarQube 関連の重複、一度きりの AWS 設定スクリプト、
Gemini/MCP クライアントなど約30個）は削除済み。過去の一括処理スクリプトは `scripts/old/` に退避してある。

## 使用方法

### Lambda環境検証

```bash
scripts/verify-lambda-environment.sh dev
scripts/verify-lambda-environment.sh prod
```

### E2Eテスト実行

E2E は実ログイン・実トークン方式のため、Cognito の認証情報が要る。
認証情報は Doppler（`e2e_dev` / `e2e_prod`）にあるので、通常は `doppler run` を前置する
`pnpm run test:e2e:*` から実行する。

```bash
pnpm run test:e2e:dev             # 推奨（doppler run 経由）
pnpm run test:e2e:prod

# 環境変数を自前で用意済みの場合のみ直接実行
scripts/run-e2e-test.sh dev
scripts/run-e2e-test.sh prod --headed
```

### 品質チェック

```bash
pnpm run sonar
```

### Cognito admin グループの用意

admin グループは CDK 管理外のため、このスクリプトで冪等に用意する
（CDK で `AWS::Cognito::UserPoolGroup` を作るとスタック全体がデプロイ不能になるため）。
手順の詳細は `docs/aws/COGNITO_ADMIN_SETUP.md` を参照。

```bash
scripts/ensure-cognito-admin.sh dev
scripts/ensure-cognito-admin.sh prod
```
