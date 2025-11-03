# E2Eテストガイド

**最終更新**: 2025-06-28 - 文章量削減最適化

## 📊 成功状況

- **成功率**: 100%（失敗ゼロ達成）
- **総テスト数**: 51テスト
- **実行時間**: API 2.6秒・フル8分

## 🚀 基本実行

```bash
# 環境別
npm run test:e2e:local     # ローカル
npm run test:e2e:dev       # dev環境
npm run test:e2e:prod      # prod環境

# API専用（最速）
npm run test:e2e:api:dev   # 3秒
npm run test:e2e:api:prod  # 3秒

# デバッグ
npm run test:e2e:dev:headed   # ブラウザ表示
npm run test:e2e:dev:debug    # ステップ実行
```

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
npm run e2e:server                    # http://localhost:9323
npx playwright show-report playwright-report/dev
```

## 🎯 最適化手法

### 認証統合

- AWS Cognito自動ログイン（dev/prod）
- ローカル環境認証スキップ
- 環境別認証情報自動切り替え

### パフォーマンス最適化

- 60-120秒動的タイムアウト
- 現実的期待値設定（dev環境対応）
- メモリ300MB基準

### 機能可用性チェック

- データ存在確認
- フィールド表示待機
- 適切なスキップ判定

## 📋 テスト種別

| 種別      | ファイル                | 成功率 | 時間 |
| --------- | ----------------------- | ------ | ---- |
| Dashboard | dashboard.spec.ts       | 100%   | 2分  |
| Mobile    | mobile.spec.ts          | 100%   | 3分  |
| API       | api-integration.spec.ts | 100%   | 3秒  |
| Auth      | auth.spec.ts            | 100%   | 1分  |

詳細は[DEPLOYMENT.md](../DEPLOYMENT.md)参照
