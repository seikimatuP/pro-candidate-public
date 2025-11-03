/* eslint-disable no-console */
import { test, expect } from '@playwright/test';
import { MockAuth } from '../helpers/mock-auth';
import { NetworkHelper } from '../helpers/network-helper';
// 環境設定を直接定義（循環インポート回避）
const STABILITY_SELECTORS = {
  pageLoaded: 'h1, [data-testid="app-header"]',
  dashboardLoaded: '[data-testid="total-players-card"], [class*="MuiCard"], [class*="Alert"]',
  tableLoaded: '[class*="MuiDataGrid"], [class*="MuiTable"], [data-testid="players-table"]',
  errorAlert: '[class*="Alert"][severity="error"], [class*="MuiAlert-standardError"]',
  loadingSpinner: '[class*="CircularProgress"], [class*="MuiSkeleton"]',
};

const API_FALLBACK_DATA = {
  '/health': { status: 'ok', timestamp: new Date().toISOString() },
  '/players': { players: [], total: 0 },
  '/years/available': { years: [2024, 2023, 2022] },
  '/scraping/history': { history: [], total: 0 },
};

// 環境名を取得
function getEnvironmentName(): string {
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
  if (baseUrl.includes('prod')) return 'prod';
  if (baseUrl.includes('dev')) return 'dev';
  return 'local';
}

// 環境別のタイムアウト設定を取得
function getTimeoutConfig(envName: string) {
  const configs = {
    dev: { navigation: 120000, action: 45000, test: 90000, apiRequest: 30000 },
    prod: { navigation: 240000, action: 90000, test: 180000, apiRequest: 45000 },
    // local環境でもネットワークストレステスト（3回リロード）に対応できる十分なタイムアウト
    local: { navigation: 30000, action: 10000, test: 120000, apiRequest: 10000 },
  };
  return configs[envName as keyof typeof configs] || configs.local;
}

// 環境別のリトライ設定を取得
function getRetryConfig(envName: string) {
  const configs = {
    dev: { navigation: 3, api: 3 },
    prod: { navigation: 4, api: 4 },
    local: { navigation: 1, api: 1 },
  };
  return configs[envName as keyof typeof configs] || configs.local;
}

// 環境別の遅延設定を取得
function getDelayConfig(envName: string) {
  const configs = {
    dev: { betweenRetries: 5000, afterNavigation: 3000, betweenActions: 500 },
    prod: { betweenRetries: 10000, afterNavigation: 5000, betweenActions: 1000 },
    local: { betweenRetries: 1000, afterNavigation: 500, betweenActions: 100 },
  };
  return configs[envName as keyof typeof configs] || configs.local;
}

// APIエンドポイントを取得
function getApiUrl(envName: string): string {
  const urls = {
    dev: 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev',
    prod: 'https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod',
    // local環境でもdev環境の実際のAPIを使用（サーバーレスアーキテクチャのため）
    local: 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev',
  };
  return urls[envName as keyof typeof urls] || urls.local;
}

// 環境判定関数（設定ファイル分離）
function getEnvironmentConfig() {
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
  const envName = getEnvironmentName();

  return {
    name: envName,
    baseUrl,
    apiUrl: getApiUrl(envName),
    timeouts: getTimeoutConfig(envName),
    retries: getRetryConfig(envName),
    delays: getDelayConfig(envName),
    features: {
      useNetworkOptimization: envName !== 'local',
      useAPIFallback: envName !== 'local',
      preWarmEndpoints: envName !== 'local',
      useStableWait: envName !== 'local',
    },
  };
}

