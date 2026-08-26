# ドキュメント完全インデックス

## 統計

- **現役ドキュメント数**: 47ファイル
- **アーカイブ**: 11ファイル（`docs/old/`）
- **最終更新**: 2026-08-23

## カテゴリ別ドキュメント一覧

### 1. ルートレベル（9ファイル）

| ドキュメント                                                             | 説明                           | 重要度 |
| ------------------------------------------------------------------------ | ------------------------------ | ------ |
| [`README.md`](./README.md)                                               | ドキュメントインデックス       | \*\*\* |
| [`DOCUMENT_INDEX.md`](./DOCUMENT_INDEX.md)                               | ドキュメント完全インデックス   | \*\*   |
| [`QUICK_START.md`](./QUICK_START.md)                                     | 5分クイックスタート            | \*\*\* |
| [`INTRODUCTION.md`](./INTRODUCTION.md)                                   | システム概要・基本概念         | \*\*\* |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)                                   | アーキテクチャ詳細             | \*\*\* |
| [`WORKFLOWS.md`](./WORKFLOWS.md)                                         | 日常作業フロー                 | \*\*\* |
| [`EMERGENCY.md`](./EMERGENCY.md)                                         | 緊急時対応手順                 | \*\*\* |
| [`PRIVACY_REQUEST_RUNBOOK.md`](./PRIVACY_REQUEST_RUNBOOK.md)             | 個人情報請求対応ランブック     | \*\*\* |
| [`VSCODE_AUTO_STARTUP.md`](./VSCODE_AUTO_STARTUP.md)                     | VSCode自動起動設定             | \*\*   |

### 2. AWS関連（11ファイル）

| ドキュメント                                                                             | 説明               | 状態 |
| ---------------------------------------------------------------------------------------- | ------------------ | ---- |
| [`aws/README.md`](./aws/README.md)                                                       | AWSリソース概要    | 現役 |
| [`aws/CI_CD.md`](./aws/CI_CD.md)                                                         | CI/CDパイプライン  | 現役 |
| [`aws/AWS_DEVELOPMENT_WORKFLOW.md`](./aws/AWS_DEVELOPMENT_WORKFLOW.md)                   | AWS開発フロー      | 現役 |
| [`aws/AWS_CLOUDWATCH_DASHBOARD_GUIDE.md`](./aws/AWS_CLOUDWATCH_DASHBOARD_GUIDE.md)       | CloudWatch監視設定 | 現役 |
| [`aws/AWS_LAMBDA_INVOKE_TROUBLESHOOTING.md`](./aws/AWS_LAMBDA_INVOKE_TROUBLESHOOTING.md) | Lambda実行トラブル | 現役 |
| [`aws/AWS_RESOURCE_LIST.md`](./aws/AWS_RESOURCE_LIST.md)                                 | リソース一覧       | 現役 |
| [`aws/AWS_CONFIG_UPDATE_GUIDE.md`](./aws/AWS_CONFIG_UPDATE_GUIDE.md)                     | 設定更新ガイド     | 現役 |
| [`aws/AWS_ARCHITECTURE_DIAGRAM.md`](./aws/AWS_ARCHITECTURE_DIAGRAM.md)                   | アーキテクチャ図   | 現役 |
| [`aws/SPA_CDK_CUSTOM_RESOURCE.md`](./aws/SPA_CDK_CUSTOM_RESOURCE.md)                     | SPA設定            | 現役 |
| [`aws/S3_SPA_TROUBLESHOOTING.md`](./aws/S3_SPA_TROUBLESHOOTING.md)                       | S3 SPAトラブル     | 現役 |
| [`aws/COGNITO_ADMIN_SETUP.md`](./aws/COGNITO_ADMIN_SETUP.md)                             | admin グループ整備 | 現役 |

### 3. 共通ガイド（12ファイル）

