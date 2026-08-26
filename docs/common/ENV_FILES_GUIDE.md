# .envファイル環境別使い分けガイド

Viteプロジェクトでの環境変数ファイル（.env）の命名規則と使い分け方法を説明します。

> **⚠️ 前提（2026-08-23 時点）**: このプロジェクトは環境変数を **Doppler** で管理しており、
> tracked な `.env*` はテンプレートの `frontend/.env.example` のみ。`frontend/.env.dev` /
> `.env.prod` は git から削除済みで、CI のビルドも `doppler run` 経由に切り替わっている。
> 実際の設定手順は [Doppler セットアップ](../development/DOPPLER_SETUP.md) を正とし、
> 本ドキュメントは **Vite の .env 読み込み仕様のリファレンス**として読むこと。
> 新しく tracked な `.env*` を作らないこと。

## 📂 .envファイルの命名規則と優先順位

### Viteの.envファイル読み込み順序

Viteは以下の順序で.envファイルを読み込みます（**後のファイルが優先**）：

```
1. .env                    # すべての環境で読み込まれる
2. .env.local              # すべての環境で読み込まれる（gitignoreすべき）
3. .env.[mode]             # 指定したモードでのみ読み込まれる
4. .env.[mode].local       # 指定したモードでのみ読み込まれる（gitignoreすべき）
```

### モード（mode）の種類

| コマンド                         | モード        | 読み込まれる.envファイル                                              |
| -------------------------------- | ------------- | --------------------------------------------------------------------- |
| `pnpm --filter frontend dev`     | `development` | `.env` → `.env.local` → `.env.development` → `.env.development.local` |
| `pnpm --filter frontend build`   | `production`  | `.env` → `.env.local` → `.env.production` → `.env.production.local`   |
| `pnpm --filter frontend preview` | `production`  | `.env` → `.env.local` → `.env.production` → `.env.production.local`   |

## 🗂️ 現在のプロジェクト構成

### 既存ファイル状況（2026-08-23 実測）

```bash
frontend/
├── .env                    # ❌ 存在しない
├── .env.local             # ❌ 存在しない（作る場合も git 管理外）
├── .env.development       # ❌ 存在しない
├── .env.production        # ❌ 存在しない
├── .env.dev / .env.prod   # ❌ git から削除済み（Doppler の dev / prd config へ移行）
├── .env.example           # ✅ テンプレート（キー名のみ・値は空）
└── vite.config.ts         # プロキシ設定
```

### 値の供給元

| 用途         | 供給元                                               |
| ------------ | ---------------------------------------------------- |
| ローカル開発 | Doppler `dev_local`（`pnpm --filter frontend dev`）  |
| dev ビルド   | Doppler `dev`（`pnpm --filter frontend build:dev`）  |
| prod ビルド  | Doppler `prd`（`pnpm --filter frontend build:prod`） |
| E2E テスト   | Doppler `e2e_dev` / `e2e_prod`                       |

どうしても手元だけで値を上書きしたい場合は `.env.local` を作る（`.gitignore` 済み・
コミットしない）。参考までに、ローカル開発で使うキーは次の形になる。

```bash
# frontend/.env.local（任意・git 管理外）
VITE_API_BASE_URL=/api                                    # プロキシ経由
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_devPoolId        # dev環境Cognito
VITE_ENVIRONMENT=local
VITE_DEVELOPMENT_MODE=true
```

## 🔧 キー構成の参考

以下は Vite のモード別ファイルに置くとしたらどう分かれるか、というキーの整理。
**実際にはこれらのキーを Doppler の各 config に登録する**（ファイルは作らない）。

### 1. 共通設定（Doppler では全 config に共通で置く値）

```bash
# 全環境共通のデフォルト値
VITE_APP_NAME=プロ野球志望届管理システム
VITE_AWS_REGION=ap-northeast-1
VITE_API_TIMEOUT=10000
VITE_USE_PRODUCTION_DATA=true
```

### 2. 開発モード用（Doppler `dev` config 相当）

```bash
# 開発モード専用設定
VITE_API_BASE_URL=https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_devPoolId
VITE_COGNITO_CLIENT_ID=devclientidxxxxxxxxxxxxxxx
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG=true
```

### 3. 本番モード用（Doppler `prd` config 相当）

```bash
# prod 向けの値。GitHub Actions では VITE_API_BASE_URL のみ env: で上書きする
VITE_API_BASE_URL=${API_ENDPOINT}
VITE_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
VITE_ENVIRONMENT=production
VITE_ENABLE_DEBUG=false
```

### 4. `.env.local`（個人設定・git 管理外。Doppler `dev_local` 相当）

```bash
# 個人のローカル環境設定（git無視）
# プロキシ経由でlocalhost開発
VITE_API_BASE_URL=/api
VITE_ENVIRONMENT=local
VITE_DEVELOPMENT_MODE=true

# 本番環境テスト用（コメントアウトして切り替え）
# VITE_API_BASE_URL=https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod
```

## 🎯 環境別使い分け実例

### ケース1: ローカル開発（`pnpm --filter frontend dev`）

