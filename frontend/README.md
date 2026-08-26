# プロ野球志望届フロントエンド

React + TypeScript + Vite + Material-UI で構築されたプロ野球志望届データ管理システムのフロントエンドアプリケーション。

## アーキテクチャ概要

### 技術スタック

- **React 19** + **TypeScript** - モダンフロントエンド開発
- **Vite** - 高速ビルドツール・開発サーバー
- **Material-UI (MUI)** - デザインシステム・コンポーネントライブラリ
- **AWS Amplify** - Cognito認証・S3データアクセス
- **Redux Toolkit** - 状態管理
- **Chart.js** - データ可視化
- **PWA** - プログレッシブWebアプリ対応

### 公開範囲（重要）

実在の高校生を含む個人データを扱うため、**実名一覧は一般公開しない**。

- 高校生一覧・大学生一覧・選手詳細・氏名検索・学校別選手は、Cognito ログインに加えて
  `cognito:groups` に `admin` が必須
- 未ログインで見られるのは**トップの集計ダッシュボードのみ**
- Cognito のセルフサインアップは無効。管理者アカウントの用意は
  `scripts/ensure-cognito-admin.sh <dev|prod>` と `docs/aws/COGNITO_ADMIN_SETUP.md` を参照
- CSV の一括出力は認証必須の管理画面のみ（公開ページからは廃止済み）

### 環境別設定

#### 🏠 ローカル環境 (`localhost:5173`)

- **認証**: スキップ（`src/utils/environment.ts` の `isAuthRequired()` が localhost で false を返す）
- **データ**: 参照先 API は Doppler の `dev_local` config の環境変数で決まる
- **起動**: `pnpm dev`（`frontend` ディレクトリで実行。内部で `doppler run --config dev_local`）

#### 🧪 dev環境 (CloudFront: `https://d3brmn978dqs63.cloudfront.net`)

- **認証**: AWS Cognito必須（API Gateway 側にも authorizer を配線済み）
- **ユーザー**: Cognito で払い出した admin グループ所属アカウント。
  認証情報は Doppler（`e2e_dev`）管理でファイルには書かない
- **データ**: dev環境S3バケット
- **デプロイ**: `develop` への push で `deploy-frontend.yml` が自動実行

#### 🚀 prod環境 (CloudFront: `https://dh2yk8y9mj9wl.cloudfront.net`)

- **認証**: AWS Cognito必須（※ 認証構成の prod 反映はまだ未実施。prod は現在も旧状態）
- **ユーザー**: Cognito で払い出した admin グループ所属アカウント。認証情報は Doppler（`e2e_prod`）管理
- **データ**: prod環境S3バケット
- **デプロイ**: タグ push（`v1.x.x`）で自動実行

## 開発コマンド

### 基本開発

パッケージマネージャは **pnpm**（npm は禁止）。

```bash
# 依存関係インストール（リポジトリルートで）
pnpm install

# ローカル開発サーバー起動（認証スキップ）
pnpm dev

# 本番ビルド
pnpm build

# dev環境用ビルド
pnpm run build:dev

# prod環境用ビルド
pnpm run build:prod

# 単体テスト（Vitest）
pnpm test

# コード品質チェック
pnpm run lint
```

### デプロイ

デプロイは GitHub Actions（`deploy-frontend.yml`）が行う。手動の S3 sync はしない。

- **dev**: `develop` への push で自動実行（`frontend/**` を変更した push のみ起動）
- **prod**: タグ push（`v1.x.x`）で自動実行

S3 へ同期しただけでは CloudFront のエッジキャッシュが切り替わらないため、
ワークフローは同期後に **CloudFront invalidation** を実行して完了を待つ。
手動でデプロイせざるを得ない場合も invalidation を忘れないこと。

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

環境判定と認証要否は `src/utils/environment.ts` にある。

- `getEnvironment()`: `local` / `dev` / `prod` を判定
- `isAuthRequired()`: localhost なら false。`VITE_AUTH_REQUIRED` が指定されていればその値。
  それ以外（dev / prod）は true

Cognito の接続設定（User Pool ID・Client ID・OAuth ドメイン）は `src/config/amplify.ts`。
値は `VITE_COGNITO_USER_POOL_ID` などの環境変数から注入する。

### 管理者判定

実名の閲覧・編集は admin グループ所属が条件。フロント側は
`user?.groups?.includes('admin')` で表示を出し分ける（`AppLayout.tsx`・`PlayerTable.tsx` ほか）。
これは表示制御にすぎず、実際の防御は API Gateway の authorizer と Lambda 側の
admin クレーム検証が担う。フロントの分岐だけに頼らないこと。

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
- **並列デプロイ**: `deploy-infra.yml`・`deploy-frontend.yml` による効率的デプロイ
- **品質保証サイクル**: 文書同期・UI改善・デプロイ自動化の統合プロセス
- **ドキュメント品質管理**: CHANGELOG統合・概要重視による長期保守性向上

## 関連ドキュメント

- [SPA Routing Guide](../docs/common/SPA_ROUTING_GUIDE.md) - **SPAルーティング詳細**
- [AWS Architecture](../docs/aws/)
- [Development Workflow](../docs/aws/AWS_DEVELOPMENT_WORKFLOW.md)
- [Cognito 管理者セットアップ](../docs/aws/COGNITO_ADMIN_SETUP.md) - **admin グループの用意**
- [CI/CD ガイド](../docs/aws/CI_CD.md)
- [.claude/CLAUDE.md](../.claude/CLAUDE.md) - 開発ガイダンス
