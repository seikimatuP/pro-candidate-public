import { defineConfig } from '@playwright/test';

/**
 * CI/軽量環境用のPlaywright設定
 * システム依存関係が不足している環境での実行に最適化
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Timeout per test */
  timeout: 30000,
  /* Global setup timeout */
  globalTimeout: 600000, // 10分
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
    /* Timeout for each action */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Configure projects for API tests only (no browser dependencies) */
  projects: [
    {
      name: 'api-tests',
      testMatch: '**/api.spec.ts',
      use: {
        // API専用テスト（ブラウザ不要）
        // 既定は dev（ap-northeast-1）。scripts/get-e2e-env.sh が CloudFormation の
        // ApiEndpoint から E2E_API_URL を注入するので、実行時はそちらが優先される。
        baseURL:
          process.env.E2E_API_URL ||
          process.env.E2E_API_BASE_URL ||
          'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev',
      },
    },
  ],

  /* Skip local dev server in CI environment */
  webServer: undefined,
});