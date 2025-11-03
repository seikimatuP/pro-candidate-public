# .envファイル環境別使い分けガイド

Viteプロジェクトでの環境変数ファイル（.env）の命名規則と使い分け方法を説明します。

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

| コマンド          | モード        | 読み込まれる.envファイル                                              |
| ----------------- | ------------- | --------------------------------------------------------------------- |
| `npm run dev`     | `development` | `.env` → `.env.local` → `.env.development` → `.env.development.local` |
| `npm run build`   | `production`  | `.env` → `.env.local` → `.env.production` → `.env.production.local`   |
| `npm run preview` | `production`  | `.env` → `.env.local` → `.env.production` → `.env.production.local`   |

## 🗂️ 現在のプロジェクト構成

### 既存ファイル状況

```bash
frontend/
├── .env                    # ❌ 存在しない
├── .env.local             # ✅ ローカル開発用設定
├── .env.development       # ❌ 存在しない
├── .env.production        # ✅ prod環境ビルド用（手動作成）
├── .env.example           # ✅ テンプレート
└── vite.config.ts         # プロキシ設定
```

### ファイル別役割

#### `.env.local` (ローカル開発専用)

```bash
# ローカル開発環境設定
VITE_API_BASE_URL=/api                                    # プロキシ経由
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_yRTv0CRfz        # dev環境Cognito
VITE_ENVIRONMENT=local
VITE_DEVELOPMENT_MODE=true
```

#### `.env.production` (本番ビルド用)

```bash
# prod環境向けビルド設定（GitHub Actionsで自動生成）
VITE_API_BASE_URL=https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_5m7pnXzt8
VITE_COGNITO_CLIENT_ID=3vuipnf467d9q43k40fo480fdk
VITE_ENVIRONMENT=prod
```

## 🔧 推奨ファイル構成

### 1. `.env` (共通設定)

```bash
# 全環境共通のデフォルト値
VITE_APP_NAME=プロ野球志望届管理システム
VITE_AWS_REGION=ap-northeast-1
VITE_API_TIMEOUT=10000
VITE_USE_PRODUCTION_DATA=true
```

### 2. `.env.development` (開発モード用)

```bash
# 開発モード専用設定
VITE_API_BASE_URL=https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_yRTv0CRfz
VITE_COGNITO_CLIENT_ID=6cfk60qf91r0qch7nfjops0scd
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG=true
```

### 3. `.env.production` (本番モード用)

```bash
# 本番モード専用設定（GitHub Actionsで動的生成）
VITE_API_BASE_URL=${API_ENDPOINT}
VITE_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
VITE_ENVIRONMENT=production
VITE_ENABLE_DEBUG=false
```

### 4. `.env.local` (個人設定)

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

### ケース1: ローカル開発（`npm run dev`）

**読み込まれるファイル**:

```
.env → .env.local → .env.development → .env.development.local
```

**実際の設定値**:

```bash
VITE_API_BASE_URL=/api                  # .env.local から
VITE_ENVIRONMENT=local                  # .env.local から
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_yRTv0CRfz  # .env.development から
```

### ケース2: 本番ビルド（`npm run build`）

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
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_5m7pnXzt8
VITE_COGNITO_CLIENT_ID=3vuipnf467d9q43k40fo480fdk
```

## 🔄 CI/CDでの環境変数設定

### GitHub Actions（環境別ファイルコピー方式）

```yaml
# frontend-deploy.yml（最新版）
- name: Build Frontend with Environment Variables
  run: |
    cd frontend
    ENV="${{ needs.determine-environment.outputs.environment }}"
    
    # 環境に応じた.envファイルをコピー
    if [ "$ENV" = "prod" ]; then
      cp .env.prod .env.production
    elif [ "$ENV" = "dev" ]; then
      cp .env.dev .env.production
    fi
    
    # API URLのみ動的に更新
    sed -i "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=${{ steps.aws-info.outputs.API_URL }}|" .env.production
    
    npm run build
```

**改善点（2025-06-11）**：
- 動的生成からファイルコピー方式に変更
- API URLのみ動的更新（sed使用）
- 設定ミスのリスク削減

### 手動デプロイ時の作成方法

```bash
# dev環境用
echo 'VITE_API_BASE_URL=https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_yRTv0CRfz
VITE_COGNITO_CLIENT_ID=6cfk60qf91r0qch7nfjops0scd
VITE_ENVIRONMENT=dev' > .env.production

# prod環境用
echo 'VITE_API_BASE_URL=https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_5m7pnXzt8
VITE_COGNITO_CLIENT_ID=3vuipnf467d9q43k40fo480fdk
VITE_ENVIRONMENT=prod' > .env.production
```

## 📝 .gitignoreの設定

### 推奨設定

```gitignore
# 個人設定ファイル（環境に依存する設定）
.env.local
.env.development.local
.env.production.local

# GitHub Actionsで自動生成される一時ファイル
.env.production

# 機密情報を含む可能性のあるファイル
.env.*.local
```

### 共有すべきファイル

```bash
# リポジトリに含める
.env                    # 共通のデフォルト設定
.env.development        # 開発環境の標準設定
.env.example           # 設定テンプレート

# リポジトリに含めない
.env.local             # 個人のローカル設定
.env.production        # デプロイ時に動的生成
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
npm run dev
```

#### 3. 本番ビルドで開発設定が使われる

```bash
# 原因: .env.productionがない、または設定が不足
# 解決: 正しい.env.productionを作成
echo 'VITE_API_BASE_URL=https://prod-api-url' > .env.production
npm run build
```

## 📚 関連ドキュメント

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [環境設定ドキュメント](./ENVIRONMENT_CONFIGURATION.md)
- [開発ガイド](./DEVELOPMENT_GUIDE.md)

---

**最終更新**: 2025-06-10  
**更新者**: Claude Code  
**バージョン**: v1.3.0
