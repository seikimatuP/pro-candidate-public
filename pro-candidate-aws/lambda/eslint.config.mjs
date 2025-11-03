import js from '@eslint/js';

export default [
  // グローバル無視設定
  {
    ignores: ['node_modules/**', 'tests/**'],
  },

  // JavaScript基本設定
  js.configs.recommended,

  // Lambda専用設定
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // AWS Lambda & Node.js グローバル変数
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
      // 基本的なコード品質ルール（エラーレベル）
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Lambda環境ではconsoleログが必要
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'error',
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-irregular-whitespace': 'error',
      'no-sparse-arrays': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // ベストプラクティス（エラーレベル）
      'eqeqeq': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'no-with': 'error',
      'radix': 'error',

      // 変数（エラーレベル）
      'no-delete-var': 'error',
      'no-label-var': 'error',
      'no-shadow-restricted-names': 'error',
      'no-undef-init': 'error',

      // スタイル（警告レベル）
      'indent': ['warn', 2],
      'quotes': ['warn', 'single'],
      'semi': ['warn', 'always'],
      'comma-dangle': ['warn', 'always-multiline'],
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn',
    },
  },
];
