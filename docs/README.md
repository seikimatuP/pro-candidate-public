# 📚 プロジェクトドキュメント

プロ野球候補選手データ収集・分析ツールのドキュメントです。

## 🚀 クイックスタート

### 初期セットアップ

- [QUICK_START.md](./QUICK_START.md) - 5分でプロジェクトを開始
- [INTRODUCTION.md](./INTRODUCTION.md) - システム概要と基本概念
- [ARCHITECTURE.md](./ARCHITECTURE.md) - アーキテクチャ詳細

### 開発作業

- [WORKFLOWS.md](./WORKFLOWS.md) - 日常的な作業フロー
- [development/SCRIPTS.md](./development/SCRIPTS.md) - スクリプト一覧
- [development/DEPLOYMENT.md](./development/DEPLOYMENT.md) - デプロイ手順
- [development/TESTING/E2E_TESTING.md](./development/TESTING/E2E_TESTING.md) - E2Eテスト

## 📂 ドキュメント構造

```
docs/
├── aws/                # AWS関連ドキュメント
├── cicd/               # CI/CD通知設定
├── common/             # 共通ガイド
├── development/        # 開発ドキュメント
│   ├── SCRIPTS.md     # スクリプト解説
│   ├── DEPLOYMENT.md  # デプロイ手順
│   └── TESTING/       # テスト関連
├── diagrams/           # 図表
├── old/                # アーカイブ
├── operation/          # 運用ドキュメント
└── testing/            # テストドキュメント
```

全ファイルの一覧は [DOCUMENT_INDEX.md](./DOCUMENT_INDEX.md) を参照。

## 🔧 主要ドキュメント

### AWS/インフラ

- [aws/README.md](./aws/README.md) - AWSリソース概要
- [aws/CI_CD.md](./aws/CI_CD.md) - CI/CDパイプライン
- [aws/AWS_DEVELOPMENT_WORKFLOW.md](./aws/AWS_DEVELOPMENT_WORKFLOW.md) - AWS開発フロー

### 運用・トラブルシューティング

- [EMERGENCY.md](./EMERGENCY.md) - 緊急時対応手順
- [operation/TROUBLESHOOTING.md](./operation/TROUBLESHOOTING.md) - 問題解決ガイド
- [common/SYSTEM_VERIFICATION_GUIDE.md](./common/SYSTEM_VERIFICATION_GUIDE.md) - システム検証

### セキュリティ・公開範囲・法務

実名一覧は一般公開していない。未ログインで見られるのはトップの集計ダッシュボードのみで、
認証不要のAPIは `GET /health` `GET /statistics` `GET /schools` `GET /years/available` の4本だけ。
それ以外は Cognito 認証＋`admin` グループが必要（dev / prod とも有効）。詳細は [ARCHITECTURE.md](./ARCHITECTURE.md) の「公開範囲」を参照。

- [aws/COGNITO_ADMIN_SETUP.md](./aws/COGNITO_ADMIN_SETUP.md) - admin グループ・管理者アカウントの整備
- [PRIVACY_REQUEST_RUNBOOK.md](./PRIVACY_REQUEST_RUNBOOK.md) - 開示・削除等の請求対応
- [../SECURITY.md](../SECURITY.md) / [../PRIVACY_POLICY.md](../PRIVACY_POLICY.md) / [../SCRAPING_POLICY.md](../SCRAPING_POLICY.md)

### 環境設定

- [common/ENV_FILES_GUIDE.md](./common/ENV_FILES_GUIDE.md) - 環境変数設定
- [common/ENVIRONMENT_CONFIGURATION.md](./common/ENVIRONMENT_CONFIGURATION.md) - 環境構成
- [common/DUAL_ENVIRONMENT_STRATEGY.md](./common/DUAL_ENVIRONMENT_STRATEGY.md) - dev/prod環境戦略

## 🌐 環境URL

- **Local**: http://localhost:5173
- **Dev**: https://d3brmn978dqs63.cloudfront.net
- **Prod**: https://dh2yk8y9mj9wl.cloudfront.net

## 📝 更新履歴

詳細は[CHANGELOG.md](../CHANGELOG.md)を参照してください。
