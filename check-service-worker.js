const { chromium } = require('playwright');

async function checkServiceWorker(environment, url) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Checking ${environment}: ${url}`);
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Service Worker の状態を取得
    const swStatus = await page.evaluate(async () => {
      const results = {
        hasServiceWorker: 'serviceWorker' in navigator,
        registrations: [],
        caches: [],
        errors: []
      };
      
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          results.registrations = registrations.map(reg => ({
            scope: reg.scope,
            active: reg.active ? reg.active.scriptURL : null,
            waiting: reg.waiting ? reg.waiting.scriptURL : null,
            installing: reg.installing ? reg.installing.scriptURL : null
          }));
        } catch (error) {
          results.errors.push(`Service Worker エラー: ${error.message}`);
        }
      }
      
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          results.caches = cacheNames;
        } catch (error) {
          results.errors.push(`キャッシュエラー: ${error.message}`);
        }
      }
      
      return results;
    });
    
    // 結果を表示
    console.log('\n📊 Service Worker 状態:');
    if (swStatus.registrations.length === 0) {
      console.log('  ✅ Service Worker は登録されていません');
    } else {
      console.log(`  ⚠️  ${swStatus.registrations.length}個の Service Worker が検出されました:`);
      swStatus.registrations.forEach((reg, i) => {
        console.log(`\n  SW ${i + 1}:`);
        console.log(`    Scope: ${reg.scope}`);
        if (reg.active) console.log(`    Active: ${reg.active}`);
        if (reg.waiting) console.log(`    Waiting: ${reg.waiting}`);
        if (reg.installing) console.log(`    Installing: ${reg.installing}`);
      });
    }
    
    console.log('\n📦 キャッシュ状態:');
    if (swStatus.caches.length === 0) {
      console.log('  ✅ キャッシュは存在しません');
    } else {
      console.log(`  ⚠️  ${swStatus.caches.length}個のキャッシュが検出されました:`);
      swStatus.caches.forEach(cache => {
        console.log(`    - ${cache}`);
      });
    }
    
    if (swStatus.errors.length > 0) {
      console.log('\n❌ エラー:');
      swStatus.errors.forEach(error => {
        console.log(`    - ${error}`);
      });
    }
    
    // コンソールログを確認
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Service Worker') || text.includes('キャッシュ')) {
        console.log(`\n[Console] ${text}`);
      }
    });
    
    // 認証が必要な場合
    if (!url.includes('localhost')) {
      try {
        await page.waitForSelector('input[name="username"]', { timeout: 3000 });
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'AdminPass123!');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        
        // 認証後に再度チェック
        const swStatusAfterAuth = await page.evaluate(async () => {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            return registrations.length;
          }
          return 0;
        });
        
        console.log(`\n認証後の Service Worker 数: ${swStatusAfterAuth}`);
      } catch (e) {
        // 認証不要または既にログイン済み
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await browser.close();
  }
}

async function checkAll() {
  // dev環境
  await checkServiceWorker('Dev', 'https://d3brmn978dqs63.cloudfront.net');
  
  // prod環境
  await checkServiceWorker('Prod', 'https://dh2yk8y9mj9wl.cloudfront.net');
  
  // ローカル環境
  await checkServiceWorker('Local', 'http://localhost:5173');
  
  console.log('\n' + '='.repeat(60));
  console.log('チェック完了');
  console.log('='.repeat(60));
}

checkAll().catch(console.error);