const { chromium } = require('playwright');

(async () => {
  console.log('🎭 Playwright高度な機能テスト');
  console.log('━'.repeat(50));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Yahoo Japan検索テスト
  await page.goto('https://yahoo.co.jp');
  
  // 検索ボックスに入力
  await page.fill('input[name="p"]', 'Playwright テスト');
  
  // スクリーンショット撮影
  await page.screenshot({ path: 'yahoo-search.png' });
  console.log('📸 スクリーンショット保存: yahoo-search.png');
  
  // ページ情報取得
  const title = await page.title();
  const url = page.url();
  
  console.log(`📺 タイトル: ${title}`);
  console.log(`🔗 URL: ${url}`);
  
  // 要素数カウント
  const linkCount = await page.locator('a').count();
  console.log(`🔢 リンク数: ${linkCount}`);
  
  await browser.close();
  console.log('━'.repeat(50));
  console.log('✅ テスト完了');
})();