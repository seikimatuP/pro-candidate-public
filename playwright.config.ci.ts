import { defineConfig, devices } from '@playwright/test';

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
        baseURL: 'https://dvj3ixbgkj.execute-api.us-east-1.amazonaws.com',
      },
    },
  ],

  /* Skip local dev server in CI environment */
  webServer: undefined,
});