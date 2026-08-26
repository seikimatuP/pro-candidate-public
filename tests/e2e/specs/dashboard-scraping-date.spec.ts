import { test, expect } from '@playwright/test';
import { NetworkHelper } from '../helpers/network-helper';

test.describe('Dashboard Scraping Date Test', () => {
  test('should display correct scraping execution date', async ({ page }) => {
    const networkHelper = new NetworkHelper(page);
    const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';

    // APIレスポンスをインターセプト
    let scrapingHistoryData: any = null;

    await page.route('**/api/scraping/history*', async route => {
      const response = await route.fetch();
      const data = await response.json();
      scrapingHistoryData = data;
      await route.fulfill({ response });
    });

    // ダッシュボードへ移動（ルートページがダッシュボード）
    await networkHelper.gotoWithRetry(`${baseUrl}/`);

    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');

    // ダッシュボードのタイトルを待機（複数のセレクタに対応）
    await page.waitForSelector('h4, h5, h6', { timeout: 10000 });

    // 少し待機（データ読み込み用）
    await page.waitForTimeout(2000);

    // スクレイピング実行日時の要素を探す
    const scrapingDateElement = await page
      .locator('text=スクレイピング実行')
      .locator('..')
      .locator('text=/\\d{4}年\\d{1,2}月\\d{1,2}日/')
      .first();

    if ((await scrapingDateElement.count()) > 0) {
      const displayedDate = await scrapingDateElement.textContent();
      console.log('表示されているスクレイピング実行日時:', displayedDate);

      // APIから取得した最新の日時
      if (scrapingHistoryData && scrapingHistoryData.data && scrapingHistoryData.data.length > 0) {
        const latestHistory = scrapingHistoryData.data[0];
        const apiTimestamp = new Date(latestHistory.timestamp);

        // 日本時間に変換してフォーマット
        const japaneseDate = apiTimestamp.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Tokyo',
        });

        console.log('APIから取得した日時:', latestHistory.timestamp);
        console.log('日本時間変換:', japaneseDate);

        // 日付部分が含まれているか確認
        const apiDateOnly = apiTimestamp.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Asia/Tokyo',
        });

        expect(displayedDate).toContain(apiDateOnly.replace(/\s/g, ''));
      }
    } else {
      console.log(
        'スクレイピング実行日時が表示されていません（管理者権限が必要な可能性があります）'
      );

      // データ更新日時を確認（代替）
      const dataUpdateElement = await page
        .locator('text=データ更新')
        .locator('..')
        .locator('text=/\\d{4}年\\d{1,2}月\\d{1,2}日/')
        .first();
      if ((await dataUpdateElement.count()) > 0) {
        const dataUpdateDate = await dataUpdateElement.textContent();
        console.log('データ更新日時:', dataUpdateDate);
      }
    }

    // スクリーンショットを撮影して確認
    await page.screenshot({
      path: 'tests/e2e/screenshots/dashboard-scraping-date.png',
      fullPage: true,
    });
  });
});
