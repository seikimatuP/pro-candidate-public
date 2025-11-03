# GitHub Release 作成ガイド

## 概要

このドキュメントでは、プロ野球候補選手データ収集ツールのGitHub Release作成手順について説明します。GitHub Releaseの作成により、**prod環境への自動デプロイ**が実行されます。

## 🚀 GitHub Release自動デプロイの仕組み

### トリガー条件

```yaml
# aws-deploy.yml ワークフロー（インフラ）
on:
  release:
    types: [published]

# frontend-deploy.yml ワークフロー（フロントエンド）
on:
  release:
    types: [published]
```

**完全統合デプロイフロー**:

1. GitHub Releaseを作成・公開
2. **並行実行**される2つのワークフロー:
   - AWS Infrastructure Deploy（Lambda・API Gateway・S3・監視）
   - Frontend Deploy（React・認証設定・静的ホスティング）
3. 環境判定: `release` → **prod環境**
4. **インフラ・フロントエンド同期デプロイ**で完全なprod環境構築

## 📋 Release作成前のチェックリスト

### 1. 事前確認

- [ ] **develop環境での動作確認完了**
- [ ] **全テストの通過確認**（E2Eテスト全成功確認・v1.2.59で確立）
- [ ] **品質チェックの通過確認**
- [ ] **セキュリティ監査の確認**
- [ ] **CHANGELOG.md更新済み**
- [ ] **RELEASE_NOTES.md作成済み**（v1.2.59で標準化）
- [ ] **関連ドキュメント更新済み**（テストガイド・CI/CDガイドなど）

### 2. バージョン管理

**セマンティック バージョニング**を使用:

```
v{major}.{minor}.{patch}

例:
v1.0.0 - 初回リリース
v1.1.0 - 新機能追加
v1.1.1 - バグ修正
v2.0.0 - 破壊的変更
```

**バージョン決定基準**:

- **Major**: 破壊的変更・アーキテクチャ大幅変更
- **Minor**: 新機能追加・機能強化
- **Patch**: バグ修正・軽微な改善

## 🔧 Release作成手順

### 方法1: GitHub Web UI（推奨）

#### Step 1: Releaseページアクセス

1. GitHubリポジトリのメインページにアクセス
2. 右側サイドバーの **"Releases"** をクリック
3. **"Create a new release"** ボタンをクリック

#### Step 2: リリース情報入力

**1. Tag version**:

```
v1.2.0
```

- **Target**: `develop` ブランチを選択
- **Tag**: 新しいタグ名を入力（例: `v1.2.0`）

**2. Release title**:

```
Version 1.2.0 - フロントエンド自動デプロイ実装
```

**3. Release notes**:

RELEASE_NOTES.mdの内容をコピー・ペーストで使用（v1.2.59で標準化）:

```markdown
## v1.2.59 (2025-01-21)

### 🚀 主な改善

- **E2Eテスト認証問題完全解決**: 認証タイムアウト処理改善・フォールバック機能追加
- **環境別テスト対応**: dev/prod/local環境向けE2Eテスト実行スクリプト追加
- **CDK S3バケット修正**: prod環境既存バケット参照エラー解決
- **prod環境デプロイ最適化**: GitHub Actions自動デプロイ確立

### 🔧 技術的改善

- AuthHelper認証タイムアウト15秒→20秒延長・強制ログイン画面遷移追加
- package.json環境別E2Eテストコマンド追加（test:e2e:dev/prod/local）
- SimpleFrontendConstruct prod環境でfromBucketName使用
- S3バケット既存リソース管理最適化

### 📊 テスト結果

- **E2Eテスト**: 全テスト成功確認（認証問題完全解決）
- **プロトコル対応**: S3静的ホスティングHTTP対応確認
- **デプロイ検証**: GitHub Actions自動デプロイフロー確認
```

**ドキュメント連携**: RELEASE_NOTES.mdから自動転用でリリースノート作成の効率化・一貫性確保

**環境**: Production
**リージョン**: ap-northeast-1

---

**🤖 自動デプロイ**: このリリース作成により prod環境への自動デプロイが実行されます

````

**4. オプション設定**:

- [ ] **Set as the latest release** ✅ チェック
- [ ] **Set as a pre-release** （ベータ版の場合のみチェック）

#### Step 3: リリース公開

1. **"Publish release"** ボタンをクリック
2. **AWS CDK Deploy (Enhanced)ワークフロー**が自動開始
3. **prod環境デプロイ**が実行される

### 方法2: GitHub CLI

```bash
# インストール確認
gh --version

# リリース作成
gh release create v1.2.0 \
  --title "Version 1.2.0 - フロントエンド自動デプロイ実装" \
  --notes-file release-notes.md \
  --target develop

# プレリリース作成（ベータ版）
gh release create v1.2.0-beta \
  --title "Version 1.2.0 Beta" \
  --notes "ベータ版リリース" \
  --prerelease \
  --target develop
````

### 方法3: Git Tag + GitHub自動変換

```bash
# タグ作成
git tag -a v1.2.0 -m "Version 1.2.0 - フロントエンド自動デプロイ実装"

# タグプッシュ
git push origin v1.2.0

