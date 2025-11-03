# 環境設定・差分ドキュメント

プロ野球候補選手データ収集ツールの各環境（Local、Dev、Prod）の設定差分と接続情報を説明します。

## 📊 環境構成概要

### 🏗️ アーキテクチャ分離

- **Local開発**: フロントエンドのみローカル実行、APIは外部環境接続
- **Dev環境**: AWS CDK完全自動デプロイ、開発・テスト用
- **Prod環境**: AWS CDK完全自動デプロイ、本番運用

## 🌐 環境別接続先一覧

| 環境      | フロントエンドURL                                  | API URL                     | Cognito User Pool          | S3バケット                | 用途         |
| --------- | -------------------------------------------------- | --------------------------- | -------------------------- | ------------------------- | ------------ |
| **Local** | `http://localhost:5173`                            | `https://2esje5au24...dev`  | `ap-northeast-1_yRTv0CRfz` | N/A                       | ローカル開発 |
| **Dev**   | `http://pro-candidate-frontend-dev.s3-website...`  | `https://2esje5au24...dev`  | `ap-northeast-1_yRTv0CRfz` | `pro-candidate-data-dev`  | 開発・テスト |
| **Prod**  | `http://pro-candidate-frontend-prod.s3-website...` | `https://9cyk8cfgo1...prod` | `ap-northeast-1_5m7pnXzt8` | `pro-candidate-data-prod` | 本番運用     |

## 🔧 環境別詳細設定

### 1. Local開発環境

**フロントエンド実行**:

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

**API接続**:

- **接続先**: Dev環境API（プロキシ経由）
- **プロキシ設定**: `vite.config.ts`
  ```typescript
  proxy: {
    '/api': {
      target: 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    }
  }
  ```

**認証設定**:

- **Cognito**: Dev環境User Pool使用
- **認証状態**: localhost/127.0.0.1では認証無効化
- **開発者体験**: ログインプロセスをスキップ

**環境変数**:

```bash
# .env.local（ローカル開発用）
VITE_API_BASE_URL=/api
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_yRTv0CRfz
VITE_COGNITO_CLIENT_ID=6cfk60qf91r0qch7nfjops0scd
VITE_ENVIRONMENT=local
VITE_DEVELOPMENT_MODE=true
```

**特徴**:

- ✅ **高速開発**: ホットリロード・即座反映
- ✅ **認証簡略化**: ログイン不要でUI開発可能
- ⚠️ **API固定**: Dev環境APIに依存、Prod環境APIテスト不可

### 2. Dev環境

**フロントエンドURL**:

```
http://pro-candidate-frontend-dev.s3-website-ap-northeast-1.amazonaws.com
```

**API設定**:

- **エンドポイント**: `https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev`
- **Lambda関数**: `pro-baseball-scraping-dev`
- **CloudFormation**: `ProBaseballStack-dev`

**データストレージ**:

- **S3バケット**: `pro-candidate-data-dev`
- **データ構造**: 開発・テスト用データ
- **自動削除**: 30日後自動削除設定

**認証設定**:

- **User Pool ID**: `ap-northeast-1_yRTv0CRfz`
- **Client ID**: `6cfk60qf91r0qch7nfjops0scd`
- **MFA**: 無効
- **セルフサインアップ**: 有効

**デプロイ**:

- **トリガー**: `develop`ブランチpush時自動デプロイ
- **GitHub Actions**: `aws-deploy.yml`
- **環境変数**: CloudFormationから動的取得

**特徴**:

- ✅ **自動デプロイ**: GitPush→即座反映
- ✅ **実環境テスト**: AWS環境での動作確認
- ✅ **データ分離**: 本番データに影響なし

### 3. Prod環境

**フロントエンドURL**:

```
http://pro-candidate-frontend-prod.s3-website-ap-northeast-1.amazonaws.com
```

**API設定**:

- **エンドポイント**: `https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod`
- **Lambda関数**: `pro-baseball-scraping-prod`
- **CloudFormation**: `ProBaseballStack-prod`

**データストレージ**:

- **S3バケット**: `pro-candidate-data-prod`
- **データ構造**: AWS API本番環境データ
- **保持設定**: データ永続化（削除無効）

**認証設定**:

- **User Pool ID**: `ap-northeast-1_5m7pnXzt8`
- **Client ID**: `3vuipnf467d9q43k40fo480fdk`
- **MFA**: 有効推奨
- **セルフサインアップ**: 無効推奨

