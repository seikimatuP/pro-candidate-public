# 環境設定・差分ドキュメント

プロ野球候補選手データ収集ツールの各環境（Local、Dev、Prod）の設定差分と接続情報を説明します。

## 📊 環境構成概要

### 🏗️ アーキテクチャ分離

- **Local開発**: フロントエンドのみローカル実行、APIは外部環境接続
- **Dev環境**: AWS CDK完全自動デプロイ、開発・テスト用
- **Prod環境**: AWS CDK完全自動デプロイ、本番運用

## 🌐 環境別接続先一覧

配信の正面は CloudFront。S3 Website エンドポイントはオリジン側の設定であり、動作確認や
E2E の対象は CloudFront の URL を使う。

| 環境      | フロントエンドURL（CloudFront）         | API URL                     | Cognito User Pool          | S3バケット                | 用途         |
| --------- | --------------------------------------- | --------------------------- | -------------------------- | ------------------------- | ------------ |
| **Local** | `http://localhost:5173`                 | `https://2esje5au24...dev`  | `ap-northeast-1_devPoolId` | N/A                       | ローカル開発 |
| **Dev**   | `https://d3brmn978dqs63.cloudfront.net` | `https://2esje5au24...dev`  | `ap-northeast-1_devPoolId` | `pro-candidate-data-dev`  | 開発・テスト |
| **Prod**  | `https://dh2yk8y9mj9wl.cloudfront.net`  | `https://9cyk8cfgo1...prod` | `ap-northeast-1_prodPoolId` | `pro-candidate-data-prod` | 本番運用     |

## 🔧 環境別詳細設定

### 1. Local開発環境

**フロントエンド実行**:

```bash
# Doppler の dev_local config 経由で Vite を起動する
pnpm --filter frontend dev
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
- **フロントエンド**: localhost/127.0.0.1ではログイン画面をスキップし、ダミーユーザー（`local-admin`・`admin`グループ）を設定（`frontend/src/contexts/AuthContext.tsx`）
- **API**: 接続先の Dev API は Cognito 認証必須。ローカルのダミーユーザーは Cognito トークンを持たないため、実名系API（`/players` 系など）は **401** になる
- **注意**: ログインをスキップできるのは画面の枠組みまで。実名データを表示する画面をローカルで動かすには、Dev の Cognito ユーザー（`admin`グループ所属）でログインする必要がある

**環境変数**:

値は Doppler の `dev_local` config から `doppler run` 経由で注入される（`.env` ファイルは作らない。
詳細は [Doppler セットアップ](../development/DOPPLER_SETUP.md)）。ローカル開発で使うキーは以下。

```bash
VITE_API_BASE_URL=/api
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_devPoolId
VITE_COGNITO_CLIENT_ID=devclientidxxxxxxxxxxxxxxx
VITE_ENVIRONMENT=local
VITE_DEVELOPMENT_MODE=true
```

**特徴**:

- ✅ **高速開発**: ホットリロード・即座反映
- ✅ **認証簡略化**: ログイン画面を経由せずUIの枠組みを確認できる
- ⚠️ **実名データは不可**: Dev API が Cognito 認証必須のため、ダミーユーザーのままでは選手一覧などのデータが取得できない
- ⚠️ **API固定**: Dev環境APIに依存、Prod環境APIテスト不可

### 2. Dev環境

**フロントエンドURL**:

```
https://d3brmn978dqs63.cloudfront.net
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

- **User Pool ID**: `ap-northeast-1_devPoolId`
- **Client ID**: `devclientidxxxxxxxxxxxxxxx`
- **MFA**: オプション（`mfa: OPTIONAL`）
- **セルフサインアップ**: 無効（`selfSignUpEnabled: false`）。アカウントは運営者が招待・作成する
- **API 認証**: 有効（Cognito authorizer 配線済み。prod と同構造）
- **admin グループ**: CDK 管理外。`scripts/ensure-cognito-admin.sh` が冪等に用意する（手順は [Cognito 管理者セットアップ](../aws/COGNITO_ADMIN_SETUP.md)）

**デプロイ**:

- **トリガー**: `develop`ブランチpush時自動デプロイ
- **GitHub Actions**: `deploy-infra.yml`
- **環境変数**: CloudFormationから動的取得

**特徴**:

- ✅ **自動デプロイ**: GitPush→即座反映
- ✅ **実環境テスト**: AWS環境での動作確認
- ✅ **データ分離**: 本番データに影響なし

