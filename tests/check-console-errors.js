const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // コンソールメッセージをキャプチャ
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // ページエラーをキャプチャ
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.toString());
  });

  try {
    console.log('ダッシュボードにアクセス中...');

    // ネットワークエラーも監視
    page.on('requestfailed', request => {
      console.log(`❌ リクエスト失敗: ${request.url()} - ${request.failure()?.errorText}`);
    });

    const response = await page.goto('http://localhost:5173/', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    console.log('レスポンスステータス:', response?.status());

    // ページが読み込まれるまで待機
    await page.waitForTimeout(3000);

    // コンソールログを出力
    if (consoleLogs.length > 0) {
      console.log('\n=== コンソールログ ===');
      consoleLogs.forEach(log => {
        const icon = log.type === 'error' ? '❌' :
                     log.type === 'warning' ? '⚠️' :
                     log.type === 'info' ? 'ℹ️' : '📝';
        console.log(`${icon} [${log.type}] ${log.text}`);
        if (log.location?.url) {
          console.log(`   場所: ${log.location.url}:${log.location.lineNumber}`);
        }
      });
    }

    // ページエラーを出力
    if (pageErrors.length > 0) {
      console.log('\n=== ページエラー ===');
      pageErrors.forEach(error => {
        console.log(`❌ ${error}`);
      });
    }

    // 現在のURLを確認
    console.log('\n現在のURL:', page.url());

    // bodyの内容を確認
    const bodyHTML = await page.content();
    console.log('HTMLの長さ:', bodyHTML.length);

    // React rootが存在するか確認
    const rootElement = await page.$('#root');
    if (rootElement) {
      const rootContent = await rootElement.innerHTML();
      console.log('React rootの内容長:', rootContent.length);
      if (rootContent.length < 50) {
        console.log('React rootの内容:', rootContent);
      }
    } else {
      console.log('❌ React root要素が見つかりません');
    }

    // Viteのエラーオーバーレイがあるか確認
    const viteError = await page.$('vite-error-overlay');
    if (viteError) {
      const errorText = await viteError.textContent();
      console.log('❌ Viteエラー:', errorText);
    }

  } catch (error) {
    console.error('実行エラー:', error);
  } finally {
    await browser.close();
  }
})();