# スクリプトガイド

**最終更新**: 2026-08-23 - pnpm コマンド体系・実測値に追随

## 🚀 基本コマンド

```bash
pnpm install                      # 依存関係インストール（npm禁止）
pnpm --filter frontend dev        # 開発サーバー（Doppler dev_local 経由）
pnpm test                         # ルートの単体・統合テスト（Vitest）
pnpm run test:e2e:local           # E2Eテスト
pnpm run ci-check                 # 品質チェック
```

## 📋 主要スクリプト

### 開発

| コマンド                       | 説明                     |
| ------------------------------ | ------------------------ |
| `pnpm --filter frontend dev`   | 開発サーバー             |
| `pnpm --filter frontend build` | フロントエンド本番ビルド |
| `pnpm run lint`                | コード品質               |

### テスト

| コマンド                      | 説明             | 実測（2026-08-23）                        |
| ----------------------------- | ---------------- | ----------------------------------------- |
| `pnpm test`                   | ルート単体・統合 | 339 passed / 5 skipped                    |
| `pnpm --filter frontend test` | フロント単体     | 106 passed                                |
| `pnpm run test:e2e:api:dev`   | API専用          | 数秒                                      |
| `pnpm run test:e2e:dev`       | dev フル         | 67 passed / 7 skipped / 0 failed（約8分） |

E2E は Doppler の `e2e_dev` / `e2e_prod` config から Cognito 認証情報を注入して実ログインする。

### デプロイ

```bash
git push origin develop   # dev自動（frontend/**、pro-candidate-aws/** の変更時のみ）
gh release create v1.x.x --target develop   # prod自動（Release publish がトリガー）
```

### 検証

```bash
scripts/verify-lambda-environment.sh dev   # dev環境
scripts/verify-lambda-environment.sh prod  # prod環境
```

### Bashスクリプト

| ファイル                         | 役割                                            |
| -------------------------------- | ----------------------------------------------- |
| `verify-lambda-environment.sh`   | AWS環境検証                                     |
| `cleanup-dependabot-branches.sh` | ブランチ整理                                    |
| `run-e2e-test.sh`                | E2E実行制御（`test:e2e:*` の実体）              |
| `get-e2e-env.sh`                 | CloudFormation から E2E 用 URL を動的取得       |
| `ensure-cognito-admin.sh`        | Cognito の admin グループ・ユーザーを冪等に用意 |
| `verify-s3-website-config.sh`    | S3 Website 設定の確認                           |

### Node.jsスクリプト

| ファイル                | 役割                       |
| ----------------------- | -------------------------- |
| `serve-e2e-reports.js`  | E2E レポートのローカル配信 |
| `quality-gate-check.js` | 品質ゲート判定             |
| `aws-health-monitor.js` | AWS ヘルス監視             |

詳細は[DEPLOYMENT.md](DEPLOYMENT.md)参照
