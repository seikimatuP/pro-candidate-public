# テストガイド

> Pro Candidateプロジェクトの包括的なテスト戦略

## 概要

- **テストフレームワーク**: Vitest（ユニット/統合）、Playwright（E2E）
- **カバレッジ目標**: 80%以上（`vitest.config.ts` のしきい値は lines/functions とも 70%）
- **ルート単体テスト（2026-08-23 実測）**: 339 passed / 5 skipped
- **フロント単体テスト（同）**: 106 passed
- **dev E2E（同）**: 67 passed / 7 skipped / 0 failed

## クイックリファレンス

```bash
# すべてのテストを実行
pnpm test                     # ルート（tests/unit・tests/integration・tests/aws・src）
pnpm --filter frontend test   # フロントエンド（frontend/src）

# 特定のテストタイプを実行
pnpm run test:unit          # ユニットテストのみ
pnpm run test:integration   # 統合テストのみ
pnpm run test:aws:coverage  # AWS統合テスト（カバレッジ付き）

# 環境別E2Eテスト（v1.2.51新機能）
pnpm run test:e2e:local     # ローカル開発環境（localhost:5173）
pnpm run test:e2e:dev       # dev環境フロントエンド
pnpm run test:e2e:prod      # prod環境フロントエンド
pnpm run test:e2e:api:dev   # dev環境API専用テスト（高速・3.2秒）
pnpm run test:e2e:api:prod  # prod環境API専用テスト

# デバッグモード
pnpm run test:e2e:dev:headed    # dev環境ブラウザ表示モード
pnpm run test:e2e:prod:headed   # prod環境ブラウザ表示モード
pnpm run test:e2e:dev:debug     # dev環境ステップ実行デバッグ
pnpm run test:e2e:prod:debug    # prod環境ステップ実行デバッグ

# カバレッジ付き実行
pnpm run test:coverage

# 高速テスト（最適化設定）
pnpm run test:fast
pnpm run test:parallel

# ウォッチモード
pnpm run test:watch
```

## テスト構造

```
tests/
├── unit/              # 単体テスト
├── integration/       # 統合テスト
├── e2e/              # E2Eテスト（Playwright）
├── aws/              # AWS固有のテスト
├── performance/      # 負荷テスト
├── security/         # セキュリティスキャン
├── fixtures/         # テストデータ
├── helpers/          # テストユーティリティ
└── mocks/            # モックオブジェクト
```

フロントエンドの単体テストは `frontend/src/**` にコンポーネントと同じ場所で置く。

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

→ [E2Eテストガイド](../development/TESTING/E2E_TESTING.md)

#### 環境別E2Eテスト（v1.2.51新機能）

**dev環境テスト実行例**:

```bash
# dev環境フロントエンド包括テスト
pnpm run test:e2e:dev

# dev環境API専用テスト（高速）
pnpm run test:e2e:api:dev

# ブラウザ表示でdev環境テスト確認
pnpm run test:e2e:dev:headed

# ステップ実行デバッグモード
pnpm run test:e2e:dev:debug
```

**環境設定**:

URL は `scripts/get-e2e-env.sh` が CloudFormation スタックから動的に取得する。
取得に失敗した場合はハードコードされた CloudFront URL にフォールバックする
（S3 Website URL は最終手段であり非推奨）。

- **Local**: `http://localhost:5173`（開発サーバー）
- **Dev**: `https://d3brmn978dqs63.cloudfront.net`（CloudFront）
- **Prod**: `https://dh2yk8y9mj9wl.cloudfront.net`（CloudFront）

**認証の環境差**:

API Gateway の Cognito 認証は dev / prod とも有効で、実名系・管理系のAPIは `admin`
グループが必要。API を直接叩くテストは
`tests/e2e/helpers/api-auth.ts` の `getAuthHeaders()` で認証ヘッダーを付与する必要がある
（詳細は [E2Eテストガイド](../development/TESTING/E2E_TESTING.md)、管理者の用意は
[Cognito 管理者セットアップ](../aws/COGNITO_ADMIN_SETUP.md) を参照）。

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
pnpm run test:e2e:api -- --reporter=html

# レポート表示（WSL環境）
pnpm exec playwright show-report
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
import { vi } from 'vitest';

// AWS SDKのモック
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({ Body: 'test data' }),
  })),
}));

// 外部APIのモック
vi.mock('node-fetch');
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

テストに関係するワークフローは以下の2つ。

| ワークフロー        | トリガー                         | 内容                                                      |
| ------------------- | -------------------------------- | --------------------------------------------------------- |
| `quality-check.yml` | `develop` / `main` への push・PR | Lint、型チェック、ユニットテスト、ビルド、CDK構文チェック |
| `e2e-test.yml`      | 手動実行（workflow_dispatch）    | 環境（dev/prod）を選んで E2E テストを実行                 |

デプロイ系（`deploy-frontend.yml` / `deploy-infra.yml`）にも E2E ジョブが含まれるが、
paths フィルタがあるため `tests/` のみの変更では起動しない。

```yaml
# .github/workflows/quality-check.yml（抜粋）
name: Quality Check
on:
  push:
    branches: [develop, main]
jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v7
        with:
          node-version: '22'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:coverage
```

なお `notify-email` ジョブによるメール通知は失敗時のみ送信される
（詳細は [CI/CD メール通知設定ガイド](../cicd/EMAIL_NOTIFICATION_SETUP.md) を参照）。

### プレコミットフック

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "pnpm run test:fast"
    }
  }
}
```

## トラブルシューティング

### よくある問題と解決方法

1. **タイムアウトエラー**

   ```javascript
   // 個別のテストでタイムアウトを延長
   it('時間のかかる処理', async () => {
     // ...
   }, 30000);
   ```

2. **モックが機能しない**

   ```javascript
   // モックをクリア
   beforeEach(() => {
     vi.clearAllMocks();
   });
   ```

3. **E2Eテストが不安定**
   ```typescript
   // 明示的な待機
   await page.waitForSelector('.player-card', { timeout: 10000 });
   ```

### E2Eテストのスキップ（2026-08-23 現在）

dev 環境の実行結果は 67 passed / 7 skipped / 0 failed。スキップは主に以下の理由による。

- 選手管理機能: S3データ整合性保護・dev環境データ変更回避
- データ依存テスト: 対象データが存在しない年度・条件では自動スキップ

## カバレッジレポート

```bash
# カバレッジレポートの生成
pnpm run test:coverage

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
pnpm test -- --reporter=verbose

# 並列実行の最適化
pnpm run test:parallel
```

## リソース

- [Vitest公式ドキュメント](https://vitest.dev/)
- [Playwright公式ドキュメント](https://playwright.dev/)
- [E2Eテストガイド](../development/TESTING/E2E_TESTING.md)
- [プロジェクトドキュメント](../README.md)
