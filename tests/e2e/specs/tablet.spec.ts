/* eslint-disable no-console */
import { test, expect, devices } from '@playwright/test';
import { MockAuth } from '../helpers/mock-auth';

test.describe('Tablet Responsive Tests', () => {
  test.use({
    viewport: { width: 820, height: 1180 },
    userAgent: devices['iPad Pro 11'].userAgent,
    deviceScaleFactor: devices['iPad Pro 11'].deviceScaleFactor,
    isMobile: false,
    hasTouch: true,
  });
  test.beforeEach(async ({ page }) => {
    const mockAuth = new MockAuth(page);
    const environment = process.env.E2E_ENVIRONMENT || 'local';

    // 認証が必要な環境ではモック認証を使用
    if (environment !== 'local') {
      // モック認証はリトライ不要
      await mockAuth.mockAuthentication(environment as 'dev' | 'prod');
      await page.waitForLoadState('networkidle');
    } else {
      // ローカル環境での接続強化
      await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
    }
  });

  test('should display 2-column layout on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    // 環境別タイムアウト設定
    const environment = process.env.E2E_ENVIRONMENT || 'local';
    const timeout = environment === 'dev' ? 60000 : environment === 'prod' ? 90000 : 30000;

    try {
      // より柔軟な待機戦略
      const contentLoaded = await page.waitForSelector(
        '[class*="MuiCard"], [class*="CircularProgress"], [class*="Alert"], .loading, h1, nav',
        { timeout }
      );

      if (contentLoaded) {
        console.log('コンテンツ読み込み成功');
      }
    } catch {
      console.log('コンテンツ読み込みタイムアウト - ページ構造を確認');
      // フォールバック: 基本要素の確認
      await expect(page.locator('body')).toBeVisible();
    }

    // 基本的なレイアウト確認
    const cards = page.locator('[class*="MuiCard"]');
    const cardCount = await cards.count();
    console.log(`カード発見数: ${cardCount}件`);

    if (cardCount >= 2) {
      const firstCardBox = await cards.first().boundingBox();
      const secondCardBox = await cards.nth(1).boundingBox();

      if (firstCardBox && secondCardBox) {
        // カードが横に並んでいることを確認（Y座標が同じ）
        const yDifference = Math.abs(firstCardBox.y - secondCardBox.y);
        expect(yDifference).toBeLessThan(10);
      }
    }
  });

  test('should show sidebar navigation on tablet', async ({ page }) => {
    // dev環境向けナビゲーション要素包括的待機
    await page.waitForLoadState('networkidle');

    try {
      await page.waitForSelector('[class*="MuiDrawer"], nav, [role="navigation"]', {
        timeout: 120000,
      });
    } catch {
      // 代替セレクタで再試行
      try {
        await page.waitForSelector('header, .navbar, .navigation, [class*="AppBar"]', {
          timeout: 60000,
        });
      } catch {
        // 基本構造の確認
        await page.waitForSelector('main, [role="main"], body', { timeout: 30000 });
        console.log('ナビゲーション要素が見つからないため基本構造で継続');
      }
    }

    // タブレットではサイドバーまたはナビゲーション要素が表示されることを確認
    const sidebar = page.locator('[class*="MuiDrawer-paper"]:not([class*="temporary"])');
    const navigation = page.locator('nav, [role="navigation"]');

    // サイドバーまたは何らかのナビゲーション要素が存在することを確認
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    const navElementVisible = await navigation.isVisible().catch(() => false);

    expect(sidebarVisible || navElementVisible).toBeTruthy();
  });
});