**セキュリティ強化**:

- **Security Hub**: 有効
- **AWS Config**: S3パブリックアクセス監視
- **CloudWatch**: 詳細監視・アラート

**デプロイ**:

- **トリガー**: GitHub Release作成時自動デプロイ
- **GitHub Actions**: `aws-deploy.yml` (環境=prod)
- **ロールバック**: 失敗時自動ロールバック機能

**特徴**:

- ✅ **本番品質**: セキュリティ・監視・バックアップ完備
- ✅ **安全デプロイ**: リリース承認プロセス経由
- ✅ **データ保護**: 永続化・暗号化・アクセス制御

## 🔄 デプロイフロー

### Local → Dev

```bash
# 開発完了後
git add .
git commit -m "feature: 新機能追加"
git push origin develop
# → 自動でDev環境デプロイ
```

### Dev → Prod

```bash
# リリース準備
gh release create v1.3.0 --title "Version 1.3.0" --notes "リリースノート"
# → 自動でProd環境デプロイ
```

## ⚠️ 環境間差分・制限事項

### 1. API接続制限

| 環境      | Dev API接続 | Prod API接続 | 制限事項         |
| --------- | ----------- | ------------ | ---------------- |
| **Local** | ✅ 可能     | ❌ 不可      | 設定ハードコード |
| **Dev**   | ✅ 可能     | ❌ 不可      | 同一環境内のみ   |
| **Prod**  | ❌ 不可     | ✅ 可能      | 同一環境内のみ   |

### 2. 認証差分

| 設定項目           | Local  | Dev  | Prod       |
| ------------------ | ------ | ---- | ---------- |
| **認証要否**       | 無効化 | 必須 | 必須       |
| **MFA**            | N/A    | 無効 | 有効推奨   |
| **サインアップ**   | N/A    | 自由 | 管理者承認 |
| **パスワード強度** | N/A    | 標準 | 強化       |

### 3. データアクセス権限

| 環境      | データ読み取り | データ書き込み | データ削除  | バックアップ |
| --------- | -------------- | -------------- | ----------- | ------------ |
| **Local** | Dev環境経由    | Dev環境経由    | Dev環境経由 | なし         |
| **Dev**   | ✅ 自由        | ✅ 自由        | ✅ 自由     | 自動（7日）  |
| **Prod**  | 🔒 制限        | 🔒 制限        | ❌ 禁止     | 自動（30日） |

### 4. 監視・ログレベル

| 監視項目       | Local | Dev        | Prod     |
| -------------- | ----- | ---------- | -------- |
| **CloudWatch** | なし  | 基本       | 詳細     |
| **X-Ray**      | なし  | 有効       | 有効     |
| **アラート**   | なし  | エラーのみ | 全レベル |
| **ログ保持**   | なし  | 7日        | 30日     |

## 🛠️ 環境設定変更手順

### Local開発環境でProd APIをテストしたい場合

1. **手動設定変更**（一時的）:

   ```typescript
   // frontend/src/config/api.ts
   export const API_CONFIG = {
     BASE_URL: 'https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod',
     // ...
   };
   ```

2. **環境変数による切り替え**（推奨）:

   ```bash
   # .env.local作成
   echo 'VITE_API_BASE_URL=https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod' > frontend/.env.local

   # api.ts修正
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'デフォルトURL';
   ```

### 新環境追加時の作業

1. **AWS CDKスタック追加**:

   ```bash
   cdk deploy ProBaseballStack-staging
   ```

2. **GitHub Actions環境変数追加**:

   ```yaml
   environment: ${{ github.event.inputs.environment || 'staging' }}
   ```

3. **フロントエンド環境設定追加**:
   ```bash
   # .env.staging作成
   VITE_API_BASE_URL=https://staging-api-url
   VITE_ENVIRONMENT=staging
   ```

## 📚 関連ドキュメント

- [AWS インフラ構成](../aws/AWS_INFRASTRUCTURE_DOCUMENTATION.md)
- [CI/CDガイド](../aws/AWS_CICD_GUIDE.md)
- [開発ガイド](./DEVELOPMENT_GUIDE.md)
- [セットアップガイド](./SETUP_GUIDE.md)

---

**最終更新**: 2025-06-10  
**更新者**: Claude Code  
**バージョン**: v1.3.0