# GitHub WebUIでReleaseに変換
# → GitHubリポジトリ > Tags > Create release from tag
```

## 📊 デプロイ監視・確認

### 1. ワークフロー監視

**GitHub Actions確認**:

```bash
# ワークフロー実行状況（GitHub CLI）
gh run list --workflow=aws-deploy.yml --limit 5

# 詳細ログ確認
gh run view <run-id> --log

# リアルタイム監視
gh run watch
```

**GitHub Web UI**:

1. リポジトリ > **Actions** タブ
2. **AWS CDK Deploy (Enhanced)** ワークフロー選択
3. 実行ステータス・ログ確認

### 2. AWS環境確認

**CloudFormation**:

```bash
# スタック状況確認
aws cloudformation describe-stacks \
  --stack-name ProBaseballStack-prod \
  --query 'Stacks[0].StackStatus'

# アウトプット確認
aws cloudformation describe-stacks \
  --stack-name ProBaseballStack-prod \
  --query 'Stacks[0].Outputs'
```

**Lambda関数**:

```bash
# 関数一覧
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `pro-baseball`)].FunctionName'

# 関数詳細
aws lambda get-function --function-name pro-baseball-api-prod
```

### 3. フロントエンド確認

**S3バケット**:

```bash
# バケット内容確認
aws s3 ls s3://pro-candidate-frontend-prod/ --recursive

# ファイル数・サイズ確認
aws s3 ls s3://pro-candidate-frontend-prod/ --recursive --summarize
```

**CloudFront（設定されている場合）**:

```bash
# ディストリビューション確認
aws cloudfront list-distributions \
  --query 'DistributionList.Items[?contains(Comment, `pro-candidate`)].Id'
```

## 🔄 ロールバック手順

### 自動ロールバック

**prod環境デプロイ失敗時**:

- AWS CDK Deploy (Enhanced)の`rollback-on-failure` jobが自動実行
- 緊急通知・ログ出力
- 手動介入が必要な場合の指示

### 手動ロールバック

**1. 前バージョンへの戻し**:

```bash
# 前のリリースタグ確認
git tag --sort=-version:refname | head -5

# 前バージョンでの新リリース作成
gh release create v1.1.1-hotfix \
  --title "Hotfix: Rollback to stable version" \
  --notes "緊急ロールバック: v1.1.0の安定版に戻し" \
  --target v1.1.0
```

**2. CloudFormationスタック操作**:

```bash
# スタック更新取り消し
aws cloudformation cancel-update-stack \
  --stack-name ProBaseballStack-prod

# 前バージョンのテンプレートで更新
aws cloudformation update-stack \
  --stack-name ProBaseballStack-prod \
  --template-body file://previous-template.json
```

## 📋 リリース後チェックリスト

### 即座に確認

- [ ] **AWS CDK Deployワークフロー成功**
- [ ] **CloudFormationスタック更新完了**
- [ ] **API Gatewayエンドポイント応答確認**
- [ ] **フロントエンドアクセス確認**

### 24時間以内に確認

- [ ] **Lambda関数ログ確認**
- [ ] **CloudWatch メトリクス確認**
- [ ] **エラー率・レスポンス時間監視**
- [ ] **ユーザーフィードバック確認**

### 1週間以内に確認

- [ ] **AWS利用料金確認**
- [ ] **パフォーマンス監視結果**
- [ ] **セキュリティログ確認**
- [ ] **次回リリース計画更新**

## 📚 関連ドキュメント

- [CI/CD パイプライン全体概要](../aws/AWS_CICD_GUIDE.md)
- [AWS Infrastructure Documentation](../aws/AWS_INFRASTRUCTURE_DOCUMENTATION.md)
- [開発ガイド](./DEVELOPMENT_GUIDE.md)
- [GitHub Actions Troubleshooting](../aws/GITHUB_ACTIONS_TROUBLESHOOTING.md)

## 🔧 トラブルシューティング

### よくある問題

#### 1. ワークフローがトリガーされない

**原因**: Release作成の設定ミス

**解決策**:

```bash
# リリース状況確認
gh release list

# 削除して再作成
gh release delete v1.2.0 --yes
gh release create v1.2.0 --title "..." --notes "..."
```

#### 2. prod環境デプロイ失敗

**原因**: AWS認証・権限エラー

**解決策**:

1. GitHub Secrets確認（`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`）
2. IAM権限確認（PassRole権限等）
3. CloudFormationスタック状態確認

#### 3. フロントエンドデプロイ失敗

**原因**: TypeScript設定・ビルドエラー

**解決策**:

```bash
# ローカルビルド確認
cd frontend
npm run build

# 設定ファイル確認
ls -la tsconfig*.json
```

### 緊急時連絡先

**システム管理者**: プロジェクト管理者に連絡  
**AWS問題**: AWS サポートケース作成  
**GitHub問題**: GitHub Support連絡

---

## 📝 リリースノートテンプレート

```markdown
## 🚀 新機能

- 新機能の説明

## 🔧 改善

- 改善項目の説明

## 🐛 バグ修正

- 修正されたバグの説明

## 📚 ドキュメント

- 新規追加・更新されたドキュメント

## 🛠️ 技術詳細

**デプロイ対象**:
**環境**: Production
**リージョン**: ap-northeast-1

---

**🤖 自動デプロイ**: このリリース作成により prod環境への自動デプロイが実行されます
```

このガイドに従って安全で確実なproduction環境へのリリースを実行してください。
