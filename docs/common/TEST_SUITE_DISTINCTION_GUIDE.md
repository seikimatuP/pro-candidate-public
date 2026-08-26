# テストスイート区別ガイド（v1.2.64）

## 概要

このガイドは、Playwrightテスト失敗調査（v1.2.64）で判明した「単体・統合テストとPlaywright E2Eテストの混同問題」を防ぐための区別方法を説明します。

> **注**: 調査当時のテストランナーは Jest でしたが、現在は **Vitest** に移行済みです。本文中の
> 事例（123件失敗など）は v1.2.64 時点の記録であり、現在の状態ではありません。

## 📊 テストスイート比較表

| 項目                              | Vitest 単体・統合テスト                               | Playwright E2Eテスト                      |
| --------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| **実行コマンド**                  | `pnpm test`（ルート）/ `pnpm --filter frontend test`  | `pnpm run test:e2e:dev`                   |
| **対象**                          | バックエンドコード・ユニット・統合／フロント単体      | フロントエンドUI・認証・API統合           |
| **結果ファイル**                  | `test-results.json`                                   | `test-results/{environment}/results.json` |
| **最終実行状態**                  | N/A                                                   | `test-results/.last-run.json`             |
| **HTMLレポート**                  | なし                                                  | `playwright-report/{environment}/`        |
| **現在の状態（2026-08-23 実測）** | ✅ ルート 339 passed / 5 skipped、フロント 106 passed | ✅ dev 67 passed / 7 skipped / 0 failed   |

## 🔍 調査時の確認手順

### 1. まず実行コマンドを確認

```bash
# Playwright E2Eテスト
pnpm run test:e2e:dev

# Vitest 単体・統合テスト
pnpm test
pnpm --filter frontend test
```

### 2. 結果ファイルの確認

```bash
# Playwright最終実行状態
cat test-results/.last-run.json
# 結果例: {"status": "passed", "failedTests": []}

# Vitest 結果（失敗例）
head -20 test-results.json
# 結果例: {"numFailedTests":123, "success":false}
```

### 3. 環境別結果の確認（v1.2.64新機能）

```bash
# dev環境Playwright結果
ls test-results/dev/
# 出力: artifacts/ results.json junit.xml

# HTMLレポート確認
pnpm exec playwright show-report playwright-report/dev
```

## 🚨 v1.2.64で解決した混同事例

### 報告された問題

「devのplaywrightでテスト失敗しています」

### 実際の状況（v1.2.64 当時）

- **Playwright E2E**: dev環境で33/46テスト成功継続中
- **Jest統合**: 123件失敗（別の問題）
- **混同原因**: 異なるテストスイートの結果を誤認

### 具体的な失敗例（当時の Jest）

```javascript
// GAS→AWS移行関連の古いテストコード
TypeError: draftScraping.player_list_update is not a function
TypeError: spreadsheet.insertSheet is not a function
Cannot read properties of null (reading 'match')
```

## 🛠️ v1.2.64実装改善

### 環境別結果分離

```typescript
// playwright.config.ts
export default defineConfig({
  outputDir: `test-results/${getEnvironment()}/artifacts`,
  reporter: [
    ['html', { outputFolder: `playwright-report/${getEnvironment()}` }],
    ['json', { outputFile: `test-results/${getEnvironment()}/results.json` }],
  ],
});
```

### AuthHelper接続安定性向上（v1.2.64新規）

```typescript
// tests/e2e/helpers/auth-helper.ts
// prod環境接続安定性向上：リトライロジック追加
let retryCount = 0;
const maxRetries = 2;

while (retryCount <= maxRetries) {
  try {
    await this.page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    break; // 成功したらループを抜ける
  } catch (error) {
    retryCount++;
    if (retryCount > maxRetries) {
      throw new Error(`prod環境への接続に失敗: ${error}`);
    }
    await this.page.waitForTimeout(2000);
  }
}

// 認証タイムアウト最適化：15秒→8秒に短縮
await this.page.waitForSelector(
  'input[name="username"], input[type="email"], h1:has-text("ダッシュボード")',
  { timeout: 8000 }
);
```

**改善ポイント:**

- ✅ **リトライロジック**: 最大3回試行で接続安定性向上
- ✅ **タイムアウト最適化**: 15秒→8秒に短縮で応答性向上
- ✅ **waitUntil最適化**: 'domcontentloaded'で軽量な待機条件
- ✅ **エラーハンドリング強化**: 詳細なエラーメッセージでデバッグ効率向上

### ディレクトリ構造

```
test-results/
├── .last-run.json           # Playwright最終実行状態
├── local/                   # ローカル環境結果
│   ├── artifacts/
│   ├── results.json
│   └── junit.xml
├── dev/                     # dev環境結果
│   ├── artifacts/
│   ├── results.json
│   └── junit.xml
└── prod/                    # prod環境結果
    ├── artifacts/
    ├── results.json
    └── junit.xml

playwright-report/
├── local/                   # ローカル環境HTMLレポート
├── dev/                     # dev環境HTMLレポート
└── prod/                    # prod環境HTMLレポート
```

## 📋 トラブルシューティングチェックリスト

### テスト失敗報告時の確認項目

1. **どのコマンドでテストを実行したか？**

   - [ ] `pnpm test` / `pnpm --filter frontend test` → Vitest 単体・統合テスト
   - [ ] `pnpm run test:e2e:dev` → Playwright E2E

2. **どの結果ファイルを確認したか？**

   - [ ] `test-results.json` → Vitest 結果
   - [ ] `test-results/.last-run.json` → Playwright結果
   - [ ] `test-results/{environment}/results.json` → 環境別Playwright結果

3. **エラーメッセージの内容確認**

   - [ ] `is not a function` → Vitest（単体・統合）関連の可能性高
   - [ ] `Target page, context or browser has been closed` → Playwright関連
   - [ ] `Cannot find module` → 両方の可能性

4. **環境の確認**
   - [ ] ローカル環境
   - [ ] dev環境（HTTP）
   - [ ] prod環境（HTTP）

## 🎯 予防策

### 1. 明確なコマンド使用

```bash
# Playwright E2Eテスト実行時は明示的に
pnpm run test:e2e:dev

# Vitest 単体・統合テスト実行時も明示的に
pnpm test
```

### 2. 結果確認時の注意

- Playwrightテスト結果: `test-results/{environment}/` を確認
- Vitest 結果: `test-results.json` を確認

### 3. レポート確認

```bash
# 環境別HTMLレポート確認
pnpm exec playwright show-report playwright-report/dev
pnpm exec playwright show-report playwright-report/prod
```

## 📖 関連ドキュメント

- [E2Eテストガイド](../development/TESTING/E2E_TESTING.md)
- [プロジェクトドキュメント](../README.md)
- [AWS CI/CD Troubleshooting](../aws/AWS_CICD_TROUBLESHOOTING_SECRETS.md)

## 💡 学んだ教訓

1. **問題特定の重要性**: 異なるテストスイートの結果を混同しない
2. **環境別分離の効果**: 結果を環境別に分離することで調査効率向上
3. **コマンド体系の明確化**: 明示的なコマンド使用で混同防止
4. **調査手法の標準化**: 適切な結果ファイル確認手順の確立

---

**作成日**: 2025-01-22  
**対象バージョン**: v1.2.64  
**調査対象**: Playwrightテスト失敗調査完了・Jest統合テストとの混同判明
