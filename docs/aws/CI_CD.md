# CI/CD パイプライン全体概要

このドキュメントでは、プロ野球候補選手データ収集ツールで実施している**すべてのCI/CDパイプライン**について説明します。

## 🎯 実施中のCI/CDパイプライン一覧

### ✅ アクティブなワークフロー（稼働中）

| **ワークフロー名**                | **ファイル**            | **役割**                   | **トリガー**                                  |
| --------------------------------- | ----------------------- | -------------------------- | --------------------------------------------- |
| **AWS CDK Deploy (Enhanced)**     | `aws-deploy.yml`        | **インフラデプロイ**       | push(develop), **GitHub Release**, 手動       |
| **Frontend Deploy (Optimized)**   | `frontend-deploy.yml`   | **フロントエンドデプロイ** | push(frontend/\*\*), **GitHub Release**, 手動 |
| **AWS Environment Quality Check** | `aws-quality-check.yml` | **品質チェック**           | push, PR作成                                  |
| **Dependency Security Check**     | `dependency-check.yml`  | **セキュリティ監査**       | 週次, 手動                                    |

### ❌ 無効化されたワークフロー（設計完了・準備済み）

| **ワークフロー名**      | **ファイル**                     | **役割**            | **状態**                 |
| ----------------------- | -------------------------------- | ------------------- | ------------------------ |
| **GAS CI/CD Pipeline**  | `ci-cd.yml.disabled`             | **GAS自動デプロイ** | 無効化（AWS移行のため）  |
| **AWS Deploy Simple**   | `aws-deploy-simple.yml.disabled` | **基本AWS Deploy**  | 削除（Enhanced版に統合） |
| **Code Quality Report** | `static-analysis-report.yml`     | **品質レポート**    | 無効化（リソース削減）   |

## 🏗️ アーキテクチャ変更履歴（2025-06-09完了）

**Google Apps Script → AWS サーバーレスアーキテクチャへの完全移行**

- **実行環境**: Google Apps Script → AWS Lambda (Node.js 18.x)
- **デプロイ方式**: Clasp → AWS CDK (TypeScript)
- **認証方式**: Simple Auth（IAMユーザー＋アクセスキー）
- **ワークフロー**: Enhanced 3-jobs構成（環境判定・デプロイ・ロールバック）
- **品質管理**: ESLint sonarjs/no-duplicate-string完全準拠

## 目次

