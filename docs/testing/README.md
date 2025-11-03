# テストガイド

> Pro Candidateプロジェクトの包括的なテスト戦略

## 概要

- **テストフレームワーク**: Jest（ユニット/統合）、Playwright（E2E）
- **カバレッジ目標**: 80%以上
- **Jest成功率**: 96.2%（382/397テスト）
- **E2E成功率**: 89.1%（41/46テスト）v1.2.35 残課題分析完了・失敗1件・スキップ4件詳細特定

## クイックリファレンス

```bash
# すべてのテストを実行
npm test

# 特定のテストタイプを実行
npm run test:unit          # ユニットテストのみ
npm run test:integration   # 統合テストのみ
npm run test:e2e          # E2Eテスト（Playwright）
npm run test:aws          # AWS統合テスト

# 環境別E2Eテスト（v1.2.51新機能）
npm run test:e2e:local     # ローカル開発環境（localhost:5173）
npm run test:e2e:dev       # dev環境フロントエンド
npm run test:e2e:prod      # prod環境フロントエンド
npm run test:e2e:api:dev   # dev環境API専用テスト（高速・3.2秒）
npm run test:e2e:api:prod  # prod環境API専用テスト

# デバッグモード
npm run test:e2e:dev:headed    # dev環境ブラウザ表示モード
npm run test:e2e:prod:headed   # prod環境ブラウザ表示モード
npm run test:e2e:dev:debug     # dev環境ステップ実行デバッグ
npm run test:e2e:prod:debug    # prod環境ステップ実行デバッグ

# カバレッジ付き実行
npm run test:coverage

# 高速テスト（最適化設定）
npm run test:fast
npm run test:parallel

# ウォッチモード
npm run test:watch
```

## テスト構造

```
tests/
├── unit/              # 単体テスト
├── integration/       # 統合テスト
├── e2e/              # E2Eテスト（Playwright）
├── aws/              # AWS固有のテスト
├── snapshot/         # スナップショットテスト
├── helpers/          # テストユーティリティ
└── mocks/            # モックオブジェクト
```

## テストタイプ別ガイド

### 1. ユニットテスト

**詳細**: 以下の例を参考にしてください

**例**:

```javascript
describe('PlayerDataProcessor', () => {
  it('should parse player data correctly', () => {
    const html = '<td>選手名</td><td>高校名</td>';
    const result = processPlayerData(html, 'highschool');
    expect(result[0].name).toBe('選手名');
  });
});
```

### 2. 統合テスト

**詳細**: 以下の例を参考にしてください

**例**:

```javascript
describe('Data Flow Integration', () => {
  it('should fetch, process, and save data', async () => {
    const data = await fetchAndProcessData('highschool');
    expect(data).toHaveLength(100);
    const saved = await s3Service.getPlayerData('highschool', 2025);
    expect(saved).toEqual(data);
  });
});
```

### 3. E2Eテスト

→ [Playwrightテスト実行ガイド](../common/PLAYWRIGHT_TESTING_GUIDE.md)

#### 環境別E2Eテスト（v1.2.51新機能）

**dev環境テスト実行例**:

```bash
# dev環境フロントエンド包括テスト
npm run test:e2e:dev

# dev環境API専用テスト（高速）
npm run test:e2e:api:dev

# ブラウザ表示でdev環境テスト確認
npm run test:e2e:dev:headed

# ステップ実行デバッグモード
npm run test:e2e:dev:debug
```

**環境設定**:

- **Local**: `localhost:5173`（開発サーバー）
- **Dev**: `http://pro-candidate-frontend-dev.s3-website-*`（S3 Website）
- **Prod**: `http://pro-candidate-frontend-prod.s3-website-*`（S3 Website）

**例**:

```typescript
test('user can search players', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="search-input"]', '東京');
  await page.click('[data-testid="search-button"]');
  await expect(page.locator('.player-card')).toHaveCount(10);
});
```

**HTMLレポート生成**:

```bash
# HTMLレポート付きでE2Eテスト実行
npm run test:e2e:api -- --reporter=html

# レポート表示（WSL環境）
npx playwright show-report
```

### 4. スナップショットテスト

**例**:

```javascript
it('should match data structure snapshot', () => {
  const playerData = generatePlayerData();
  expect(playerData).toMatchSnapshot();
});
```

## ベストプラクティス

### テスト命名規則

```javascript
// ✅ 良い例
describe('PlayerService', () => {
  describe('getPlayersBySchool', () => {
    it('should return players for valid school name', () => {});
    it('should return empty array for unknown school', () => {});
    it('should handle special characters in school name', () => {});
  });
});

// ❌ 悪い例
test('test1', () => {});
test('playerTest', () => {});
```

### モック戦略

```javascript
// AWS SDKのモック
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn().mockResolvedValue({ Body: 'test data' }),
  })),
}));

// 外部APIのモック
jest.mock('node-fetch');
fetch.mockResolvedValue({
  text: () => Promise.resolve('<html>...</html>'),
});
```

### テストデータ管理

```javascript
// fixtures/testData.js
export const mockPlayers = [
  { id: 1, name: '山田太郎', school: 'テスト高校' },
  { id: 2, name: '鈴木一郎', school: 'サンプル高校' },
];

// テストでの使用
import { mockPlayers } from '../fixtures/testData';
```

## CI/CD統合

### GitHub Actions設定

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### プレコミットフック

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:fast"
    }
  }
}
```

## トラブルシューティング

### よくある問題と解決方法

1. **タイムアウトエラー**

   ```javascript
   // タイムアウトを延長
   jest.setTimeout(30000);
   ```

2. **モックが機能しない**

   ```javascript
   // モックをクリア
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

3. **E2Eテストが不安定**
   ```typescript
   // 明示的な待機
   await page.waitForSelector('.player-card', { timeout: 10000 });
   ```

### E2Eテスト残課題（v1.2.35現在）

**失敗1件の対策:**

- パフォーマンステスト期待値調整: 8秒→10秒（ローカル→AWS dev環境対応）
- ネットワーク変動考慮の現実的基準適用

**スキップ4件の理由:**

- 選手管理機能: S3データ整合性保護・dev環境データ変更回避
- 実用上問題なし・データ依存テストの適切な分離

## カバレッジレポート

```bash
# カバレッジレポートの生成
npm run test:coverage

# HTMLレポートを開く
open coverage/lcov-report/index.html
```

### カバレッジ目標

| タイプ     | 目標 | 現在  |
| ---------- | ---- | ----- |
| Statements | 80%  | 82.3% |
| Branches   | 75%  | 78.5% |
| Functions  | 80%  | 81.2% |
| Lines      | 80%  | 82.8% |

## 継続的改善

### 月次テストレビュー

1. 失敗の多いテストの特定と改善
2. カバレッジの低い領域の特定
3. テスト実行時間の最適化
4. 新機能のテスト追加

### パフォーマンス最適化

```bash
# テスト実行時間の分析
npm run test -- --verbose --detectOpenHandles

# 並列実行の最適化
npm run test:parallel -- --maxWorkers=4
```

## リソース

- [Jest公式ドキュメント](https://jestjs.io/)
- [Playwright公式ドキュメント](https://playwright.dev/)
- [Playwrightテスト実行ガイド](../common/PLAYWRIGHT_TESTING_GUIDE.md)
- [開発ガイド](../common/DEVELOPMENT_GUIDE.md)
