# ESLint 9 移行計画書

**作成日**: 2025-10-07
**対象バージョン**: ESLint 8.57.1 → 9.37.0
**影響範囲**: プロジェクト全体
**状態**: ✅ **移行完了**（2025-10-07実施）
**完了報告**: [ESLINT_9_MIGRATION_COMPLETE.md](./ESLINT_9_MIGRATION_COMPLETE.md)

---

## 📋 目次

1. [現状分析](#現状分析)
2. [移行概要](#移行概要)
3. [段階的移行計画](#段階的移行計画)
4. [Flat Config変換](#flat-config変換)
5. [リスク評価](#リスク評価)
6. [ロールバック計画](#ロールバック計画)
7. [検証計画](#検証計画)

---

## 現状分析

### 既存のESLint設定

**設定ファイル構成**:

```
pro-candidate/
├── .eslintrc.js              # ルート設定（TypeScript対応）
├── .eslintrc.json            # 追加設定
├── .eslintrc.security.js     # セキュリティ設定
└── pro-candidate-aws/
    └── lambda/
        └── .eslintrc.js      # Lambda専用設定
```

### 現在の依存関係

```json
{
  "eslint": "^8.57.1",
  "@typescript-eslint/eslint-plugin": "^8.43.0",
  "@typescript-eslint/parser": "^8.40.0",
  "eslint-config-prettier": "^10.1.8",
  "eslint-plugin-googleappsscript": "^1.0.4",
  "eslint-plugin-import": "^2.26.0",
  "eslint-plugin-n": "^17.23.1",
  "eslint-plugin-prettier": "^5.5.4",
  "eslint-plugin-promise": "^6.6.0",
  "eslint-plugin-security": "^1.7.1",
  "eslint-plugin-sonarjs": "^3.0.5"
}
```

### ルート設定（.eslintrc.js）の特徴

- **TypeScript対応**: @typescript-eslint/parser使用
- **プラグイン**: SonarJS（品質）・Security（セキュリティ）
- **推奨設定**: eslint:recommended、plugin:@typescript-eslint/recommended
- **テストファイル特別ルール**: overridesで緩和

### Lambda設定（lambda/.eslintrc.js）の特徴

- **独立設定**: `root: true`で上位設定無視
- **CommonJS**: Node.js Lambda環境特化
- **シンプルルール**: eslint:recommendedのみ
- **グローバル変数定義**: AWS Lambda環境変数明示

---

## 移行概要

### ESLint 9の主な変更点

#### 1. Flat Config形式がデフォルト

**旧形式（.eslintrc.js）**:

```javascript
module.exports = {
  extends: ['eslint:recommended'],
  rules: { 'no-unused-vars': 'error' },
};
```

**新形式（eslint.config.js）**:

```javascript
import js from '@eslint/js';
export default [js.configs.recommended, { rules: { 'no-unused-vars': 'error' } }];
```

#### 2. プラグイン読み込み変更

**旧**: 文字列指定

```javascript
plugins: ['@typescript-eslint', 'sonarjs'];
```

**新**: オブジェクトインポート

```javascript
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';

export default [{ plugins: { '@typescript-eslint': typescriptEslint, sonarjs } }];
```

#### 3. extends削除・configs使用

**旧**:

```javascript
extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended']
```

**新**:

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';

export default [js.configs.recommended, ...typescript.configs.recommended];
```

#### 4. Node.js最低バージョン

- **要件**: Node.js 18.18.0+
- **現在**: Node.js 22.16.0（✅ 満たす）

---

## 段階的移行計画

### Phase 1: 準備（1-2日）

**目的**: 互換性確認・テスト環境構築

**作業内容**:

1. ESLint 9.37.0インストール（別ブランチ）
2. プラグイン互換性確認
3. Flat Config変換テスト

**成果物**:

- 互換性レポート
- テスト用eslint.config.js

**検証基準**:

- プラグイン全てESLint 9対応確認
- TypeScriptコンパイル成功

### Phase 2: Flat Config作成（2-3日）

**目的**: 新形式設定ファイル作成

**作業内容**:

#### 2-1. ルート設定変換

**対象**: `.eslintrc.js` → `eslint.config.js`

**変換手順**:

1. CommonJS → ES Modules変換
2. プラグインインポート追加
3. extends → configs配列変換
4. overrides → 複数設定オブジェクト

**サンプル（eslint.config.js）**:

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';

export default [
  // グローバル無視設定
  {
    ignores: ['node_modules/**', 'dist/**', 'cdk.out/**', '*.config.js'],
  },

  // 基本設定
  js.configs.recommended,

  // TypeScript設定
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        browser: true,
        es2021: true,
        node: true,
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      sonarjs: sonarjs,
      security: security,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // SonarJS
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/cognitive-complexity': ['error', 15],

      // Security
      'security/detect-object-injection': 'warn',
      'security/detect-unsafe-regex': 'error',
    },
  },

  // テストファイル設定
  {
    files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
    rules: {
      'sonarjs/cognitive-complexity': 'off',
      'security/detect-object-injection': 'off',
    },
  },
];
```

#### 2-2. Lambda設定変換

**対象**: `pro-candidate-aws/lambda/.eslintrc.js` → `eslint.config.mjs`

**サンプル（lambda/eslint.config.mjs）**:

```javascript
import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/**', 'tests/**'],
  },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        exports: 'writable',
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-undef': 'error',
      eqeqeq: 'error',
      'no-eval': 'error',
      indent: ['warn', 2],
      quotes: ['warn', 'single'],
      semi: ['warn', 'always'],
    },
  },
];
```

**成果物**:

- `eslint.config.js`（ルート）
- `pro-candidate-aws/lambda/eslint.config.mjs`

**検証基準**:

- 既存ルールすべて移行
- プラグイン動作確認

### Phase 3: 並行稼働テスト（1-2日）

**目的**: 新旧設定での同一性検証

**作業内容**:

1. 旧設定でのLint実行・結果保存
2. 新設定でのLint実行・結果保存
3. 差分分析・意図しない違い修正

**検証コマンド**:

```bash
# 旧設定（ESLint 8）
ESLINT_USE_FLAT_CONFIG=false npx eslint . --ext .js,.ts > old-lint.log 2>&1

# 新設定（ESLint 9）
ESLINT_USE_FLAT_CONFIG=true npx eslint . > new-lint.log 2>&1

# 差分確認
diff old-lint.log new-lint.log
```

**検証基準**:

- 警告/エラー数の一致（±5%以内）
- 意図しない新規エラーがないこと

### Phase 4: 本番適用（1日）

**目的**: 本番環境への正式移行

**作業内容**:

1. ESLint 9.37.0への依存関係更新（#241マージ）
2. 旧設定ファイル削除
3. package.json scripts更新
4. CI/CD設定更新

**削除ファイル**:

```bash
rm .eslintrc.js
rm .eslintrc.json
rm .eslintrc.security.js
rm pro-candidate-aws/lambda/.eslintrc.js
```

**package.json更新**:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

**GitHub Actions更新**:

```yaml
# .github/workflows/quality-check.yml
- name: ESLint Check
  run: |
    npm run lint
```

**成果物**:

- ESLint 9完全移行
- 旧設定ファイル削除完了

**検証基準**:

- GitHub Actions成功
- ローカル環境動作確認

### Phase 5: 最適化（1-2日）

**目的**: ESLint 9新機能活用

**作業内容**:

1. 新ルール追加検討
2. パフォーマンス最適化
3. ドキュメント更新

**新機能活用例**:

```javascript
// TypeScript構文対応の強化
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: ['../*'] // TypeScript importパターン制限
    }]
  }
}
```

---

## Flat Config変換

### 変換チェックリスト

#### ✅ 基本構造

- [ ] CommonJS → ES Modules
- [ ] module.exports → export default
- [ ] 配列形式のconfig

#### ✅ プラグイン

- [ ] 文字列 → インポートオブジェクト
- [ ] extends削除
- [ ] ...configs.recommended使用

#### ✅ パーサー

- [ ] parser文字列 → languageOptions.parser
- [ ] parserOptions → languageOptions.parserOptions

#### ✅ 環境

- [ ] env削除
- [ ] languageOptions.globals使用

#### ✅ ファイルパターン

- [ ] files配列で指定
- [ ] ignores配列で除外

#### ✅ オーバーライド

- [ ] overrides削除
- [ ] 複数設定オブジェクトに分割

### プラグイン互換性確認

| プラグイン                       | ESLint 9対応 | 備考     |
| -------------------------------- | ------------ | -------- |
| @typescript-eslint/eslint-plugin | ✅ v8.0.0+   | 問題なし |
| eslint-plugin-sonarjs            | ✅ v2.0.0+   | 問題なし |
| eslint-plugin-security           | ✅ v3.0.0+   | 問題なし |
| eslint-plugin-prettier           | ✅ v5.0.0+   | 問題なし |
| eslint-plugin-import             | ✅ v2.30.0+  | 問題なし |
| eslint-config-prettier           | ✅ v9.0.0+   | 問題なし |

**全プラグイン対応済み** ✅

---

## リスク評価

### 🔴 高リスク

**リスク**: Flat Config変換ミスで全ファイルLintエラー

**影響**:

- CI/CDブロック
- 開発停止

**対策**:

1. 段階的移行（Phase 2-3で十分検証）
2. 並行稼働期間設定
3. ロールバック手順準備

**検知方法**:

- Phase 3差分分析で事前検知
- テストブランチでの完全検証

### 🟡 中リスク

**リスク**: プラグイン互換性問題

**影響**:

- 一部ルール動作不良
- 警告増加

**対策**:

1. プラグイン最新版使用
2. 互換性マトリックス確認
3. 問題発生時は該当プラグイン一時無効化

**検知方法**:

- Phase 1互換性確認
- npm依存関係チェック

### 🟢 低リスク

**リスク**: 設定ファイル名変更によるツール連携問題

**影響**:

- IDEプラグイン認識失敗
- 一部ツール動作不良

**対策**:

1. VSCode設定更新
2. チーム周知

---

## ロールバック計画

### 即座ロールバック（緊急時）

**トリガー**:

- CI/CD完全ブロック
- 重大なLintエラー大量発生

**手順**:

```bash
# 1. PR #241をクローズ（ESLint 9更新を戻す）
gh pr close 241

# 2. developブランチに戻る
git checkout develop
git pull origin develop

# 3. 旧設定ファイル復元（必要なら）
git checkout HEAD~1 .eslintrc.js

# 4. 依存関係再インストール
npm install

# 5. 動作確認
npm run lint
```

**所要時間**: 5-10分

### 計画的ロールバック（検証後）

**トリガー**:

- Phase 3検証で許容できない差異
- パフォーマンス大幅劣化

**手順**:

1. 新設定の問題点分析
2. 修正版作成・再検証
3. 問題解決まで旧設定維持

---

## 検証計画

### Phase別検証項目

#### Phase 1検証

- [ ] Node.js 18.18.0+要件確認
- [ ] 全プラグインESLint 9対応確認
- [ ] npm install成功

#### Phase 2検証

- [ ] eslint.config.js構文エラーなし
- [ ] npx eslint --config eslint.config.js実行成功
- [ ] TypeScript型チェック成功

#### Phase 3検証

- [ ] 旧新設定での警告/エラー数差異±5%以内
- [ ] 新規意図しないエラーなし
- [ ] 全ファイル形式（.js/.ts/.tsx）動作確認

#### Phase 4検証

- [ ] GitHub Actions成功
- [ ] ローカル開発環境動作確認
- [ ] VSCode ESLint拡張機能動作

#### Phase 5検証

- [ ] Lint実行時間許容範囲内
- [ ] 新ルール効果測定
- [ ] ドキュメント完全性

### 自動化テスト

**CI/CD統合**:

```yaml
# .github/workflows/eslint-migration-test.yml
name: ESLint 9 Migration Test

on:
  pull_request:
    branches: [develop]
    paths:
      - 'eslint.config.js'
      - 'package.json'

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install Dependencies
        run: npm ci

      - name: ESLint Check
        run: npm run lint

      - name: TypeScript Check
        run: npx tsc --noEmit --strict

      - name: Report
        if: failure()
        run: echo "ESLint 9 migration validation failed"
```

### 手動検証チェックリスト

**Phase 4完了後**:

- [ ] ルートディレクトリでnpm run lint実行成功
- [ ] pro-candidate-aws/でnpm run lint実行成功
- [ ] frontend/でnpm run lint実行成功
- [ ] VSCodeでTypeScriptファイル開いてエラー表示なし
- [ ] git commit時のhusky pre-commit hook成功

---

## スケジュール

### 推奨タイムライン

| Phase   | 期間  | 開始日     | 完了予定   |
| ------- | ----- | ---------- | ---------- |
| Phase 1 | 1-2日 | 2025-10-08 | 2025-10-09 |
| Phase 2 | 2-3日 | 2025-10-10 | 2025-10-12 |
| Phase 3 | 1-2日 | 2025-10-13 | 2025-10-14 |
| Phase 4 | 1日   | 2025-10-15 | 2025-10-15 |
| Phase 5 | 1-2日 | 2025-10-16 | 2025-10-17 |

**合計**: 6-10日（1.5-2週間）

### マイルストーン

1. **M1**: プラグイン互換性確認完了（Phase 1）
2. **M2**: Flat Config作成完了（Phase 2）
3. **M3**: 並行稼働検証完了（Phase 3）
4. **M4**: ESLint 9本番適用完了（Phase 4）
5. **M5**: 最適化・文書化完了（Phase 5）

---

## 成功基準

### 必須基準

- [ ] TypeScriptコンパイルエラー0件
- [ ] CI/CD全パイプライン成功
- [ ] 既存警告/エラー数±5%以内
- [ ] 全開発環境で動作確認

### 推奨基準

- [ ] Lint実行時間20%以内の増加
- [ ] ESLint 9新機能1つ以上活用
- [ ] チーム全員の移行完了

---

## 参考資料

### 公式ドキュメント

- [ESLint v9.0.0 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [Configuration Files (Flat Config)](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Configuration Migration Tool](https://eslint.org/docs/latest/use/configure/migration-guide)

### プラグイン公式ドキュメント

- [@typescript-eslint v8](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8/)
- [eslint-plugin-sonarjs](https://github.com/SonarSource/eslint-plugin-sonarjs)
- [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security)

### ツール

```bash
# ESLint公式移行ツール
npx @eslint/migrate-config .eslintrc.js

# 設定検証ツール
npx eslint --print-config src/index.ts
```

---

## 付録

### A. Flat Config完全サンプル

`docs/examples/eslint.config.complete.js`に保存

### B. トラブルシューティング

**問題**: `Cannot find module '@eslint/js'`

**解決**:

```bash
npm install --save-dev @eslint/js
```

---

**問題**: `Parsing error: ESLint was configured to run on ... using "parserOptions.project"`

**解決**:

```javascript
// eslint.config.js
{
  files: ['**/*.ts'],
  languageOptions: {
    parserOptions: {
      projectService: true, // ESLint 9新機能
      tsconfigRootDir: import.meta.dirname
    }
  }
}
```

---

**問題**: `Plugin "xxx" was not found`

**解決**:

```bash
# プラグイン再インストール
npm install --save-dev eslint-plugin-xxx@latest
```

---

### C. チーム通知テンプレート

```markdown
## ESLint 9移行のお知らせ

2025-10-XX より、ESLint 8 → 9への移行を開始します。

**影響**:

- 設定ファイル形式変更（.eslintrc.js → eslint.config.js）
- VSCode ESLint拡張機能再起動が必要な場合あり

**対応不要**:

- npm install実行で自動適用
- 既存コードの変更不要

**問題発生時**:

- #dev-channel で報告
- ロールバック手順: [リンク]

**スケジュール**:

- Phase 1-3: 検証期間（影響なし）
- Phase 4: 本番適用（2025-10-15予定）

質問はいつでもどうぞ！
```

---

**文書バージョン**: v1.0
**最終更新**: 2025-10-07
**承認者**: （承認プロセスに応じて記入）
