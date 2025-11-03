# Enhanced GitHub Actions ワークフローガイド

## 概要

Enhanced版（aws-deploy.yml）は、Simple Auth方式を維持しながらエンタープライズ級の高度機能を提供するCI/CDワークフローです。

## 🚀 Enhanced版の特徴

### 機能比較表

| **機能**             | **Basic版** | **Enhanced版**                                 |
| -------------------- | ----------- | ---------------------------------------------- |
| **Jobs構成**         | 1 job       | **3 jobs**（環境判定・デプロイ・ロールバック） |
| **認証方式**         | Simple Auth | **Simple Auth**（変更なし）                    |
| **環境判定**         | 固定dev     | **自動判定**（push→dev, release→prod）         |
| **トリガー**         | develop全体 | **パス条件**（`pro-candidate-aws/**`のみ）     |
| **リリース対応**     | ❌          | ✅ **GitHub Release → prod自動デプロイ**       |
| **CDK Diff**         | ❌          | ✅ **事前差分確認**                            |
| **PR統合**           | ❌          | ✅ **デプロイ結果自動コメント**                |
| **ロールバック**     | ❌          | ✅ **prod失敗時自動実行**                      |
| **出力解析**         | grep        | **jq + CloudFormation fallback**               |
| **アーティファクト** | 基本        | **環境別・30日保持**                           |
| **通知**             | ❌          | ✅ **成功・失敗・緊急時通知**                  |

## 📋 3-Jobs 構成詳細

### Job 1: determine-environment

**役割**: デプロイ環境の自動判定

```yaml
環境判定ロジック:
  - workflow_dispatch → 手動選択された環境
  - release → prod環境
  - push → dev環境
```

### Job 2: aws-deploy

**役割**: メインデプロイ処理

**ステップ順序**:

1. ソースコードチェックアウト
2. Node.js 18.x セットアップ
3. 依存関係インストール
4. 🔍 TypeScript事前コンパイルチェック
5. AWS Simple Auth認証
6. 🔨 CDK TypeScriptビルド
7. CDK Bootstrap確認
8. 📋 CDK Diff生成
9. 🚀 CDK Deploy実行
10. 📄 デプロイ出力保存・解析
11. 🏥 ヘルスチェック実行
12. 📁 アーティファクトアップロード
13. ✅ 成功通知
14. 📝 PR自動コメント

### Job 3: rollback-on-failure

**役割**: prod環境失敗時の緊急対応

**実行条件**:

- aws-deploy jobが失敗
- かつ対象環境がprod
- 最大10分以内で実行

## 🎯 トリガー詳細

### 1. Push トリガー

```yaml
on:
  push:
    branches: [develop]
    paths:
      - 'pro-candidate-aws/**'
```

**動作**: AWS関連ファイル変更時のみdev環境デプロイ

### 2. Release トリガー

```yaml
on:
  release:
    types: [published]
```

**動作**: GitHub Release作成時にprod環境自動デプロイ

### 3. Manual トリガー

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [dev, prod]
```

**動作**: Actions タブから手動実行・環境選択可能

## 🔧 高度機能の使用方法

### 1. GitHub Release からprod デプロイ

```bash
# リリース作成（GitHub CLI）
gh release create v1.2.3 --title "Version 1.2.3" --notes "Release notes"

# 自動的にprod環境デプロイが開始
```

### 2. 手動ワークフロー実行

```bash
# dev環境デプロイ
gh workflow run aws-deploy.yml --ref develop -f environment=dev

# prod環境デプロイ
gh workflow run aws-deploy.yml --ref develop -f environment=prod
```

### 3. デプロイ状況確認

```bash
# 実行履歴確認
gh run list --workflow=aws-deploy.yml

# 特定実行の詳細
gh run view <run-id>

# ログ確認
gh run view <run-id> --log
```

## 📊 出力解析機能

### jq使用の高度解析

```yaml
# CDK出力からURL抽出
API_URL=$(jq -r '.["ProBaseballStack-dev"]["ApiEndpoint"] // "Not found"' cdk-outputs.json)
FRONTEND_URL=$(jq -r '.["ProBaseballStack-dev"]["FrontendUrl"] // "Not found"' cdk-outputs.json)
```

### CloudFormation Fallback

```yaml
# cdk-outputs.json が無い場合の代替手段
STACK_NAME="ProBaseballStack-dev"
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME \
--query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text)
```

## 🔄 ロールバック機能

### 自動ロールバック条件

- prod環境デプロイが失敗
- aws-deploy job のfailure()発生
- 10分以内の緊急対応

### ロールバック手順

1. ソースコード再チェックアウト
2. AWS認証再設定
3. 緊急通知実行
4. 手動介入案内表示

**注意**: 実際のロールバック処理は要件により実装

## 📝 PR統合機能

### 自動コメント内容

```markdown
## 🚀 AWS Deployment Success (dev)

✅ CDK deployment completed successfully!

🌐 **API URL**: https://api-url.com
🖥️ **Frontend URL**: https://frontend-url.com

📊 **Environment**: dev
⏰ **Deployed at**: 2025-06-09T14:00:00.000Z
```

### コメント条件

- Pull Request からトリガーされた場合
- デプロイが成功した場合

## 🎛️ カスタマイズオプション

### タイムアウト調整

```yaml
timeout-minutes: 20 # デフォルト20分
```

### 通知設定

```yaml
# Slack通知追加例（要Secret設定）
- name: Slack notification
  if: always()
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 環境変数カスタマイズ

```yaml
# 追加環境設定例
env:
  CDK_DEFAULT_REGION: ap-northeast-1
  NODE_ENV: production
```

## 🚨 トラブルシューティング

### よくある問題

1. **権限エラー**: CDKPassRolePolicy が必要
2. **環境判定エラー**: workflow_dispatch 入力値確認
3. **ロールバック無限ループ**: 10分タイムアウト設定済み

### デバッグ方法

```bash
# 環境判定結果確認
gh run view <run-id> --job=determine-environment

# CDK diff 確認
gh run view <run-id> --job=aws-deploy --log | grep "📋"

# ロールバック実行確認
gh run view <run-id> --job=rollback-on-failure
```

## 🔗 関連ドキュメント

- [AWS CI/CD Guide](AWS_CICD_GUIDE.md) - 基本設定
- [GitHub Actions Troubleshooting](GITHUB_ACTIONS_TROUBLESHOOTING.md) - エラー対処
- [AWS Infrastructure Documentation](AWS_INFRASTRUCTURE_DOCUMENTATION.md) - AWS構成

---

_最終更新: 2025-06-09_  
_Enhanced GitHub Actions workflow, 3-jobs architecture, advanced deployment features_