1. [アクティブなワークフロー詳細](#アクティブなワークフロー詳細)
2. [無効化されたワークフロー](#無効化されたワークフロー)
3. [AWS Enhanced ワークフロー](#aws-enhanced-ワークフロー)
4. [品質管理・セキュリティ](#品質管理セキュリティ)
5. [環境変数と機密情報](#環境変数と機密情報)
6. [運用・管理](#運用管理)
7. [トラブルシューティング](#トラブルシューティング)

## アクティブなワークフロー詳細

### 1. AWS CDK Deploy (Enhanced) - インフラデプロイパイプライン

**ファイル**: `.github/workflows/aws-deploy.yml`  
**状態**: ✅ **稼働中** - Enhanced Simple Auth方式

**機能概要**:

- 🎯 **3-jobs構成**: 環境判定・メインデプロイ・ロールバック
- 🚀 **自動環境切り替え**: push→dev, release→prod
- 🏗️ **インフラ専用**: CDKによるAWSリソースデプロイ（Lambda, API Gateway, S3等）
- 🛡️ **ロールバック機能**: prod失敗時自動実行
- 📊 **PR統合**: デプロイ結果自動コメント

**トリガー**:

- `develop`ブランチpush（`pro-candidate-aws/**`変更時）→ **dev環境デプロイ**
- **GitHub Release作成**（published）→ **prod環境自動デプロイ** 🆕
- 手動実行（環境選択可能: dev/prod）

**注意**: Dockerは不要（Lambda Code.fromAsset()が単純なディレクトリアップロードを使用）

### 2. Frontend Deploy - フロントエンドデプロイパイプライン

**ファイル**: `.github/workflows/frontend-deploy.yml`  
**状態**: ✅ **稼働中** - S3静的サイトホスティング

**機能概要**:

- 🎨 **フロントエンド専用**: React Vite + S3デプロイ
- 🔄 **環境変数管理**: 環境別.envファイルコピー方式（.env.dev/.env.prod）
- 📡 **動的API URL更新**: CloudFormationから最新値取得
- 🚀 **高速デプロイ**: 3-5分で完了（インフラと独立）
- ✅ **検証機能**: CloudFormation出力値の必須チェック

**トリガー**:

- `develop`ブランチpush（`frontend/**`変更時）→ **対応環境デプロイ**
- 手動実行（環境選択可能: dev/prod）

**環境変数管理**:

```bash
# dev環境: .env.dev → .env.production
# prod環境: .env.prod → .env.production
# API URLのみ動的に更新（sed使用）
```

### 3. AWS Environment Quality Check - 品質保証

**ファイル**: `.github/workflows/aws-quality-check.yml`  
**状態**: ✅ **稼働中** - TypeScript・ESLint・テスト自動実行

**機能概要**:

- 🔍 **TypeScript コンパイルチェック**
- 📝 **ESLint品質チェック**（Lambda JS除外・TSConfig競合回避）
- 🧪 **AWS環境テスト**（continue-on-error対応）
- 🔒 **セキュリティスキャン**

**トリガー**:

- `develop`ブランチpush（`src/**`, `pro-candidate-aws/**`等）
- Pull Request作成・更新

### 3. Dependency Security Check - セキュリティ監査

**ファイル**: `.github/workflows/dependency-check.yml`  
**状態**: ✅ **稼働中** - 週次自動実行

**機能概要**:

- 📦 **npm audit**: 高・重要度脆弱性チェック
- 📋 **セキュリティレポート生成**: 30日保存
- 🚨 **Critical脆弱性時Issue自動作成**
- 📊 **Root・AWS CDK両方の依存関係監査**

**トリガー**:

- 毎週月曜日 午前9時（JST）自動実行
- 手動実行（workflow_dispatch）

### 4. ~~Code Quality Report - 品質レポート~~ (無効化済み)

**ファイル**: `.github/workflows/static-analysis-report.yml`  
**状態**: ❌ **無効化** - 週次品質レポート機能停止中

**機能概要**:

- 🔍 **Lint・テスト・カバレッジ分析**
- 📊 **SonarQube品質レポート**
- 📧 **週次品質レポートメール送信**
- 📈 **継続的品質監視**

**無効化理由**:

- 定期実行による不要なリソース消費を削減
- 必要時に手動実行可能

**有効化方法**:

```yaml
# .github/workflows/static-analysis-report.yml の schedule セクションをアンコメント
```

## 無効化されたワークフロー

### 1. GAS CI/CD Pipeline - Google Apps Script自動デプロイ

**ファイル**: `.github/workflows/ci-cd.yml.disabled`  
**状態**: ❌ **無効化** - AWS移行により開発・テスト用途のみ

**設計概要**:

- 🔧 **Clasp自動デプロイ**: gas-test/gas-deploy分離設計
- 🎯 **GAS特化**: AWS除外パス設定・TypeScript対応
- 📚 **完全文書化**: docs/gas/GAS_CICD_GUIDE.md完備

**無効化理由**:

- AWS Lambda環境への完全移行完了
- GAS環境は開発・テスト用途での利用想定
- 必要時に簡単に有効化可能（ファイル名変更のみ）

**有効化方法**:

```bash
mv .github/workflows/ci-cd.yml.disabled .github/workflows/ci-cd.yml
```

### 2. AWS Deploy Simple - 基本AWS Deploy

**ファイル**: `aws-deploy-simple.yml.disabled`（削除済み）  
**状態**: ❌ **削除** - Enhanced版に機能統合

**統合経緯**:

- 基本機能はEnhanced版に完全統合
- 3-jobs構成・ロールバック・PR統合等の高度機能追加
- Simple Auth認証方式は継続採用

## 品質管理・セキュリティ

### 🔍 コード品質自動チェック

**実施内容**:

- **TypeScript**: 厳密型チェック・コンパイルエラー検出
- **ESLint**: コード品質・セキュリティルール（sonarjs/no-duplicate-string等）
- **テスト**: ユニットテスト・統合テスト・カバレッジ測定
- **SonarQube**: 包括的静的解析・品質ゲート

### 🛡️ セキュリティ監査

**依存関係監査**:

- npm audit（高・重要度脆弱性）
- パッケージ更新状況確認
- Critical脆弱性検出時のIssue自動作成

**AWS環境セキュリティ**:

- IAM最小権限の原則
- シークレット管理（GitHub Secrets）
- CloudFormationスタック分離（dev/prod）

## AWS Enhanced ワークフロー

### 🚀 3-Jobs構成詳細

#### Job 1: determine-environment

**役割**: デプロイ環境の自動判定

```yaml
環境判定ロジック:
  - workflow_dispatch → 手動選択された環境
  - release → prod環境
  - push → dev環境
```

#### Job 2: aws-deploy

**役割**: メインデプロイ処理

1. TypeScript事前コンパイルチェック
2. AWS Simple Auth認証
3. Lambda依存関係インストール（フルパス使用）
4. CDK TypeScriptビルド
5. CDK Bootstrap確認・Diff生成
6. CDK Deploy実行（Dockerなし）
7. ヘルスチェック・PR自動コメント

#### Job 3: rollback-on-failure

**役割**: prod環境失敗時の緊急対応

- aws-deploy jobが失敗 かつ 対象環境がprod
- 最大10分以内で緊急通知実行

### 📋 機能比較表

| **機能**         | **Basic版（削除済み）** | **Enhanced版（現在）**                         |
| ---------------- | ----------------------- | ---------------------------------------------- |
| **Jobs構成**     | 1 job                   | **3 jobs**（環境判定・デプロイ・ロールバック） |
| **環境判定**     | 固定dev                 | **自動判定**（push→dev, release→prod）         |
| **リリース対応** | ❌                      | ✅ **GitHub Release → prod自動デプロイ**       |
| **CDK Diff**     | ❌                      | ✅ **事前差分確認**                            |
| **PR統合**       | ❌                      | ✅ **デプロイ結果自動コメント**                |
| **ロールバック** | ❌                      | ✅ **prod失敗時自動実行**                      |

## テスト自動化

テストプロセスは以下のステップで構成されています：

1. Node.js環境のセットアップ
2. 依存関係のインストール（`npm ci`）
3. テスト実行（`npm run test:ci`）

テストが失敗した場合、ワークフローは中断され、デプロイは行われません。

## 運用・管理

### 📋 CI/CD実行状況の確認

**GitHub Actions画面**:

```bash
# ワークフロー実行状況確認
gh run list --workflow=aws-deploy.yml
gh run list --workflow=aws-quality-check.yml

# 詳細ログ確認
gh run view <run-id> --log
```

**AWS環境確認**:

- CloudFormationコンソール: スタック状況確認
- Lambda関数: デプロイ成果物確認
- API Gateway: エンドポイント動作確認

### 🚀 デプロイ実行方法

**自動デプロイ（推奨）**:

```bash
# dev環境デプロイ
git push origin develop  # pro-candidate-aws/**変更時のみ

# prod環境デプロイ
gh release create v1.2.3 --title "Version 1.2.3" --notes "Release notes"
```

**手動デプロイ**:

```bash
# GitHub CLI使用
gh workflow run aws-deploy.yml --ref develop -f environment=dev
gh workflow run aws-deploy.yml --ref develop -f environment=prod

# GitHub Actions画面から実行
# Actions > AWS CDK Deploy (Enhanced) > Run workflow
```

### 📊 監視・レポート

**定期実行レポート**:

- **依存関係監査**: 毎週月曜 9:00 JST
- **セキュリティチェック**: Push・PR時

**アーティファクト保存**:

- デプロイ成果物: 30日間
- セキュリティレポート: 30日間
- カバレッジレポート: 7日間

## 環境変数と機密情報

### 必須GitHub Secrets（AWS環境）

CI/CD環境で以下の機密情報をGitHub Secretsとして設定する必要があります：

#### AWS認証情報

- `AWS_ACCESS_KEY_ID`: IAMユーザーのアクセスキー

  - CDKデプロイ用IAMユーザーから取得
  - 必要権限: CloudFormation、Lambda、S3、API Gateway、IAM PassRole

- `AWS_SECRET_ACCESS_KEY`: IAMユーザーのシークレットキー
  - 対応するアクセスキーのシークレット

#### オプション設定

- `SONAR_TOKEN`: SonarQubeの認証トークン（品質分析用）
- `NOTIFICATION_EMAIL`: CI/CD通知の送信先メールアドレス

### IAM権限要件

GitHub Actions用IAMユーザーには以下の権限が必要です：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iam:PassRole", "cloudformation:*", "lambda:*", "s3:*", "apigateway:*"],
      "Resource": "*"
    }
  ]
}
```

詳細な設定手順については以下を参照：

- [GitHub シークレット設定ガイド](./docs/aws/GITHUB_SECRETS_SETUP.md)
- [5分AWS設定ガイド](./docs/aws/SIMPLE_AWS_SETUP.md)

## トラブルシューティング

### 🔧 主要エラー分類と対処法

CI/CDパイプラインで発生する主要なエラーと解決方法：

#### 1. TypeScriptコンパイルエラー

- **原因**: jest.config.js、型エラー、TSConfig設定
- **対処**: `npx tsc --noEmit --skipLibCheck`でローカル確認

#### 2. CDKデプロイエラー

- **原因**: MODULE_NOT_FOUND、cdk.json設定、ビルド成果物不足、Docker依存、CI/CD環境パス解決問題
- **対処**: CDKビルド確認、Git追跡対象設定、Lambda Code.fromAsset()単純化、**動的パス解決実装**

#### 3. ESLintパターンエラー

- **原因**: globパターン、ファイル検索、TSConfig競合
- **対処**: Lambda関数存在確認、TSConfig競合回避

#### 4. テストカバレッジエラー

- **原因**: AWSテスト失敗、カバレッジディレクトリ不存在
- **対処**: `continue-on-error: true`、事前ディレクトリ作成

#### 5. AWS認証エラー

- **原因**: GitHub Secrets未設定、IAM権限不足
- **対処**: PassRole権限追加、アクセスキー確認

#### 6. フロントエンドデプロイエラー

- **原因**: CloudFormation出力値空、S3バケット不存在、環境変数設定ミス
- **対処**: インフラデプロイ確認、環境別.envファイル準備、API URL動的更新確認

#### 7. Lambda依存関係エラー

- **原因**: npm ciパス誤り、node_modules不足、CI/CD作業ディレクトリ構造差異
- **対処**: フルパス使用（${{ github.workspace }}/pro-candidate-aws/lambda）、**動的パス解決・存在確認**

#### 8. Lambda Code.fromAsset()エラー（新規追加）

- **問題**: 「Cannot find module 'api'」・502 Bad Gateway・CI/CD環境でのアセット解決失敗
- **原因**: CI/CD環境での作業ディレクトリ構造の違い（`/pro_candidate/` vs `/pro_candidate/pro_candidate/`）
- **解決策**:
  - `process.cwd()`ベース動的パス構築
  - `fs.existsSync()`による存在確認
  - 環境適応型パス選択（`isInCdkDir`判定）
  - configディレクトリ未存在時のスキップ処理

### 📚 関連ドキュメント

**CI/CD設定・トラブルシューティング**:

- [GitHub Actions トラブルシューティング](./docs/aws/GITHUB_ACTIONS_TROUBLESHOOTING.md) - 完全版エラー対処法
- [開発プラクティスガイド](./docs/common/DEVELOPMENT_PRACTICES.md) - CI/CD事前チェック・運用手順
- [AWS CI/CD ガイド](./docs/aws/AWS_CICD_GUIDE.md) - AWS設定手順

**環境別ガイド**:

- [AWS インフラ文書](./docs/aws/AWS_INFRASTRUCTURE_DOCUMENTATION.md) - 全体アーキテクチャ
- [GAS CI/CD ガイド](./docs/gas/GAS_CICD_GUIDE.md) - GAS環境CI/CD（無効化済み）
- [Simple AWS Setup](./docs/aws/SIMPLE_AWS_SETUP.md) - 5分設定ガイド

**プロジェクト管理**:

- [CHANGELOG.md](./CHANGELOG.md) - 全変更履歴
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - プロジェクト構造

---

## 🎯 CI/CD運用サマリー

**現在稼働中**: 3つのワークフロー（AWS Deploy・品質チェック・セキュリティ監査）  
**完全自動化**: push→dev自動デプロイ・release→prod自動デプロイ・品質チェック・セキュリティ監査  
**エラー対処**: 5分類エラーの完全対処法確立・包括的ドキュメント整備  
**環境分離**: AWS本番環境・GAS開発環境の完全分離運用

このCI/CDパイプラインにより、安全で効率的な継続的デリバリーを実現しています。
