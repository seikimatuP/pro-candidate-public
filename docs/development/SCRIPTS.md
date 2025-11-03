# スクリプトガイド

**最終更新**: 2025-06-28 - 文章量削減最適化

## 🚀 基本コマンド

```bash
npm install && npm run dev    # 開発開始
npm test                      # テスト実行
npm run test:e2e:local       # E2Eテスト
npm run ci-check             # 品質チェック
```

## 📋 主要スクリプト

### 開発

| コマンド        | 説明         | 時間 |
| --------------- | ------------ | ---- |
| `npm run dev`   | 開発サーバー | -    |
| `npm run build` | 本番ビルド   | 17秒 |
| `npm run lint`  | コード品質   | 8秒  |

### テスト

| コマンド                   | 説明     | 成功率 | 時間 |
| -------------------------- | -------- | ------ | ---- |
| `npm test`                 | ユニット | 96.2%  | 30秒 |
| `npm run test:e2e:api:dev` | API専用  | 100%   | 3秒  |
| `npm run test:e2e:dev`     | フル     | 100%   | 8分  |

### デプロイ

```bash
git push origin develop              # dev自動
git tag v1.x.x && git push origin v1.x.x  # prod自動
```

### 検証

```bash
scripts/verify-lambda-environment.sh dev   # dev環境
scripts/verify-lambda-environment.sh prod  # prod環境
```

### AI統合

```bash
./scripts/gemini review "$(cat src/file.ts)"
./scripts/gemini debug "エラーメッセージ"
```

### Bashスクリプト

| ファイル                         | 役割         |
| -------------------------------- | ------------ |
| `verify-lambda-environment.sh`   | AWS環境検証  |
| `cleanup-dependabot-branches.sh` | ブランチ整理 |
| `run-e2e-test.sh`                | E2E実行制御  |

### Node.jsスクリプト

| ファイル                  | 役割             |
| ------------------------- | ---------------- |
| `gemini-direct-client.js` | Gemini API統合   |
| `git-hooks-setup.js`      | Git Hooks設定    |
| `dependency-check.js`     | 依存関係チェック |

詳細は[DEPLOYMENT.md](DEPLOYMENT.md)参照
