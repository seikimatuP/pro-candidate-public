/**
 * パフォーマンス最適化済みのJest設定
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 高速化のための設定
  maxWorkers: '80%',        // 並列処理のワーカー数を最適化
  bail: true,               // 最初の失敗で停止（CI環境で時間節約）
  verbose: false,           // 冗長な出力を抑制
  
  // キャッシュの有効化
  cache: true,              
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // テスト実行の最適化
  testTimeout: 10000,       // タイムアウトを設定
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  
  // テスト対象の限定
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  
  // 変換処理の設定
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true // 高速化のため個別モジュールとして処理
    }],
    '^.+\\.jsx?$': 'babel-jest'
  },
  
  // SonarQubeレポート出力設定
  testResultsProcessor: 'jest-sonar-reporter',
  
  // 特定の重いテストケースのみを分離して実行
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.[jt]s?(x)'],
      testTimeout: 5000,
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.[jt]s?(x)'],
      testTimeout: 15000,
    },
    {
      displayName: 'snapshot',
      testMatch: ['<rootDir>/tests/snapshot/**/*.test.[jt]s?(x)'],
      testTimeout: 5000,
    }
  ],
  
  // すべてのテストファイルをバッチではなく、個別に実行
  runInBand: process.env.CI === 'true',
  
  // カバレッジ設定を最適化
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/mocks/**'
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'json-summary'],
  
  // 最適化NPMスクリプトの追加用コメント
  // package.jsonに追加するスクリプト:
  // "test:fast": "jest --config=jest.config.optimized.js",
  // "test:parallel": "jest --config=jest.config.optimized.js --maxWorkers=4",
  // "test:unit:fast": "jest --config=jest.config.optimized.js --selectProjects=unit"
};