### 3. Prod環境

**フロントエンドURL**:

```
https://dh2yk8y9mj9wl.cloudfront.net
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

- **User Pool ID**: `ap-northeast-1_prodPoolId`
- **Client ID**: `prodclientidxxxxxxxxxxxxxx`
- **MFA**: オプション（`mfa: OPTIONAL`。dev と同設定）
- **セルフサインアップ**: 無効（`selfSignUpEnabled: false`）
- **API 認証**: 有効
- ⚠️ **prod は PR #1481 未反映**。実名一覧の認証必須化・dev への authorizer 配線は develop までで、prod へはリリース時に反映される

**セキュリティ強化**:

- **Security Hub**: 有効
- **AWS Config**: S3パブリックアクセス監視
- **CloudWatch**: 詳細監視・アラート

**デプロイ**:

- **トリガー**: GitHub Release作成時自動デプロイ
- **GitHub Actions**: `deploy-infra.yml` (環境=prod)
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

| 設定項目           | Local                 | Dev                         | Prod           |
| ------------------ | --------------------- | --------------------------- | -------------- |
| **画面の認証要否** | スキップ（ダミー）    | 必須                        | 必須           |
| **API の認証要否** | 接続先 Dev のため必須 | 必須                        | 必須           |
| **MFA**            | N/A                   | オプション                  | オプション     |
| **サインアップ**   | N/A                   | 無効（招待制）              | 無効（招待制） |
| **パスワード強度** | N/A                   | 8文字以上・大小英数記号必須 | 同左           |

dev / prod で認証設定に差はない（PR #1481 で dev にも Cognito authorizer を配線して同構造にした）。

### 2.1 API の公開範囲

認証不要（公開）で叩けるのは次の 4 本だけ。氏名・学校名を含まない集計のみを返す。

| エンドポイント         | 認証 |
| ---------------------- | ---- |
| `GET /health`          | 不要 |
| `GET /statistics`      | 不要 |
| `GET /schools`         | 不要 |
| `GET /years/available` | 不要 |

上記以外（`/players` 系すべて・`/schools/{school}/players`・`/scraping/*`・`ANY /{proxy+}`）は
Cognito 認証必須で、さらに ID トークンの `cognito:groups` に `admin` が必要。Lambda 側でも
同じ判定をしており二重防御になっている。

- **401 Unauthorized**: トークンが無い・無効（API Gateway の authorizer が返す）
- **403 Forbidden**: 認証は通っているが `admin` グループに居ない（Lambda が返す）

フロントエンドでも `/highschool-players`・`/university-players`・`/players`・`/schools`・
`/scraping-history` は `ProtectedRoute requireAdmin` で保護され、未ログインだと
`/auth/login` へリダイレクトされる。未ログインで見られるのはトップの集計ダッシュボード（`/`）のみ。

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

1. **prd config でローカル起動**（推奨）:

   ```bash
   pnpm --filter frontend dev:prod   # doppler run --config prd -- vite --mode prod
   ```

2. **一時的な上書き**:

   ```bash
   # Doppler の値を env で上書きする
   VITE_API_BASE_URL=https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod \
     doppler run --config prd --preserve-env -- pnpm --filter frontend dev
   ```

なお prod API も Cognito 認証必須なので、実名系のデータを見るには prod の User Pool の
admin ユーザーでログインする必要がある。

### 新環境追加時の作業

1. **AWS CDKスタック追加**: `pro-candidate-aws/` にステージを追加し、GitHub Actions から
   デプロイする（`cdk deploy` のローカル実行は禁止）

2. **GitHub Actions環境変数追加**:

   ```yaml
   environment: ${{ github.event.inputs.environment || 'staging' }}
   ```

3. **Doppler に config を追加**: `staging` config を作り、`VITE_API_BASE_URL` /
   `VITE_COGNITO_*` / `VITE_ENVIRONMENT` を登録する（`.env` ファイルは作らない）

## 📚 関連ドキュメント

- [AWS インフラ構成](../aws/AWS_INFRASTRUCTURE_DOCUMENTATION.md)
- [CI/CDガイド](../aws/AWS_CICD_GUIDE.md)
- [プロジェクトドキュメント](../README.md)
- [セットアップガイド](./SETUP_GUIDE.md)

---

**最終更新**: 2026-08-23（PR #1481 の認証仕様に追随）  
**更新者**: Claude Code  
**バージョン**: v1.3.0
