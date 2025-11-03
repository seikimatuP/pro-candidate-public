import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';
// import security from 'eslint-plugin-security'; // ESLint 9互換性問題のため一時無効化

export default [
  // グローバル無視設定
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cdk.out/**',
      '**/build/**',
      '**/coverage/**',
      'static-analysis/reports/**',
      '.scannerwork/**',
      '.sonar/**',
      'reports/**',
      'playwright-report/**',
      'test-results/**',
      'docs/api/**',
      '**/*.config.js',
      '**/*.config.ts',
      '!eslint.config.js', // ルート設定ファイルは除外しない
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.security.js',
      'examples/**',
      'check-service-worker.js',
      'pro-candidate-aws/**', // Lambda用は別設定ファイル使用
      'frontend/**', // フロントエンドは独自設定
      'tests/unit/**', // ユニットテストは独自設定
    ],
  },

  // JavaScript基本設定
  js.configs.recommended,

  // TypeScript設定
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
        projectService: true, // ESLint 9新機能：tsconfig.json自動検出
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        // browser
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',

        // ES2021
        Promise: 'readonly',
        Symbol: 'readonly',
        WeakMap: 'readonly',
        WeakSet: 'readonly',
        Proxy: 'readonly',
        Reflect: 'readonly',

        // Node.js
        process: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'writable',
        require: 'readonly',

        // Jest
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'sonarjs': sonarjs,
      // 'security': security, // ESLint 9互換性問題のため一時無効化
    },
    rules: {
      // 既存ルール
      'no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // SonarJS関連ルール（v3.0.5対応）
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-element-overwrite': 'error',
      'sonarjs/no-empty-collection': 'error',
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-identical-expressions': 'error',
      'sonarjs/no-use-of-empty-return-value': 'error',
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/max-switch-cases': ['error', 10],
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-redundant-boolean': 'error',

      // セキュリティ関連ルール - ESLint 9互換性問題のため一時無効化
      // 'security/detect-object-injection': 'warn',
      // 'security/detect-non-literal-fs-filename': 'warn',
      // 'security/detect-non-literal-regexp': 'warn',
      // 'security/detect-unsafe-regex': 'error',
    },
  },

  // テストファイル設定
  {
    files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js', '**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-identical-functions': 'off',
      // 'security/detect-object-injection': 'off', // ESLint 9互換性問題のため一時無効化
    },
  },
];
