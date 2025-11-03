# プロ野球志望届フロントエンド

React + TypeScript + Vite + Material-UI で構築されたプロ野球志望届データ管理システムのフロントエンドアプリケーション。

## アーキテクチャ概要

### 技術スタック

- **React 18** + **TypeScript** - モダンフロントエンド開発
- **Vite** - 高速ビルドツール・開発サーバー
- **Material-UI (MUI)** - デザインシステム・コンポーネントライブラリ
- **AWS Amplify** - Cognito認証・S3データアクセス
- **Redux Toolkit** - 状態管理
- **Chart.js** - データ可視化
- **PWA** - プログレッシブWebアプリ対応

### 環境別設定

#### 🏠 ローカル環境 (`localhost:5173`)

- **認証**: 無効化（開発効率重視）
- **ユーザー**: 自動ダミーユーザー（admin権限）
- **データ**: ローカルモックデータ
- **起動**: `npm run dev`

#### 🧪 dev環境 (`pro-candidate-frontend-dev.s3-website-*`)

- **認証**: AWS Cognito必須
- **ユーザー**: `admin` / `AdminPass123!`
- **データ**: dev環境S3バケット
- **デプロイ**: `npm run build` → S3 sync

#### 🚀 prod環境 (`pro-candidate-frontend-prod.s3-website-*`)

- **認証**: AWS Cognito必須
- **ユーザー**: `admin`, `ynozue`
- **データ**: prod環境S3バケット
- **デプロイ**: `npm run build:prod` → S3 sync

## 開発コマンド

### 基本開発

```bash
# 依存関係インストール
npm install

# ローカル開発サーバー起動（認証なし）
npm run dev

# 本番ビルド
npm run build

# dev環境用ビルド
npm run build:dev

# prod環境用ビルド
npm run build:prod

# コード品質チェック
npm run lint
npm run lint:fix
```

### デプロイ

```bash
# dev環境デプロイ
npm run build
aws s3 sync dist/ s3://pro-candidate-frontend-dev --delete

# prod環境デプロイ
npm run build:prod
aws s3 sync dist/ s3://pro-candidate-frontend-prod --delete
```

## ディレクトリ構造

```
frontend/
├── src/
│   ├── components/          # 再利用コンポーネント
│   │   ├── auth/           # 認証関連コンポーネント
│   │   ├── charts/         # グラフ・可視化
│   │   ├── layout/         # レイアウトコンポーネント
│   │   ├── selectors/      # セレクターコンポーネント
│   │   │   └── YearSelector.tsx # 年度選択
│   │   └── tables/         # データテーブル
│   ├── config/             # 設定ファイル
│   │   ├── amplify.ts      # AWS Amplify設定
│   │   └── api.ts          # API設定
│   ├── contexts/           # React Context
│   │   └── AuthContext.tsx # 認証状態管理
│   ├── pages/              # ページコンポーネント
│   │   ├── auth/           # 認証ページ
│   │   ├── Dashboard.tsx   # ダッシュボード
│   │   └── ...             # 各種管理ページ
│   ├── services/           # API・データサービス
│   ├── store/              # Redux store
│   ├── types/              # TypeScript型定義
│   └── utils/              # ユーティリティ関数
├── public/                 # 静的ファイル
├── dist/                   # ビルド出力
└── tests/                  # テストファイル
```

## 認証システム

### 環境判定ロジック

```typescript
// src/config/amplify.ts
export const getEnvironmentType = () => {
  const hostname = window.location.hostname;

  if (hostname.includes('s3-website') || hostname.includes('amazonaws.com')) {
    return hostname.includes('prod') ? 'production' : 'development';
  }

  return 'local'; // localhost
};

export const isAuthRequired = () => {
  return getEnvironmentType() !== 'local';
};
```

### 認証永続化機能

