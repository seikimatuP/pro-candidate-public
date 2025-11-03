const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('ダッシュボードにアクセス中...');
    await page.goto('http://localhost:5173/');

    // ページが完全に読み込まれるまで待機
    await page.waitForTimeout(3000);

    // ページのスクリーンショットを撮影
    await page.screenshot({ path: 'dashboard-screenshot.png', fullPage: true });
    console.log('スクリーンショットを保存しました: dashboard-screenshot.png');

    // スクレイピング実行日時を探す
    const scrapingElements = await page.$$eval(
      '*',
      elements => elements.map(el => el.textContent).filter(text => text && text.includes('スクレイピング実行'))
    );

    if (scrapingElements.length > 0) {
      console.log('「スクレイピング実行」テキストが見つかりました');
    } else {
      console.log('「スクレイピング実行」テキストが見つかりません');
    }

    // 日付形式のテキストを探す
    const dateElements = await page.$$eval(
      '*',
      elements => {
        const datePattern = /2025年9月15日/;
        return elements
          .map(el => el.textContent)
          .filter(text => text && datePattern.test(text))
          .slice(0, 5); // 最初の5件のみ
      }
    );

    if (dateElements.length > 0) {
      console.log('\n日付テキストが見つかりました:');
      dateElements.forEach(date => console.log(`  - ${date}`));
    } else {
      console.log('2025年9月15日の日付が見つかりません');
    }

    // APIから最新のスクレイピング日時を取得
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('/api/scraping/history?limit=1');
      return await response.json();
    });

    if (apiResponse.success && apiResponse.data && apiResponse.data[0]) {
      const latestHistory = apiResponse.data[0];
      const timestamp = new Date(latestHistory.timestamp);
      const jpDate = timestamp.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo'
      });

      console.log('\nAPIから取得した最新スクレイピング日時:');
      console.log(`  タイムスタンプ: ${latestHistory.timestamp}`);
      console.log(`  日本時間: ${jpDate}`);
      console.log(`  年度: ${latestHistory.year}年度`);
      console.log(`  タイプ: ${latestHistory.typeLabel}`);
    }

    // ページのHTML全体を確認（デバッグ用）
    const bodyText = await page.textContent('body');
    const hasScrapingText = bodyText.includes('スクレイピング');
    const hasDataUpdateText = bodyText.includes('データ更新');

    console.log('\nページコンテンツ確認:');
    console.log(`  「スクレイピング」を含む: ${hasScrapingText}`);
    console.log(`  「データ更新」を含む: ${hasDataUpdateText}`);

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await browser.close();
  }
})();