module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:sonarjs/recommended-legacy', // SonarJS v3互換設定
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'sonarjs', // SonarJSプラグインを追加
    'security', // セキュリティプラグインを追加
  ],
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
    // 'sonarjs/no-one-iteration-loop': 'error', // v3.0.5で削除されたルール
    'sonarjs/no-use-of-empty-return-value': 'error',
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/max-switch-cases': ['error', 10],
    'sonarjs/no-duplicated-branches': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    
    // セキュリティ関連ルール
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
  },
  overrides: [
    {
      // テストファイルではいくつかのルールを緩和
      files: ['*.test.js', '*.spec.js', 'tests/**/*.js'],
      rules: {
        'sonarjs/cognitive-complexity': 'off',
        'sonarjs/no-identical-functions': 'off',
        'security/detect-object-injection': 'off',
      },
    },
  ],
};
