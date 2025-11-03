const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // ブラウザを表示
  const page = await browser.newPage();

  try {
    console.log('ダッシュボードにアクセス中...');

    // まずトップページにアクセス
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2000);

    console.log('現在のURL:', page.url());

    // ルートページ（/）がダッシュボードなので、すでにダッシュボードにいる
    // 追加の遷移は不要
    console.log('ダッシュボードページを表示中');
    await page.waitForTimeout(2000);

    console.log('現在のURL（ダッシュボード）:', page.url());

    // ページのタイトルを取得
    const title = await page.title();
    console.log('ページタイトル:', title);

    // h6要素のテキストを取得（ダッシュボードのタイトル）
    const h6Elements = await page.$$eval('h6', elements => elements.map(el => el.textContent));
    console.log('h6要素:', h6Elements);

    // スクレイピング実行に関するテキストを探す
    const allText = await page.textContent('body');

    if (allText.includes('スクレイピング実行')) {
      console.log('✅「スクレイピング実行」テキストが見つかりました');

      // スクレイピング実行日時を含む要素を探す
      const scrapingElements = await page.$$eval(
        '*',
        elements => {
          return elements
            .filter(el => el.textContent && el.textContent.includes('スクレイピング実行'))
            .map(el => {
              const parent = el.parentElement;
              return {
                text: el.textContent.trim(),
                parentText: parent ? parent.textContent.trim() : null,
                className: el.className,
                tagName: el.tagName
              };
            });
        }
      );

      console.log('\nスクレイピング実行要素の詳細:');
      scrapingElements.forEach((elem, i) => {
        console.log(`  ${i + 1}. タグ: ${elem.tagName}`);
        console.log(`     テキスト: ${elem.text}`);
        if (elem.parentText) {
          console.log(`     親要素: ${elem.parentText.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('❌「スクレイピング実行」テキストが見つかりません');
    }

    // 日付形式のテキストを探す（2025年9月15日）
    const datePattern = /\d{4}年\d{1,2}月\d{1,2}日/g;
    const dates = allText.match(datePattern);
    if (dates) {
      console.log('\n見つかった日付:');
      [...new Set(dates)].forEach(date => console.log(`  - ${date}`));
    }

    // スクリーンショットを撮影
    await page.screenshot({ path: 'dashboard-visible.png', fullPage: true });
    console.log('\nスクリーンショットを保存: dashboard-visible.png');

    console.log('\n10秒待機中... ブラウザでページを確認してください');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await browser.close();
  }
})();