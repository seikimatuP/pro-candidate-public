# AWS 環境専用ドキュメント

AWS Lambda、S3、CloudWatch、CDK など AWS サービス関連の技術文書です。

## 📚 主要文書

### 🛠️ 運用・設定

- [AWS インフラストラクチャ文書](AWS_INFRASTRUCTURE_DOCUMENTATION.md) - **AWS 運用の完全ガイド** (1,100+ 行)
- [AWS 設定ファイル更新ガイド](AWS_CONFIG_UPDATE_GUIDE.md) - **S3 設定ファイル更新手順** (aws-scraping-config.json)
- [CI/CD ガイド](AWS_CICD_GUIDE.md) - **GitHub Actions 自動デプロイ手順**（IAM権限エラー対処法追加）
- [コスト最適化ガイド](AWS_COST_OPTIMIZATION_COMPLETE.md) - 月額$0 達成戦略
- [GitHub Actions AWS認証設定](GITHUB_ACTIONS_AWS_SETUP.md) - **OIDC認証設定ガイド**
- [GitHub Actions トラブルシューティング](GITHUB_ACTIONS_TROUBLESHOOTING.md) - **デプロイエラー対処法完全版**
- [Enhanced ワークフローガイド](ENHANCED_WORKFLOW_GUIDE.md) - **3-jobs構成・高度機能・PR統合完全版**
- [AWS設定ガイド](../setup/AWS_SETUP.md) - **AWS環境設定とアクセスキー設定**

### 📋 完了記録・監視

- [AWS タスク完了記録](AWS_GAS_TASK_CLASSIFICATION.md) - **100%タスク完了記録** (10/10 タスク)
- [テスト環境レポート](AWS_ENVIRONMENT_TEST_REPORT.md) - テスト結果・96.2%成功率
- [プロダクション監視設定](PRODUCTION_MONITORING_SETUP.md) - CloudWatch 24 時間監視体制
- [GitHub Secrets 設定](GITHUB_SECRETS_SETUP.md) - **CI/CD 環境設定手順**（PassRoleエラー対処法追加）

### 📁 アーカイブ

- `aws-migration/` - AWS 移行完了記録（11 ファイル）
- `phase-completion-reports/` - フェーズ別完了報告（10 ファイル）

## 🎯 運用状況

**AWS 環境**: ✅ 完全運用開始済み (dev・prod 両環境)  
**設定管理**: ✅ S3 ベース外部化・ハードコード解消完了  
**監視体制**: ✅ CloudWatch 24 時間監視  
**CI/CD**: ✅ GitHub Actions Enhanced自動デプロイ（3-jobs・ロールバック・PR統合・高度機能完備）  
**コスト**: ✅ 月額$0.50（98%削減達成・完全無料枠化）  
**運用効率**: ✅ 設定変更ダウンタイム 0 秒・簡易更新ツール