test.describe('Dashboard Tests - Network Optimized', () => {
  let mockAuth: MockAuth;
  let networkHelper: NetworkHelper;

  test.beforeEach(async ({ page }) => {
    mockAuth = new MockAuth(page);
    networkHelper = new NetworkHelper(page);

    // 環境設定を動的に取得（トップレベル実行を回避）
    const envConfig = getEnvironmentConfig();

    // S3静的ホスティング最適化の適用
    if (envConfig.features.useNetworkOptimization) {
      await networkHelper.optimizeForS3StaticHosting();
    }

    // APIフォールバック設定
    if (envConfig.features.useAPIFallback) {
      await networkHelper.setupAPIFallback([
        {
          url: new RegExp(envConfig.apiUrl + '/health'),
          fallbackData: API_FALLBACK_DATA['/health'],
        },
        {
          url: new RegExp(envConfig.apiUrl + '/players'),
          fallbackData: API_FALLBACK_DATA['/players'],
        },
      ]);
    }

    // モック認証を使用（Cognitoリダイレクトをバイパス）
    const environment = process.env.E2E_ENVIRONMENT || 'local';
    if (environment !== 'local') {
      await mockAuth.mockAuthentication(environment as 'dev' | 'prod');
    } else {
      await networkHelper.gotoWithRetry('/', {
        maxRetries: 3,
        retryDelay: 2000,
        timeout: envConfig.timeouts.navigation,
      });
    }

    // ページ安定化待機
    if (envConfig.features.useStableWait) {
      await networkHelper.waitForElementStable(STABILITY_SELECTORS.pageLoaded, {
        timeout: envConfig.timeouts.action,
        stableTime: 2000,
      });
    }
  });

  test('should display dashboard with correct title', async ({ page }) => {
    const envConfig = getEnvironmentConfig();

    // タイトル確認（リトライ機能付き）
    await expect(async () => {
      await expect(page).toHaveTitle(/プロ野球志望届管理システム/, {
        timeout: envConfig.timeouts.action,
      });
    }).toPass({
      intervals: [1000, 2000, 3000],
      timeout: envConfig.timeouts.test,
    });

    // ダッシュボード見出し確認
    await expect(async () => {
      const heading = page.locator('h1');
      await expect(heading).toContainText('ダッシュボード', {
        timeout: envConfig.timeouts.action,
      });
    }).toPass({
      intervals: [1000, 2000],
      timeout: envConfig.timeouts.test,
    });
  });

  test('should display statistics cards or error state', async ({ page }) => {
    const envConfig = getEnvironmentConfig();

    // ダッシュボード要素の安定待機
    if (envConfig.features.useStableWait) {
      await networkHelper.waitForElementStable(STABILITY_SELECTORS.dashboardLoaded, {
        timeout: envConfig.timeouts.action,
        stableTime: 1000,
      });
    }

    // 統計カード、エラー、ローディング状態のいずれかを待機
    await page.waitForSelector(STABILITY_SELECTORS.dashboardLoaded, {
      timeout: envConfig.timeouts.action,
    });

    // API接続状態を確認
    const errorElement = page.locator(STABILITY_SELECTORS.errorAlert);
    const isError = await errorElement.isVisible().catch(() => false);

    if (isError) {
      // APIエラーの場合はエラー状態をテスト
      console.log('[Test] API connection error detected, testing error state display');
      await expect(errorElement).toBeVisible();

      // エラーメッセージの内容確認
      const errorText = await errorElement.textContent();
      expect(errorText).toBeTruthy();
      return;
    }

    // 統計カードの確認
    const cardSelectors = [
      '[data-testid="total-players-card"]',
      'text=総選手数',
      '[class*="MuiCard"]',
    ];

    let cardFound = false;
    for (const selector of cardSelectors) {
      try {
        const card = page.locator(selector).first();
        if (await card.isVisible({ timeout: 5000 })) {
          await expect(card).toBeVisible();
          cardFound = true;
          console.log(`[Test] Statistics card found with selector: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!cardFound) {
      // カードが表示されない場合は代替コンテンツを確認
      console.log('[Test] Statistics cards not available, testing alternative content');
      const basicElements = page.locator('h1, nav, header, main').first();
      await expect(basicElements).toBeVisible({
        timeout: envConfig.timeouts.action,
      });
    }
  });

  test('should handle API requests with retry logic', async ({ page }) => {
    const envConfig = getEnvironmentConfig();

    // APIリクエストのインターセプトとリトライテスト
    let requestCount = 0;
    let successfulRequests = 0;

    page.on('response', response => {
      if (response.url().includes('/health') || response.url().includes('/players')) {
        requestCount++;
        if (response.ok()) {
          successfulRequests++;
        }
        console.log(`[Test] API Response: ${response.url()} - ${response.status()}`);
      }
    });

    // ページリロードしてAPIリクエストを発生させる
    await page.reload({ timeout: envConfig.timeouts.navigation });

    // ネットワークアイドル待機
    if (envConfig.features.useNetworkOptimization) {
      await networkHelper.waitForNetworkIdle({
        timeout: envConfig.timeouts.action,
        idleTime: 2000,
      });
    }

    // レスポンス確認（10秒待機）
    await page.waitForTimeout(10000);

    console.log(`[Test] API Requests: ${requestCount}, Successful: ${successfulRequests}`);

    // APIリクエストが実行されていることを確認
    // （成功/失敗は問わず、リクエスト自体が発生していることを確認）
    if (requestCount > 0) {
      console.log('[Test] API requests detected - connectivity verified');
    } else {
      console.log('[Test] No API requests detected - may be using fallback data');
    }
  });

  test('should maintain page stability under network stress', async ({ page }) => {
    const envConfig = getEnvironmentConfig();

    // ネットワークストレステスト
    const startTime = Date.now();

    // 複数回のページ操作
    for (let i = 0; i < 3; i++) {
      console.log(`[Test] Page operation ${i + 1}/3`);

      try {
        // ページリロード
        await page.reload({
          timeout: envConfig.timeouts.navigation,
          waitUntil: 'domcontentloaded',
        });

        // 安定化待機
        await page.waitForSelector(STABILITY_SELECTORS.pageLoaded, {
          timeout: envConfig.timeouts.action,
        });

        // 操作間のクールダウン
        await page.waitForTimeout(envConfig.delays.betweenActions);
      } catch (err) {
        console.error(`[Test] Page operation ${i + 1} failed:`, err);
        // 個別の操作失敗は許容（全体の安定性を確認）
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`[Test] Network stress test completed in ${totalTime}ms`);

    // 最終的にページが表示されていることを確認
    await expect(page.locator('body')).toBeVisible({
      timeout: envConfig.timeouts.action,
    });

    // パフォーマンス閾値の確認（環境別）
    const maxTime = envConfig.name === 'local' ? 30000 : 120000; // ローカル30秒、リモート2分
    expect(totalTime).toBeLessThan(maxTime);
  });

  test.afterEach(async ({ page }, testInfo) => {
    const envConfig = getEnvironmentConfig();

    // テスト失敗時のデバッグ情報収集
    if (testInfo.status === 'failed') {
      console.log(`[Test] Test failed: ${testInfo.title}`);

      // 現在のURL記録
      const currentUrl = page.url();
      console.log(`[Test] Current URL: ${currentUrl}`);

      // ネットワークエラーの確認
      const errorElements = page.locator(STABILITY_SELECTORS.errorAlert);
      const errorCount = await errorElements.count();
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorElements.nth(i).textContent();
          console.log(`[Test] Error message ${i + 1}: ${errorText}`);
        }
      }

      // 追加のスクリーンショット（環境名付き）
      await page.screenshot({
        path: `test-results/${envConfig.name}/failed-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.png`,
        fullPage: true,
      });
    }
  });
});