| ドキュメント                                                                         | 説明                 | 用途   |
| ------------------------------------------------------------------------------------ | -------------------- | ------ |
| [`common/ENV_FILES_GUIDE.md`](./common/ENV_FILES_GUIDE.md)                           | 環境変数設定         | 設定   |
| [`common/ENVIRONMENT_CONFIGURATION.md`](./common/ENVIRONMENT_CONFIGURATION.md)       | 環境構成             | 設定   |
| [`common/DUAL_ENVIRONMENT_STRATEGY.md`](./common/DUAL_ENVIRONMENT_STRATEGY.md)       | dev/prod戦略         | 設計   |
| [`common/SYSTEM_VERIFICATION_GUIDE.md`](./common/SYSTEM_VERIFICATION_GUIDE.md)       | システム検証         | 検証   |
| [`common/CONFIG_MANAGEMENT_GUIDE.md`](./common/CONFIG_MANAGEMENT_GUIDE.md)           | 設定管理             | 管理   |
| [`common/DEPENDENCY_MANAGEMENT_GUIDE.md`](./common/DEPENDENCY_MANAGEMENT_GUIDE.md)   | 依存関係管理         | 管理   |
| [`common/GITHUB_RELEASE_GUIDE.md`](./common/GITHUB_RELEASE_GUIDE.md)                 | リリース手順         | 運用   |
| [`common/FEATURE_SPECIFICATIONS.md`](./common/FEATURE_SPECIFICATIONS.md)             | 機能仕様             | 仕様   |
| [`common/VALIDATION_GUIDE.md`](./common/VALIDATION_GUIDE.md)                         | バリデーション       | 品質   |
| [`common/SPA_ROUTING_GUIDE.md`](./common/SPA_ROUTING_GUIDE.md)                       | SPAルーティング      | 設計   |
| [`common/TEST_SUITE_DISTINCTION_GUIDE.md`](./common/TEST_SUITE_DISTINCTION_GUIDE.md) | テスト種別の使い分け | テスト |
| [`common/DEPENDABOT_AUTOMERGE_GUIDE.md`](./common/DEPENDABOT_AUTOMERGE_GUIDE.md)     | Dependabot自動マージ | 運用   |

### 4. 開発ドキュメント（6ファイル）

| ドキュメント                                                                           | 説明                    | 重要度 |
| -------------------------------------------------------------------------------------- | ----------------------- | ------ |
| [`development/SCRIPTS.md`](./development/SCRIPTS.md)                                   | スクリプト解説          | \*\*\* |
| [`development/DEPLOYMENT.md`](./development/DEPLOYMENT.md)                             | デプロイ手順            | \*\*\* |
| [`development/TESTING/E2E_TESTING.md`](./development/TESTING/E2E_TESTING.md)           | E2Eテスト               | \*\*\* |
| [`development/DOPPLER_SETUP.md`](./development/DOPPLER_SETUP.md)                       | Doppler環境変数管理     | \*\*\* |
| [`development/baseball-features/README.md`](./development/baseball-features/README.md) | 野球機能仕様            | \*\*   |
| [`development/UI_UX_REVIEW_COMMANDS.md`](./development/UI_UX_REVIEW_COMMANDS.md)       | UI/UXレビュー用コマンド | \*\*   |

### 5. セキュリティ・法務（リポジトリルート）

`docs/security/` は現存しない。認証・公開範囲・個人情報まわりの正はリポジトリルートの以下を参照する。

| ドキュメント                                                 | 説明                           | 用途         |
| ------------------------------------------------------------ | ------------------------------ | ------------ |
| [`SECURITY.md`](../SECURITY.md)                              | セキュリティ方針               | セキュリティ |
| [`PRIVACY_POLICY.md`](../PRIVACY_POLICY.md)                  | プライバシーポリシー           | 法務         |
| [`SCRAPING_POLICY.md`](../SCRAPING_POLICY.md)                | スクレイピング方針・除外リスト | 法務         |
| [`aws/COGNITO_ADMIN_SETUP.md`](./aws/COGNITO_ADMIN_SETUP.md) | admin グループの整備手順       | セキュリティ |

### 6. 運用・その他（8ファイル）

