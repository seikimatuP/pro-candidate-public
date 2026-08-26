import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

// 環境判定: E2E_BASE_URLから環境を特定（動的CloudFront対応）
function getEnvironment(): string {
  const environment = process.env.E2E_ENVIRONMENT;
  if (environment && ['local', 'dev', 'prod'].includes(environment)) {
    return environment;
  }
  
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
  
  if (baseUrl.includes('prod.s3-website') || baseUrl.includes('prod/')) {
    return 'prod';
  } else if (baseUrl.includes('dev.s3-website') || baseUrl.includes('dev/')) {
    return 'dev';
  } else if (baseUrl.includes('.cloudfront.net')) {
    // CloudFrontの場合はE2E_ENVIRONMENTを使用（既に上で確認済み）
    return 'local'; // フォールバック
  } else {
    return 'local';
  }
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* 環境別テスト結果出力ディレクトリ */
  outputDir: `test-results/${getEnvironment()}/artifacts`,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { 
      outputFolder: `playwright-report/${getEnvironment()}`,
      open: 'never',
      attachmentsBaseURL: 'data:' 
    }],
    ['json', { outputFile: `test-results/${getEnvironment()}/results.json` }],
    ['junit', { outputFile: `test-results/${getEnvironment()}/junit.xml` }],
    ['list'] // コンソール出力用
  ],
  /* メタデータ設定 */
  metadata: {
    environment: getEnvironment(),
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    timestamp: new Date().toISOString()
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
    /* 環境別タイムアウト設定 - ネットワーク遅延対応（v1.2.69 + v1.4.1 prod対応） */
    actionTimeout: getEnvironment() !== 'local' ? 180000 : 30000,      // dev/prod: 3分（遅延対応）
    navigationTimeout: getEnvironment() !== 'local' ? 300000 : 60000,  // dev/prod: 5分（初回接続対応）
  },

  /* 環境別テストタイムアウト設定 - ネットワーク遅延対応（v1.2.69 + v1.4.1 prod対応） */
  timeout: getEnvironment() !== 'local' ? 240000 : 30000,  // dev/prod: 4分（全体テストタイムアウト）

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        },
        /* 認証状態を使用 */
        storageState: getEnvironment() !== 'local' ? `playwright/.auth/${getEnvironment()}.json` : undefined,
      },
      /* 環境別プロジェクトメタデータ */
      metadata: {
        environment: getEnvironment(),
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
        timestamp: new Date().toISOString()
      },
      dependencies: getEnvironment() !== 'local' ? ['setup'] : [],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: (process.env.E2E_ENVIRONMENT === 'local' && !process.env.DOCKER_ENV) ? {
    command: 'cd frontend && VITE_USE_PRODUCTION_DATA=false npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    ignoreHTTPSErrors: true,
  } : undefined,
});