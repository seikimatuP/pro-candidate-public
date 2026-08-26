# AWS 環境専用ドキュメント

AWS Lambda、S3、CloudWatch、CDK など AWS サービス関連の技術文書です。

## 📚 主要文書

### 🏗️ 構成・リソース

- [AWS アーキテクチャ構成図](AWS_ARCHITECTURE_DIAGRAM.md) - 全体構成とエンドポイント別の認証要件
- [AWS リソース一覧](AWS_RESOURCE_LIST.md) - dev/prod のリソース名・認証・セキュリティ設定

### 🛠️ 運用・設定

- [AWS 開発ワークフロー](AWS_DEVELOPMENT_WORKFLOW.md) - デプロイ・テスト・運用の手順
- [AWS 設定ファイル更新ガイド](AWS_CONFIG_UPDATE_GUIDE.md) - S3 設定ファイル更新手順 (aws-scraping-config.json)
- [CI/CD パイプライン全体概要](CI_CD.md) - 全ワークフローとトリガー・トラブルシューティング
- [Enhanced ワークフローガイド](ENHANCED_WORKFLOW_GUIDE.md) - `deploy-infra.yml` の 5-jobs 構成詳細
- [GitHub Secrets 設定](GITHUB_SECRETS_SETUP.md) - CI/CD 環境設定手順（PassRoleエラー対処法つき）

### 🔐 認証・認可

- [Cognito 管理者セットアップ](COGNITO_ADMIN_SETUP.md) - admin グループの用意・二重防御の仕組み

### 📋 監視・トラブルシューティング

- [プロダクション監視設定](PRODUCTION_MONITORING_SETUP.md) - CloudWatch 24 時間監視体制
- [CloudWatch ダッシュボード利用ガイド](AWS_CLOUDWATCH_DASHBOARD_GUIDE.md) - ウィジェットの見方・アラート
- [Lambda invoke トラブルシューティング](AWS_LAMBDA_INVOKE_TROUBLESHOOTING.md) - ペイロード文字化け対処
- [S3 SPA トラブルシューティング](S3_SPA_TROUBLESHOOTING.md) - SPA 直接アクセスの 404 対処
- [SPA CDK Custom Resource](SPA_CDK_CUSTOM_RESOURCE.md) - SPA 設定自動化の設計案

## 🎯 運用状況

**AWS 環境**: ✅ 完全運用開始済み (dev・prod 両環境)  
**公開方針**: ✅ 実名一覧は非公開（Cognito ログイン + `admin` グループ必須。dev/prod とも）  
**公開 API**: `GET /health` `GET /statistics` `GET /schools` `GET /years/available` の 4 本のみ  
**設定管理**: ✅ S3 ベース外部化・ハードコード解消完了  
**監視体制**: ✅ CloudWatch 24 時間監視  
**CI/CD**: ✅ GitHub Actions Enhanced自動デプロイ（5-jobs・E2E・ロールバック・PR統合）  
**コスト**: ✅ 月額$0.50（98%削減達成・完全無料枠化）
