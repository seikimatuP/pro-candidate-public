import { defineConfig, devices } from '@playwright/test';
import { getEnvironmentConfig } from './tests/e2e/config/environment-config';

/**
 * ネットワーク遅延対策を施した最適化版Playwright設定
 */

const envConfig = getEnvironmentConfig();

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: `test-results/${envConfig.name}/artifacts`,
  
  // 並列実行の最適化
  fullyParallel: envConfig.name === 'local', // ローカルのみ並列実行
  workers: envConfig.name === 'local' ? 4 : 1, // dev/prodは1ワーカー
  
  // リトライ設定
  retries: envConfig.name === 'local' ? 0 : 2,
  
  // タイムアウト設定（環境別）
  timeout: envConfig.timeouts.test,
  globalTimeout: envConfig.timeouts.test * 10, // 全体のタイムアウト
  
  // レポーター設定
  reporter: [
    ['list'],
    ['html', { 
      outputFolder: `playwright-report/${envConfig.name}`,
      open: 'never',
    }],
    ['json', { 
      outputFile: `test-results/${envConfig.name}/results.json` 
    }],
    // CI環境でのGitHub Actions用アノテーション
    process.env.CI ? ['github'] : null,
  ].filter(Boolean) as any,

  // グローバル設定
  use: {
    baseURL: envConfig.baseUrl,
    
    // タイムアウト（環境別最適化）
    actionTimeout: envConfig.timeouts.action,
    navigationTimeout: envConfig.timeouts.navigation,
    
    // トレース設定（デバッグ用）
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // ビューポート設定
    viewport: { width: 1280, height: 720 },
    
    // ネットワーク設定
    ignoreHTTPSErrors: true,
    
    // User-Agent（S3対策）
    userAgent: 'Mozilla/5.0 (compatible; E2E-Test/1.0)',
    
    // その他の最適化
    hasTouch: false,
    isMobile: false,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  },

  // プロジェクト設定
  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /global-teardown\.ts/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // ブラウザ起動オプション（安定性向上）
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-zygote',
            '--disable-gpu',
            // ネットワーク最適化
            '--aggressive-cache-discard',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
          // スローモーション（デバッグ時のみ）
          slowMo: process.env.DEBUG ? 250 : 0,
        },
        // コンテキストオプション
        contextOptions: {
          // HTTPクレデンシャル（必要な場合）
          httpCredentials: envConfig.name !== 'local' ? {
            username: process.env.HTTP_USERNAME || '',
            password: process.env.HTTP_PASSWORD || '',
          } : undefined,
          // オフラインモード無効化
          offline: false,
          // Service Worker無効化（テスト安定性）
          serviceWorkers: 'block',
        },
      },
      dependencies: envConfig.name !== 'local' ? ['setup'] : [],
    },
    // APIテスト専用プロジェクト（ブラウザ不要）
    {
      name: 'api-tests',
      testMatch: '**/api*.spec.ts',
      use: {
        // APIテストはブラウザコンテキスト不要
        browserName: 'chromium',
        // リクエスト専用設定
        extraHTTPHeaders: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
    },
    // モバイルテスト（環境によっては除外）
    ...(envConfig.name === 'local' ? [{
      name: 'mobile',
      testMatch: '**/mobile.spec.ts',
      use: {
        ...devices['iPhone 12'],
      },
    }] : []),
  ],

  // 開発サーバー設定
  webServer: envConfig.name === 'local' ? {
    command: 'cd frontend && npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  } : undefined,

  // グローバルセットアップ・ティアダウン
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  // エラーハンドリング
  forbidOnly: !!process.env.CI,
  
  // 並列実行の詳細設定
  fullyParallel: envConfig.name === 'local',
  maxFailures: process.env.CI ? 10 : undefined,
});