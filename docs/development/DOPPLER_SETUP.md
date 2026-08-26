# Doppler 環境変数管理セットアップ

このプロジェクトは機密情報・環境変数を [Doppler](https://www.doppler.com/) で管理している。tracked な `.env*` はテンプレートの `frontend/.env.example` のみで、値はすべて Doppler CLI 経由で注入する（移行は完了済み。下の「完了済み（.env 全面廃止）」を参照）。

## 新規メンバーのセットアップ

### 1. Doppler CLI インストール

```bash
# Linux / WSL2
curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" \
  | sudo tee /etc/apt/sources.list.d/doppler-cli.list
sudo apt update && sudo apt install doppler

# macOS
brew install doppler
```

### 2. ログイン

```bash
doppler login
```

ブラウザでの認証後、CLI にトークンがキャッシュされる。

### 3. プロジェクトへの紐付け

`pro_candidate/` ディレクトリに `doppler.yaml` を配置済みなので、以下だけで自動設定される：

```bash
cd pro_candidate
doppler setup --no-interactive
```

## プロジェクト構造

| Environment | Config      | 用途                            | 含まれるキー例                              |
| ----------- | ----------- | ------------------------------- | ------------------------------------------- |
| `dev`       | `dev`       | フロントエンド dev 環境共通設定 | `VITE_API_BASE_URL`（dev用）など            |
| `dev`       | `dev_local` | ローカル開発用（機密含む）      | `VITE_DEMO_PASSWORD`, Cognito設定 など      |
| `prd`       | `prd`       | 本番環境設定                    | prod 用 Cognito ID, API URL                 |
| `e2e`       | `e2e_dev`   | E2Eテスト（dev環境）            | `COGNITO_USERNAME`, `COGNITO_PASSWORD` など |
| `e2e`       | `e2e_prod`  | E2Eテスト（prod環境）           | 同上（prod用）                              |

`doppler.yaml` のデフォルトは `dev_local` （ローカル開発想定）。

## 使い方

### フロントエンド開発サーバー

`package.json` の scripts に `doppler run` が組み込み済み：

dev サーバーは frontend パッケージ側にある（ルートに `dev` script は無い）。

```bash
# デフォルト（dev_local config 使用）
pnpm --filter frontend dev

# 明示的な config 指定
pnpm --filter frontend dev:dev   # dev config
pnpm --filter frontend dev:prod  # prd config
```

### 任意コマンドへの注入

```bash
doppler run -- <任意のコマンド>

# config 切替
doppler run --config dev -- pnpm build
doppler run --config prd -- pnpm build
```

### シークレット確認

```bash
# キー名のみ表示（値は隠蔽）
doppler secrets --only-names

# 全キーと値（慎重に）
doppler secrets
```

### シークレット追加・更新

```bash
# 個別設定
doppler secrets set VITE_NEW_KEY=value --config dev_local

# .env からアップロード
doppler secrets upload path/to/.env --config dev_local
```

## Claude Code との付き合い方

`.claude/settings.local.json` の `permissions.deny` で `.env` 系ファイルの Read をブロック済み。Claude は `.env` の中身を見ない構成になっている。

新しい機密を追加する場合：

1. ターミナルで `doppler secrets set KEY=value --config <config>` を実行（Claude に値を見せない）
2. コードからは `process.env.KEY` / `import.meta.env.KEY` で参照
3. `.env` ファイルには書かない

## CI/CD 連携（GitHub Actions）

### 必須 GitHub Secrets

GitHub リポジトリの `Settings → Secrets and variables → Actions` に以下を登録する：

| Secret 名                | 用途                            | 生成元 Doppler config |
| ------------------------ | ------------------------------- | --------------------- |
| `DOPPLER_TOKEN_DEV`      | dev 環境のフロントエンドビルド  | `dev` / `dev`         |
| `DOPPLER_TOKEN_PRD`      | prod 環境のフロントエンドビルド | `prd` / `prd`         |
| `DOPPLER_TOKEN_E2E_DEV`  | dev 環境の E2E テスト           | `e2e` / `e2e_dev`     |
| `DOPPLER_TOKEN_E2E_PROD` | prod 環境の E2E テスト          | `e2e` / `e2e_prod`    |

**未登録のまま workflow が実行されるとCIが失敗する**ので、workflow 変更を merge する前に登録を完了させること。

### Service Token 作成手順

トークン値を目視せずに GitHub Secrets に直接送るのが安全。`gh` CLI と組み合わせてパイプする：

```bash
# dev / prd（フロントエンドビルド用）
doppler configs tokens create "github-actions-dev" \
  --project pro-candidate --config dev --max-age 0 --plain | \
  gh secret set DOPPLER_TOKEN_DEV --repo seikimatuP/pro_candidate

doppler configs tokens create "github-actions-prd" \
  --project pro-candidate --config prd --max-age 0 --plain | \
  gh secret set DOPPLER_TOKEN_PRD --repo seikimatuP/pro_candidate

# e2e_dev / e2e_prod（E2E テスト用）
doppler configs tokens create "github-actions-e2e-dev" \
  --project pro-candidate --config e2e_dev --max-age 0 --plain | \
  gh secret set DOPPLER_TOKEN_E2E_DEV --repo seikimatuP/pro_candidate

doppler configs tokens create "github-actions-e2e-prod" \
  --project pro-candidate --config e2e_prod --max-age 0 --plain | \
  gh secret set DOPPLER_TOKEN_E2E_PROD --repo seikimatuP/pro_candidate
```

パイプを使わず手動登録する場合は Doppler Dashboard から：

1. <https://dashboard.doppler.com> → `pro-candidate` プロジェクト選択
2. 対象 config を開く
3. `Access → Service Tokens → Generate` でトークン生成
4. 表示された `dp.st.xxx...` 形式のトークンをコピー（表示は一度きり）
5. GitHub リポジトリの Secrets に登録

### 動作確認（Secrets 登録後）

`Actions` タブから E2E Tests workflow を手動実行：

```
Actions → E2E Tests → Run workflow → environment: dev
```

`Install Doppler CLI` step と `Run E2E Tests` step が成功すれば OK。

## 完了済み（.env 全面廃止）

- `frontend/.env.dev` / `frontend/.env.prod` は **git から削除**。tracked な `.env*` はテンプレート（`frontend/.env.example`）のみ。
- `deploy-frontend.yml` のビルド step は Doppler `dev` / `prd` config を使用。動的な `VITE_API_BASE_URL` は GitHub Actions の `env:` で注入し、`doppler run --preserve-env` により Doppler の値を上書きする。
- sed による `.env` 動的編集ロジックは撤廃済み。

## 今後の候補

| 対象                      | 現状                                   | 候補                              |
| ------------------------- | -------------------------------------- | --------------------------------- |
| Lambda 本番環境変数       | CDK で静的注入                         | AWS SSM Parameter Store / Secrets |

## トラブルシューティング

### `doppler run` でコマンドが見つからない

`doppler setup` が正しく実行されているか確認：

```bash
doppler configure
# project = pro-candidate, config = dev_local が表示されればOK
```

### Vite が環境変数を認識しない

Vite は `VITE_` プレフィックス付きキーのみクライアントに露出する。それ以外のキーを参照したい場合は Doppler 側でも `VITE_` プレフィックスを付けて登録する。

### 値が古いまま更新されない

Doppler CLI はキャッシュする。フォアグラウンドプロセスが起動中なら再起動する：

```bash
doppler run --fallback=none -- pnpm --filter frontend dev
```
