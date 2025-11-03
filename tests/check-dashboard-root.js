const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('ルートページ（ダッシュボード）にアクセス中...');

    // ルートパスにアクセス（ダッシュボードが表示されるはず）
    await page.goto('http://localhost:5173/', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    // ページが完全に読み込まれるまで待機
    await page.waitForTimeout(3000);

    console.log('現在のURL:', page.url());

    // ページのテキストコンテンツを取得
    const allText = await page.textContent('body');

    // スクレイピング実行日時を探す
    if (allText.includes('スクレイピング実行')) {
      console.log('✅「スクレイピング実行」テキストが見つかりました');

      // 日付パターンを探す
      const datePattern = /\d{4}年\d{1,2}月\d{1,2}日/g;
      const dates = allText.match(datePattern);
      if (dates) {
        console.log('\n見つかった日付:');
        [...new Set(dates)].forEach(date => console.log(`  - ${date}`));
      }

      // 特定の日付（2025年9月15日）があるか確認
      if (allText.includes('2025年9月15日')) {
        console.log('\n✅ 2025年9月15日が表示されています');
      }
    } else {
      console.log('❌「スクレイピング実行」テキストが見つかりません');
    }

    // APIから最新のスクレイピング日時を取得して比較
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('/api/scraping/history?limit=1');
      return await response.json();
    });

    if (apiResponse.success && apiResponse.data && apiResponse.data[0]) {
      const latestHistory = apiResponse.data[0];
      const timestamp = new Date(latestHistory.timestamp);

      // 日本時間に変換
      const jpDateFull = timestamp.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo'
      });

      const jpDateOnly = timestamp.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Tokyo'
      });

      console.log('\n=== APIとの比較 ===');
      console.log('APIから取得した最新日時:');
      console.log(`  タイムスタンプ: ${latestHistory.timestamp}`);
      console.log(`  日本時間（完全）: ${jpDateFull}`);
      console.log(`  日本時間（日付のみ）: ${jpDateOnly}`);
      console.log(`  年度: ${latestHistory.year}年度`);

      // ページに表示されているか確認
      const simplifiedDate = jpDateOnly.replace(/\s/g, '');
      if (allText.includes(simplifiedDate)) {
        console.log(`\n✅ スクレイピング実行日時が正しく表示されています: ${simplifiedDate}`);
      } else {
        console.log(`\n❌ 期待される日付「${simplifiedDate}」がページに表示されていません`);
      }
    }

    // スクリーンショットを撮影
    await page.screenshot({ path: 'dashboard-root.png', fullPage: true });
    console.log('\nスクリーンショットを保存: dashboard-root.png');

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await browser.close();
  }
})();