**読み込まれるファイル**:

```
.env → .env.local → .env.development → .env.development.local
```

**実際の設定値**:

```bash
VITE_API_BASE_URL=/api                  # .env.local から
VITE_ENVIRONMENT=local                  # .env.local から
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_devPoolId  # .env.development から
```

### ケース2: 本番ビルド（`pnpm --filter frontend build:prod`）

**読み込まれるファイル**:

```
.env → .env.local → .env.production → .env.production.local
```

**実際の設定値**:

```bash
VITE_API_BASE_URL=https://9cyk8cfgo1...prod  # .env.production から
VITE_ENVIRONMENT=production                  # .env.production から
VITE_ENABLE_DEBUG=false                      # .env.production から
```

### ケース3: ローカルでprod環境テスト

**一時的に.env.localを変更**:

```bash
# 開発用設定をコメントアウト
# VITE_API_BASE_URL=/api

# prod環境テスト用設定を有効化
VITE_API_BASE_URL=https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_prodPoolId
VITE_COGNITO_CLIENT_ID=prodclientidxxxxxxxxxxxxxx
```

## 🔄 CI/CDでの環境変数設定

### GitHub Actions（Doppler 注入方式）

`.env` ファイルのコピーや sed による書き換えは撤廃済み。`deploy-frontend.yml` は
Doppler CLI で環境変数を注入してビルドする。

```yaml
# deploy-frontend.yml（現行）
- uses: dopplerhq/cli-action@v4
- name: Build Frontend
  run: |
    cd frontend
    doppler run --preserve-env -- sh -c 'tsc -b && vite build'
  env:
    # env: の値が Doppler の値を上書きする（--preserve-env のため）
    DOPPLER_TOKEN: ${{ ... == 'prod' && secrets.DOPPLER_TOKEN_PRD || secrets.DOPPLER_TOKEN_DEV }}
    VITE_API_BASE_URL: ${{ steps.aws-info.outputs.API_URL }}
```

API URL は CloudFormation から取得した値を GitHub Actions の `env:` で注入し、
それ以外のキーは Doppler の `dev` / `prd` config から供給される。

### 手動ビルド時

```bash
# dev 環境向け
pnpm --filter frontend build:dev    # doppler run --config dev

# prod 環境向け
pnpm --filter frontend build:prod   # doppler run --config prd
```

## 📝 .gitignoreの設定

### 推奨設定

```gitignore
# 環境変数ファイルは原則すべて git 管理外
.env
.env.local
.env.*.local
.env.development
.env.production
.env.dev
.env.prod
```

### 共有すべきファイル

```bash
# リポジトリに含める
.env.example           # 設定テンプレート（キー名のみ・値は空）

# リポジトリに含めない
それ以外の .env* すべて（値は Doppler に置く）
```

## 🛠️ コードでの環境変数使用

### TypeScriptでの型安全な使用

```typescript
// src/config/env.ts
interface EnvironmentConfig {
  apiBaseUrl: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  environment: 'local' | 'development' | 'production';
  enableDebug: boolean;
}

export const env: EnvironmentConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  cognitoUserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
};

// 環境別条件分岐
if (env.environment === 'local') {
  // ローカル環境専用の処理
  console.log('ローカル開発モード');
}
```

### React Componentでの使用

```typescript
// src/components/Environment.tsx
import { env } from '../config/env';

export const Environment: React.FC = () => {
  if (!env.enableDebug) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      background: 'red',
      color: 'white',
      padding: '4px 8px',
      fontSize: '12px'
    }}>
      {env.environment.toUpperCase()}
    </div>
  );
};
```

## 🔍 デバッグとトラブルシューティング

### 環境変数の確認方法

```typescript
// ブラウザ開発者ツールで実行
console.log('環境変数:', {
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  environment: import.meta.env.VITE_ENVIRONMENT,
});
```

### よくある問題と解決方法

#### 1. 環境変数が読み込まれない

```bash
# 原因: プレフィックスがない
❌ API_BASE_URL=https://example.com
✅ VITE_API_BASE_URL=https://example.com

# 原因: ファイル名が間違っている
❌ .env.prod
✅ .env.production
```

#### 2. ローカルで本番設定が反映されない

```bash
# 解決: .env.localの優先順位を確認
# .env.local > .env.development なので、
# .env.localの設定が優先される

# 一時的な解決方法
mv .env.local .env.local.backup
pnpm --filter frontend dev
```

#### 3. 本番ビルドで開発設定が使われる

```bash
# 原因: Doppler の config 指定が違う（dev_local のままビルドしている）
# 解決: prd config でビルドする
pnpm --filter frontend build:prod
```

## 📚 関連ドキュメント

- [Doppler セットアップ](../development/DOPPLER_SETUP.md)（環境変数管理の正）
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [環境設定ドキュメント](./ENVIRONMENT_CONFIGURATION.md)
- [プロジェクトドキュメント](../README.md)

---

**最終更新**: 2026-08-23（Doppler 移行完了に追随）  
**更新者**: Claude Code  
**バージョン**: v1.3.0