| ドキュメント                                                                   | 説明                                                | 用途     |
| ------------------------------------------------------------------------------ | --------------------------------------------------- | -------- |
| [`operation/TROUBLESHOOTING.md`](./operation/TROUBLESHOOTING.md)               | トラブルシューティング                              | 問題解決 |
| [`testing/README.md`](./testing/README.md)                                     | テスト概要                                          | テスト   |
| [`diagrams/pro-baseball-er-diagram.md`](./diagrams/pro-baseball-er-diagram.md) | ER図                                                | 設計     |
| [`aws/ENHANCED_WORKFLOW_GUIDE.md`](./aws/ENHANCED_WORKFLOW_GUIDE.md)           | 拡張ワークフロー                                    | 運用     |
| [`aws/GITHUB_SECRETS_SETUP.md`](./aws/GITHUB_SECRETS_SETUP.md)                 | GitHub Secrets設定                                  | 設定     |
| [`aws/PRODUCTION_MONITORING_SETUP.md`](./aws/PRODUCTION_MONITORING_SETUP.md)   | 本番監視設定                                        | 監視     |
| [`cicd/EMAIL_NOTIFICATION_SETUP.md`](./cicd/EMAIL_NOTIFICATION_SETUP.md)       | CI/CDメール通知設定                                 | 運用     |

### 7. スクリプトドキュメント

| ドキュメント                                | 説明                     | 場所     |
| ------------------------------------------- | ------------------------ | -------- |
| [`scripts/README.md`](../scripts/README.md) | スクリプト一覧・使用方法 | scripts/ |

### 8. アーカイブ（`docs/old/` -- 11ファイル）

完了済みの移行計画・監査レポート・リファクタリング指示書など。履歴参照用に保持。

| ドキュメント                         | 元の用途                         | アーカイブ理由                       |
| ------------------------------------ | -------------------------------- | ------------------------------------ |
| `refactor-instructions.md`           | Phase 0-6 リファクタリング指示書 | 全Phase完了                          |
| `refactor-completion-report.md`      | リファクタリング完了報告         | 全Phase完了                          |
| `aws-sdk-v3-migration-plan.md`       | AWS SDK v3 移行計画              | 移行完了・不要依存削除済み           |
| `ESLINT_9_MIGRATION_PLAN.md`         | ESLint 9 移行計画                | ESLint 10+ に移行済み                |
| `ESLINT_9_MIGRATION_COMPLETE.md`     | ESLint 9 移行完了報告            | 同上                                 |
| `PROJECT_CLEANUP_RECOMMENDATIONS.md` | クリーンアップ推奨事項           | リファクタリングで大部分対処済み     |
| `audit-report-20260206.md`           | フロントエンド品質監査           | リファクタリング前のスナップショット |
| `IMPROVEMENT_PROPOSALS.md`           | 改善提案書                       | v1.4.2時点の古い数値・提案           |
| `TEST_INVENTORY.md`                  | テスト一覧                       | 現在のテスト構成と乖離               |
| `AWS_ENVIRONMENT_TEST_REPORT.md`     | 環境テストレポート               | 2025-06-14時点の古いレポート         |
| `MUI_V9_MIGRATION_PLAN.md`           | MUI v9 移行計画                  | 移行不要と判断済み                   |

## クイックアクセス

### 初めての方

1. [QUICK_START.md](./QUICK_START.md)
2. [INTRODUCTION.md](./INTRODUCTION.md)
3. [WORKFLOWS.md](./WORKFLOWS.md)

### 開発者向け

1. [development/SCRIPTS.md](./development/SCRIPTS.md)
2. [development/DEPLOYMENT.md](./development/DEPLOYMENT.md)
3. [development/TESTING/E2E_TESTING.md](./development/TESTING/E2E_TESTING.md)

### 運用担当者向け

1. [EMERGENCY.md](./EMERGENCY.md)
2. [operation/TROUBLESHOOTING.md](./operation/TROUBLESHOOTING.md)
3. [aws/CI_CD.md](./aws/CI_CD.md)

### AWS管理者向け

1. [aws/README.md](./aws/README.md)
2. [aws/AWS_DEVELOPMENT_WORKFLOW.md](./aws/AWS_DEVELOPMENT_WORKFLOW.md)
3. [aws/AWS_CLOUDWATCH_DASHBOARD_GUIDE.md](./aws/AWS_CLOUDWATCH_DASHBOARD_GUIDE.md)

## メンテナンス履歴

- **2026-08-23**: 実態に合わせてファイル一覧・件数を更新。存在しない `security/` の項目を整理し、公開範囲の方針転換（実名一覧を admin 限定化）を反映
- **2026-07-29**: 完了済み11ドキュメントを `docs/old/` にアーカイブ、インデックス更新
- **2025-09-14**: ドキュメント整理実施（19ファイル削除、重複解消）
- **2025-06-29**: 3層アーキテクチャ実装
- **2025-06-25**: スクリプトガイド表形式化
