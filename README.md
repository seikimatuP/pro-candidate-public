# プロ野球候補選手データ収集・分析ツール

日本の高校生・大学生が提出するプロ野球志望届のデータを収集し、集計・分析する AWS サーバーレスアプリケーション。
収集した実名データは認証の内側に置き、一般公開するのは人数や都道府県分布などの集計値のみ。
バックエンドは AWS CDK（Lambda + S3 + API Gateway）、フロントエンドは React + Vite で構成している。

## 環境

| 環境  | フロントエンド                        | API                                                              |
| ----- | ------------------------------------- | ---------------------------------------------------------------- |
| local | http://localhost:5173                 | Vite の proxy 経由で dev API へ                                  |
| dev   | https://d3brmn978dqs63.cloudfront.net | https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev  |
| prod  | https://dh2yk8y9mj9wl.cloudfront.net  | https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod |

## 技術スタック

| 領域           | 採用技術                                                          |
| -------------- | ----------------------------------------------------------------- |
| パッケージ管理 | pnpm 10.x（npm は使わない）・pnpm workspace                       |
| フロントエンド | React 19 / Vite / TypeScript / MUI / Redux Toolkit / Chart.js     |
| バックエンド   | AWS Lambda (Node.js 22.x) / API Gateway / Amazon S3（JSON 保存）  |
| 認証           | Amazon Cognito（User Pool + admin グループ）                      |
| 配信           | CloudFront + S3                                                   |
| IaC            | AWS CDK v2 (TypeScript)                                           |
| テスト         | Vitest（ルート・frontend）/ Jest（pro-candidate-aws）/ Playwright |
| 秘密情報管理   | Doppler                                                           |

## セットアップ

```bash
pnpm install                 # 依存関係のインストール
pnpm --filter frontend dev   # 開発サーバー（http://localhost:5173）
```

ローカルは認証をスキップして起動する。dev/prod の API を叩く操作や E2E テストには Doppler 経由の
環境変数が必要（`docs/development/DOPPLER_SETUP.md` を参照）。

## 主要コマンド

```bash
# テスト
pnpm test                    # ルートの単体テスト（Vitest）
pnpm --filter frontend test  # フロントエンドの単体テスト（Vitest）
pnpm run test:e2e:local      # E2E（ローカル）
pnpm run test:e2e:dev        # E2E（dev 環境・実ログイン）
pnpm run test:e2e:prod       # E2E（prod 環境・実ログイン）

# 品質チェック
pnpm run lint                # ESLint（frontend）
pnpm run format              # Prettier
pnpm exec tsc --noEmit       # 型チェック
pnpm run ci-check            # CI 相当の一括チェック

# ビルド・インフラ
pnpm run build               # フロントエンドの本番ビルド
pnpm run aws:synth           # CDK synth
pnpm run aws:diff            # CDK diff
```

CDK の `deploy` / `destroy` はローカルから直接実行しない。デプロイは GitHub Actions に任せる。

- dev 反映: `develop` へ push（`frontend/**` または `pro-candidate-aws/**` を含む変更のみ発火）
- prod 反映: `git tag vX.Y.Z && git push origin vX.Y.Z`
- テストコードやドキュメントだけの変更ではデプロイも E2E も走らないため、必要なら
  `gh workflow run e2e-test.yml --ref develop -f environment=dev` で手動実行する

## 公開範囲とアクセス制御

選手の実名を含むデータは一般公開しない。未ログインで見られるのはトップの集計ダッシュボードだけで、
高校生一覧・大学生一覧・選手詳細・氏名検索・学校別選手はログインを求める。

| 区分     | エンドポイント                                                        | 条件                                                     |
| -------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| 認証不要 | `GET /health` `GET /statistics` `GET /schools` `GET /years/available` | 集計値のみ                                               |
| 認証必須 | `/players` 系・`/schools/{school}/players`・`/scraping/*`・`{proxy+}` | Cognito 認証 + ID トークンの `cognito:groups` に `admin` |

API Gateway の Cognito authorizer に加えて Lambda 側でも admin クレームを検証する二重防御。
管理者アカウントの用意は `docs/aws/COGNITO_ADMIN_SETUP.md` を参照。

> **注意**: 上記は `develop` および dev 環境の状態。**prod にはまだ反映されていない**（prod は実名一覧が
> 無認証で見える旧状態のまま）。prod の挙動を前提に確認・報告するときはこの差を考慮すること。

## ディレクトリ構成

| ディレクトリ         | 内容                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| `frontend/`          | React + Vite のフロントエンド（画面・状態管理・API クライアント）         |
| `pro-candidate-aws/` | AWS CDK のインフラ定義と Lambda 実装                                      |
| `src/`               | ルートパッケージの TypeScript（ロガー・設定・バリデーション等の共通処理） |
| `shared/`            | フロントとバックエンドで共有する型・都道府県マスタ                        |
| `tests/`             | ルートのテスト（unit / integration / aws / e2e / performance / security） |
| `scripts/`           | 運用・検証用スクリプト（E2E 環境変数取得、Lambda 環境検証など）           |
| `config/`            | 環境別のアプリ設定 JSON と静的解析の設定                                  |
| `static-analysis/`   | 静的解析ダッシュボードの生成スクリプト                                    |
| `docs/`              | プロジェクトドキュメント（下記の導線を参照）                              |

## ドキュメント

- [docs/README.md](./docs/README.md) — ドキュメントの入口。クイックスタート・アーキテクチャ・運用手順への導線
- [CHANGELOG.md](./CHANGELOG.md) — 変更履歴（リリースノートはここに集約）
- [docs/development/TESTING/E2E_TESTING.md](./docs/development/TESTING/E2E_TESTING.md) — E2E テストガイド
- [docs/aws/CI_CD.md](./docs/aws/CI_CD.md) — CI/CD ガイド

## 貢献方法

1. フォークしてブランチを作成
2. コードを修正
3. テストを実行して問題がないことを確認
4. Pull Request を送る

## ポリシー

- [プライバシーポリシー](./PRIVACY_POLICY.md)
- [スクレイピングポリシー](./SCRAPING_POLICY.md)
- [セキュリティポリシー](./SECURITY.md)

## ライセンス

MIT - 詳細は [LICENSE](./LICENSE) を参照してください。
