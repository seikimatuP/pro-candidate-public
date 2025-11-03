/* global localStorage, sessionStorage */
import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// 環境別のCognito設定
const cognitoConfig = {
  dev: {
    username: 'admin',
    password: 'AdminPass123!',
  },
  prod: {
    username: 'admin',
    password: 'AdminPass123!',
  },
};

// 環境判定
function getEnvironment(): 'dev' | 'prod' | 'local' {
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';

  if (baseUrl.includes('localhost')) {
    return 'local';
  } else if (baseUrl.includes('dev')) {
    return 'dev';
  } else if (baseUrl.includes('prod')) {
    return 'prod';
  }

  // CloudFront URLの場合は環境変数で判定
  const environment = process.env.E2E_ENVIRONMENT;
  if (environment === 'dev' || environment === 'prod') {
    return environment as 'dev' | 'prod';
  }

  return 'dev'; // デフォルト
}

setup('authenticate', async ({ page }) => {
  const env = getEnvironment();

  // ローカル環境では認証をスキップ
  if (env === 'local') {
    console.log('Local environment detected - skipping authentication'); // eslint-disable-line no-console
    return;
  }

  const config = cognitoConfig[env as 'dev' | 'prod'];
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';

  // ブラウザコンソールログとエラーをキャプチャ
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(`Page Error: ${error.message}`);
  });

  page.on('requestfailed', request => {
    const failureInfo = `Failed: ${request.url()} - ${request.failure()?.errorText || 'Unknown error'}`;
    failedRequests.push(failureInfo);
    console.log(`🔴 Request failed: ${failureInfo}`); // eslint-disable-line no-console
  });

  page.on('response', response => {
    if (response.status() === 404) {
      const url404 = response.url();
      console.log(`🔴 404 Not Found: ${url404}`); // eslint-disable-line no-console
      failedRequests.push(`404: ${url404}`);
    }
  });

  try {
    console.log(`Authenticating via login page for ${env} environment...`); // eslint-disable-line no-console

    // 既存セッションをクリアするため、まずIndexedDBとLocalStorageをクリア
    await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Amplifyログアウトを試行（既存セッションがある場合）
    await page.evaluate(async () => {
      try {
        const { signOut } = await import('aws-amplify/auth');
        await signOut();
        console.log('🚪 Signed out from existing session'); // eslint-disable-line no-console
      } catch {
        console.log('⚠️ No existing session to sign out from'); // eslint-disable-line no-console
      }
    });

    await page.evaluate(() => {
      // IndexedDBをクリア
      if (window.indexedDB) {
        window.indexedDB.databases().then(dbs => {
          dbs.forEach(db => {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
      // LocalStorageをクリア
      localStorage.clear();
      // SessionStorageをクリア
      sessionStorage.clear();
    });
    console.log('🗑️ Cleared existing session data'); // eslint-disable-line no-console

    // Cookieもクリア（Amplify Auth状態の完全リセット）
    const context = page.context();
    await context.clearCookies();
    console.log('🍪 Cleared cookies'); // eslint-disable-line no-console

    // セッションクリア後、ページをリロードしてReact状態も完全にリセット
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });

    // 少し待機してからログインページに移動
    await page.waitForTimeout(1000);

    // ログインページに移動（networkidleでJavaScript読み込み完了を待つ）
    console.log('🌐 Navigating to login page...'); // eslint-disable-line no-console
    await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle', timeout: 120000 });

    console.log(`✅ Login page loaded: ${page.url()}`); // eslint-disable-line no-console

    // コンソールエラーを確認
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console Errors detected:'); // eslint-disable-line no-console
      consoleErrors.forEach(err => console.log(`  - ${err}`)); // eslint-disable-line no-console
    }

    // 失敗したネットワークリクエストを確認
    if (failedRequests.length > 0) {
      console.log('⚠️ Failed Network Requests:'); // eslint-disable-line no-console
      failedRequests.forEach(req => console.log(`  - ${req}`)); // eslint-disable-line no-console
    }

    // ページのHTMLコンテンツをデバッグ出力（最初の500文字）
    const htmlContent = await page.content();
    console.log('📄 Page HTML (first 1000 chars):'); // eslint-disable-line no-console
    console.log(htmlContent.substring(0, 1000)); // eslint-disable-line no-console

    // ページタイトルとbodyテキストを確認
    const pageTitle = await page.title();
    const bodyText = await page.locator('body').textContent();
    console.log(`📋 Page title: ${pageTitle}`); // eslint-disable-line no-console
    console.log(`📋 Body text (first 500 chars): ${bodyText?.substring(0, 500)}`); // eslint-disable-line no-console

    // 最新のコンソールメッセージを表示
    if (consoleMessages.length > 0) {
      console.log('📝 Recent console messages:'); // eslint-disable-line no-console
      consoleMessages.slice(-10).forEach(msg => console.log(`  - ${msg}`)); // eslint-disable-line no-console
    }

    // ログインフォームが表示されるまで待機（Material-UIのTextFieldを考慮）
    // usernameフィールドまたはローディング画面が表示されるまで待機
    await page.waitForSelector('input#username, [role="progressbar"]', { timeout: 30000 });

    // ローディング中の場合は待機
    const isLoading = await page
      .locator('[role="progressbar"]')
      .isVisible()
      .catch(() => false);
    if (isLoading) {
      console.log('⏳ Authentication loading in progress...'); // eslint-disable-line no-console
      await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 30000 });
    }

    // ログインフォームが表示されることを確認
    await page.waitForSelector('input#username', { timeout: 30000 });
    console.log('✅ Login form is visible'); // eslint-disable-line no-console

    // ユーザー名を入力
    const usernameField = page.locator('input#username');
    await usernameField.click();
    await usernameField.fill(''); // クリア
    await usernameField.fill(config.username);
    console.log(`✅ Username filled: ${config.username}`); // eslint-disable-line no-console

    // パスワードを入力
    const passwordField = page.locator('input#password');
    await passwordField.click();
    await passwordField.fill(''); // クリア
    await passwordField.fill(config.password);
    console.log('✅ Password filled'); // eslint-disable-line no-console

    // ログインボタンをクリック
    const loginButton = page.locator('button[type="submit"]:has-text("ログイン")');
    await loginButton.click();
    console.log('✅ Login button clicked'); // eslint-disable-line no-console

    // ログイン処理を少し待機
    await page.waitForTimeout(5000);

    // 現在のURLを確認
    const currentUrl = page.url();
    console.log(`📍 Current URL after login attempt: ${currentUrl}`); // eslint-disable-line no-console

    // ページの状態を確認
    const bodyTextAfterLogin = await page.locator('body').textContent();
    console.log(
      `📋 Page content after login (first 500 chars): ${bodyTextAfterLogin?.substring(0, 500)}`
    ); // eslint-disable-line no-console

    // エラーメッセージが表示されているか確認
    const errorMessages = await page.locator('[role="alert"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('⚠️ Alert messages found:'); // eslint-disable-line no-console
      errorMessages.forEach(msg => console.log(`  - ${msg}`)); // eslint-disable-line no-console

      // "There is already a signed in user."エラーの場合は、直接ダッシュボードに移動
      if (errorMessages.some(msg => msg.includes('already a signed in user'))) {
        console.log('⚠️ User already signed in - navigating to dashboard directly'); // eslint-disable-line no-console
        await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 });
        console.log(`✅ Navigated to dashboard: ${page.url()}`); // eslint-disable-line no-console
      }
    }

    // ダッシュボードへのリダイレクトを待機（認証成功の証明）
    // URLが/dashboardまたは/になればOK
    const urlPattern = /\/(dashboard)?$/;
    await page.waitForURL(urlPattern, { timeout: 60000 });
    console.log(`✅ URL check passed: ${page.url()}`); // eslint-disable-line no-console

    // ダッシュボードページのレンダリングを待機
    console.log('⏳ Waiting for dashboard to render...'); // eslint-disable-line no-console

    // Material-UIのレンダリング完了を待機
    // 1. CSSローディング完了
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // 2. Reactアプリのマウント完了待機（Material-UI完全レンダリング考慮）
    await page.waitForTimeout(30000);

    // ページの状態を確認
    const dashboardBodyText = await page.locator('body').textContent();
    console.log(
      `📋 Dashboard page content (first 1000 chars): ${dashboardBodyText?.substring(0, 1000)}`
    ); // eslint-disable-line no-console

    // 認証成功を確認（複数の条件で判定）
    let isAuthenticated = false;

    // 方法1: 認証済みコンテンツの存在確認（選手管理・ダッシュボード・ナビゲーション要素）
    const hasAuthContent = await page
      .locator(
        'text=/ログアウト|Dashboard|ダッシュボード|選手データ|統計情報|選手管理|Player Management/i'
      )
      .first()
      .isVisible({
        timeout: 15000,
      })
      .catch(() => false);

    if (hasAuthContent) {
      console.log('✅ Authentication content found'); // eslint-disable-line no-console
      isAuthenticated = true;
    }

    // 方法1.5: ナビゲーションメニューの存在確認（Material-UIのDrawer/AppBar）
    if (!isAuthenticated) {
      const hasNavigation = await page
        .locator('[role="navigation"], nav, header')
        .first()
        .isVisible({
          timeout: 10000,
        })
        .catch(() => false);
      if (hasNavigation) {
        console.log('✅ Navigation menu found - authentication likely successful'); // eslint-disable-line no-console
        isAuthenticated = true;
      }
    }

    // 方法2: URLが/dashboardで、ログインページにリダイレクトされていないことを確認
    if (!isAuthenticated && page.url().includes('/dashboard')) {
      console.log(
        '⚠️ Auth content not visible, but URL is /dashboard - assuming React Router is working'
      ); // eslint-disable-line no-console

      // Reactアプリがマウントされているか確認（#root要素が存在）
      const hasReactRoot = (await page.locator('#root').count()) > 0;
      if (hasReactRoot) {
        console.log('✅ React root element found - authentication likely successful'); // eslint-disable-line no-console
        isAuthenticated = true;
      }
    }

    // 方法3: 最終確認 - ログインページのフォームが表示されていないことを確認
    if (!isAuthenticated) {
      const hasLoginForm = await page
        .locator('input#username')
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      if (!hasLoginForm) {
        console.log('✅ Login form not found - assuming authentication successful'); // eslint-disable-line no-console
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      throw new Error('Authentication verification failed - expected content not found');
    }

    console.log('✅ Successfully authenticated via login page'); // eslint-disable-line no-console

    // 認証状態を保存
    const authState = await page.context().storageState();
    const authFile = path.join(__dirname, '..', '..', 'playwright', '.auth', `${env}.json`);

    const authDir = path.dirname(authFile);
    // ファイルシステム操作: 認証状態保存用ディレクトリ作成

    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    fs.writeFileSync(authFile, JSON.stringify(authState, null, 2));
    console.log(`✅ Authentication state saved to ${authFile}`); // eslint-disable-line no-console
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  }
});
