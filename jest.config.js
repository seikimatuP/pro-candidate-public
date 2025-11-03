/** @type {import('jest').Config} */
const NODE_MODULES_PATH = 'node_modules/';

const config = {
  preset: 'ts-jest',
  verbose: true,
  testEnvironment: 'node',
  roots: ['<rootDir>/src/', '<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.js',
    '!**/tests/e2e/**',
    '!**/tests/mocks/**',
    '!**/tests/helpers/**',
    '!**/tests/fixtures/**',
  ],
  transform: {
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      {
        presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    // 主要なファイルのみカバレッジ対象とする
    'src/main.ts',
    'src/core_utils.ts',
    'src/util.ts',
    'src/scripts/draft_scraping.js',
    'src/scripts/error_handler.ts',
    'src/scripts/validation_utils.ts',
    'src/scripts/cache_manager.ts',
    'src/scripts/config_manager.ts',
    'src/services/*.ts',
    // 除外パターン
    '!**/node_modules/**',
    '!**/vendor/**',
    '!src/**/*.d.ts',
    '!src/templates/**',
    '!src/**/*.test.{js,ts}',
    '!src/**/__tests__/**/*',
  ],
  coveragePathIgnorePatterns: [
    NODE_MODULES_PATH,
    '/tests/', // テストファイルを除外
    '/coverage/',
    '/__tests__/',
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageDirectory: 'coverage',
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  moduleDirectories: ['node_modules', 'src'],
  testTimeout: 10000,
  testPathIgnorePatterns: [
    NODE_MODULES_PATH,
    '/dist/',
    '/tests/e2e/',  // E2Eテストを除外（Playwrightで実行）
    '/playwright/',  // Playwright関連を除外
    '\\.spec\\.ts$',     // Playwright spec ファイルを除外
    '\\.spec\\.js$',
    // レガシーテストをスキップ
    '/tests/unit/scripts/cache_system.test.js',
    '/tests/unit/core/high_school_player_async.test.js',
  ],
  globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  snapshotSerializers: [],
  reporters: ['default'],
  snapshotResolver: null,
  // パフォーマンス最適化設定
  maxWorkers: '50%', // CPUコアの半分を使用して並列実行
  bail: false, // すべてのテストを実行
  cacheDirectory: '.jest-cache', // テスト結果をキャッシュ
  workerIdleMemoryLimit: '512MB', // ワーカーごとのメモリ制限
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': '<rootDir>/tests/mocks/uuid.js'
  },
  cache: true,
  randomize: true,
  slowTestThreshold: 5,
  // 高速化のためにカバレッジのしきい値チェックはCIのみで実行
  coverageThreshold: process.env.CI
    ? {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      }
    : undefined,
  // 監視モード時に最適化
  watchPathIgnorePatterns: [NODE_MODULES_PATH, '/dist/', '/coverage/'],
  // 検出されたメモリリークを警告（無効化してテストを安定化）
  detectLeaks: false,
  // メモリリーク対策
  forceExit: true,
  detectOpenHandles: false,
};

module.exports = config;
