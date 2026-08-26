# E2Eテストガイド

**最終更新**: 2026-08-23 - 実ログイン・実トークン方式に追随

## 📊 成功状況

- **dev 実測（2026-08-23）**: 67 passed / 7 skipped / 0 failed
- **spec ファイル**: `tests/e2e/specs/` に15本
- **実行時間**: API 数秒・フル8分

## 🚀 基本実行

```bash
# 環境別
pnpm run test:e2e:local     # ローカル
pnpm run test:e2e:dev       # dev環境
pnpm run test:e2e:prod      # prod環境

# API専用（最速）
pnpm run test:e2e:api:dev   # 3秒
pnpm run test:e2e:api:prod  # 3秒

# デバッグ
pnpm run test:e2e:dev:headed   # ブラウザ表示
pnpm run test:e2e:dev:debug    # ステップ実行
```

### GitHub Actions からの手動実行

`e2e-test.yml` は `workflow_dispatch` で対象環境を選んで実行できる。
デプロイを伴わずに任意のブランチのテストコードで対象環境を検証できるため、
prod へタグを打つ前にテスト修正が有効かを確認する用途に使える。

```bash
gh workflow run e2e-test.yml --ref develop -f environment=dev
gh workflow run e2e-test.yml --ref develop -f environment=prod
gh workflow run e2e-test.yml --ref develop -f environment=prod -f api_only=true
```

`Deploy Frontend` / `Deploy Infrastructure` には paths フィルタ
（`frontend/**`、`pro-candidate-aws/**`）が設定されているため、
`tests/` のみを変更した push ではデプロイも E2E も起動しない。
テストコードだけを直した場合はこの手動実行で検証する。

## 🔧 環境設定

```bash
# 動的ドメイン取得
scripts/get-e2e-env.sh dev
scripts/run-e2e-test.sh prod --headed

# 環境変数（自動設定）
E2E_BASE_URL=https://xxx.cloudfront.net
E2E_API_URL=https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/
E2E_ENVIRONMENT=dev
```

## 📈 レポート確認

```bash
pnpm run e2e:server                    # http://localhost:9323
pnpm exec playwright show-report playwright-report/dev
```

## 🎯 最適化手法

### 認証統合

`tests/e2e/auth.setup.ts` が **実ログイン・実トークン方式**で認証する。ハードコードされた
認証情報は持たず、環境変数 `COGNITO_USERNAME` / `COGNITO_PASSWORD` から取る。値は Doppler の
`e2e_dev` / `e2e_prod` config に置き、`pnpm run test:e2e:dev` などの `doppler run` 経由で注入される
（未設定なら明示的に例外を投げる）。

- AWS Cognito 実ログイン（dev/prod）。取得したセッションを `playwright/.auth/<env>.json` に保存
- ローカル環境（`E2E_ENVIRONMENT=local`）は認証セットアップ自体をスキップ
- 環境別認証情報の自動切り替え（Doppler config の切り替えで実現）
- テストユーザーの `admin` グループ所属は CI の `scripts/ensure-cognito-admin.sh` が冪等に用意する

#### API を直接呼ぶテストの認証

API Gateway の Cognito 認証は **dev / prod とも有効**。さらに実名系・管理系の
エンドポイントは ID トークンの `cognito:groups` に `admin` が必要（Lambda 側でも検証）。

このため `request` フィクスチャで API を直接叩くテストに認証ヘッダーを付け忘れると、
dev / prod とも **401 Unauthorized** で失敗する。ブラウザ経由のテストは
`storageState` で認証済みのため影響を受けず、API 直叩きのテストだけが対象となる。

401 ではなく **403** が返る場合は、認証は通っていてテストユーザーが `admin` グループに
入っていない。`docs/aws/COGNITO_ADMIN_SETUP.md` を参照。
なお `MockAuth` はダミートークンを書き込むヘルパーだが、`storageState` の実セッションが
ある場合は上書きしない（上書きすると API が 401 になるため）。

```typescript
import { getAuthHeaders } from '../helpers/api-auth';

const response = await request.post(`${apiUrl}scraping/trigger`, {
  data: { type: 'both', year: currentYear },
  headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
});
```

`getAuthHeaders()` は `auth.setup.ts` が保存した `playwright/.auth/<env>.json` から
Cognito の idToken を読み出し、`Authorization: Bearer <token>` を組み立てる。
local 環境では認証が不要なため空オブジェクトを返す。

認証層で弾かれているかは GET で確認できる（スクレイピングは実行されない）。

```bash
# dev / prod とも 401 Unauthorized が返る（認証ヘッダーが無いため）
curl -s -o /dev/null -w "%{http_code}\n" "$API_URL/scraping/trigger"
```

### パフォーマンス最適化

- 60-120秒動的タイムアウト
- 現実的期待値設定（dev環境対応）
- メモリ300MB基準

### 機能可用性チェック

- データ存在確認
- フィールド表示待機
- 適切なスキップ判定

## 📋 テスト種別

| 種別      | ファイル                                        | 備考                             |
| --------- | ----------------------------------------------- | -------------------------------- |
| Dashboard | dashboard.spec.ts / dashboard-optimized.spec.ts | 公開ダッシュボードの表示         |
| Mobile    | mobile.spec.ts / tablet.spec.ts                 | ビューポート別                   |
| API       | api.spec.ts / api-integration.spec.ts           | `--api-only` は api.spec.ts のみ |

全14本の一覧は `tests/e2e/specs/` を参照。

認証は `tests/e2e/auth.setup.ts` のセットアッププロジェクトで済ませるため、
ログイン画面自体を対象にした spec は置いていない。

詳細は[DEPLOYMENT.md](../DEPLOYMENT.md)参照