- **セッション復元**: ページリロード時の認証状態維持
- **リトライ機能**: `getCurrentUser`最大3回自動リトライ
- **監視機能**: ブラウザfocus/visibilityイベントでの認証状態確認
- **エラー処理**: 認証失敗時の詳細ログ・自動復旧

## PWA対応

### 機能

- **オフライン対応**: Service Worker + Workbox
- **インストール可能**: Add to Home Screen
- **キャッシュ戦略**:
  - API: NetworkFirst（24時間）
  - 画像: CacheFirst（30日間）
  - アプリシェル: Precache

### 設定

- **マニフェスト**: `public/manifest.json`
- **アイコン**: `public/icons/` (32x32 〜 512x512)
- **Service Worker**: Vite PWA Plugin自動生成

## 本番品質設定

### コンソール出力制御

#### 開発環境（DEV）

```typescript
// 開発環境でのみデバッグ出力
if (import.meta.env.DEV) {
  console.log('Debug info');
  console.error('Development error');
}
```

#### 本番環境（Production）

```typescript
// vite.config.ts - 本番ビルドで自動削除
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,    // console.log完全除去
      drop_debugger: true
    }
  }
}
```

### セキュリティ設定

- **CSP**: Content Security Policy対応
- **HTTPS**: prod環境強制HTTPS
- **認証**: JWT + Refresh Token
- **CORS**: API Gateway設定

## トラブルシューティング

### SPA（React Router）関連

#### リロード時404エラー

**原因**: S3静的ホスティングでSPAルーティング未対応  
**解決**: S3 ErrorDocument設定済み（index.html）

```bash
# 設定確認
aws s3api get-bucket-website --bucket pro-candidate-frontend-dev
```

#### 物理ファイルとルーティングの違い

- **物理ファイル**: `/index.html`, `/assets/`のみ存在
- **仮想ルート**: `/login`, `/dashboard`等はReact Routerで処理
- **リロード動作**: 404 → ErrorDocument → React Router → 正常表示

### 認証エラー

```
User pool client does not exist
```

**解決**: `src/config/amplify.ts`のクライアントID確認

### リロード時ログアウト

**原因**: 認証永続化設定不足  
**解決**: Amplify設定・リトライ機能実装済み

### console.log本番出力

**原因**: Vite terser設定不備  
**解決**: `drop_console: true`設定・環境別分岐実装済み

### PWAインストール

**条件**: HTTPS環境・マニフェスト・Service Worker必須  
**確認**: Chrome DevTools > Application > Manifest

## 開発継続性・セッション管理

### セッション間継続開発

- **コンテキスト保持**: 前回作業状況の seamless な継続・状態管理による開発効率向上
- **段階的UI改善**: Paper→Box→ハイライト表示への段階的ユーザビリティ向上
- **統合テスト**: ローカル・dev・prod環境での一貫したUI動作検証

### CI/CD統合ワークフロー

- **role-based commits**: changelog・開発ガイド・プロジェクト文書の責任分離
- **並列デプロイ**: aws-deploy.yml・frontend-deploy.ymlによる効率的デプロイ
- **品質保証サイクル**: 文書同期・UI改善・デプロイ自動化の統合プロセス
- **ドキュメント品質管理**: CHANGELOG統合・概要重視による長期保守性向上

## 関連ドキュメント

- [SPA Routing Guide](../docs/common/SPA_ROUTING_GUIDE.md) - **SPAルーティング詳細**
- [AWS Architecture](../docs/aws/)
- [Development Workflow](../docs/aws/AWS_DEVELOPMENT_WORKFLOW.md)
- [Development Guide](../docs/common/DEVELOPMENT_GUIDE.md) - **開発継続性原則**
- [GitHub Actions Troubleshooting](../docs/aws/GITHUB_ACTIONS_TROUBLESHOOTING.md) - **CI/CD統合ガイド**
- [Project Structure](../PROJECT_STRUCTURE.md)
- [CLAUDE.md](../CLAUDE.md) - 開発ガイダンス
