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
├── common/             # 共通ガイド
├── development/        # 開発ドキュメント
│   ├── SCRIPTS.md     # スクリプト解説
│   ├── DEPLOYMENT.md  # デプロイ手順
│   └── TESTING/       # テスト関連
├── operation/          # 運用ドキュメント
├── testing/            # テストドキュメント
└── work_logs/          # 作業日誌
```

## 🔧 主要ドキュメント

### AWS/インフラ

- [aws/README.md](./aws/README.md) - AWSリソース概要
- [aws/CI_CD.md](./aws/CI_CD.md) - CI/CDパイプライン
- [aws/AWS_DEVELOPMENT_WORKFLOW.md](./aws/AWS_DEVELOPMENT_WORKFLOW.md) - AWS開発フロー

### 運用・トラブルシューティング

- [EMERGENCY.md](./EMERGENCY.md) - 緊急時対応手順
- [operation/TROUBLESHOOTING.md](./operation/TROUBLESHOOTING.md) - 問題解決ガイド
- [common/SYSTEM_VERIFICATION_GUIDE.md](./common/SYSTEM_VERIFICATION_GUIDE.md) - システム検証

### 環境設定

- [common/ENV_FILES_GUIDE.md](./common/ENV_FILES_GUIDE.md) - 環境変数設定
- [common/ENVIRONMENT_CONFIGURATION.md](./common/ENVIRONMENT_CONFIGURATION.md) - 環境構成
- [common/DUAL_ENVIRONMENT_STRATEGY.md](./common/DUAL_ENVIRONMENT_STRATEGY.md) - dev/prod環境戦略

### 作業履歴

- [work_logs/](./work_logs/) - 日次作業記録

## 🌐 環境URL

- **Local**: http://localhost:5173
- **Dev**: https://d3brmn978dqs63.cloudfront.net
- **Prod**: https://dh2yk8y9mj9wl.cloudfront.net

## 📝 更新履歴

詳細は[CHANGELOG.md](../CHANGELOG.md)を参照してください。
