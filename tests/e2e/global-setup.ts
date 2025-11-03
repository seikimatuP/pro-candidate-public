/* eslint-disable no-console, @typescript-eslint/no-unused-vars, sonarjs/cognitive-complexity */
import { chromium, FullConfig } from '@playwright/test';

// 環境判定関数（設定ファイルの依存関係を回避）
function getEnvironmentName(): string {
  const environment = process.env.E2E_ENVIRONMENT;
  if (environment && ['local', 'dev', 'prod'].includes(environment)) {
    return environment;
  }
  
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
  
  if (baseUrl.includes('prod.s3-website') || baseUrl.includes('prod/')) {
    return 'prod';
  } else if (baseUrl.includes('dev.s3-website') || baseUrl.includes('dev/')) {
    return 'dev';
  } else if (baseUrl.includes('.cloudfront.net')) {
    return 'local'; // フォールバック
  } else {
    return 'local';
  }
}

// 環境別API URL取得
function getApiUrl(environment: string): string {
  switch (environment) {
    case 'dev':
      return process.env.E2E_API_URL || 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev';
    case 'prod':
      return process.env.E2E_API_URL || 'https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod';
    default:
      return 'http://localhost:3000';
  }
}

/**
 * グローバルセットアップ
 * テスト実行前の環境準備とプレウォーミング
 */
async function globalSetup(config: FullConfig) {
  const envName = getEnvironmentName();
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
  const apiUrl = getApiUrl(envName);
  
  console.log(`[Global Setup] Starting setup for ${envName} environment`);
  console.log(`[Global Setup] Base URL: ${baseUrl}`);
  console.log(`[Global Setup] API URL: ${apiUrl}`);

  // dev/prod環境の場合、エンドポイントのプレウォーミング
  if (envName !== 'local') {
    console.log('[Global Setup] Pre-warming endpoints...');

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // S3静的ホスティングのウォームアップ
      console.log(`[Global Setup] Warming up S3 static hosting: ${baseUrl}`);
      await page.goto(baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 300000 // 5分
      });

      // API Gatewayのウォームアップ
      console.log(`[Global Setup] Warming up API Gateway: ${apiUrl}/health`);
      await page.evaluate(async apiUrl => {
        try {
          const response = await fetch(`${apiUrl}/health`);
          console.log(`API health check: ${response.status}`);
        } catch (error) {
          console.error('API warmup failed:', error);
        }
      }, apiUrl);

      // 主要なAPIエンドポイントをプレフェッチ
      const endpoints = ['/players', '/years/available', '/scraping/history'];
      for (const endpoint of endpoints) {
        console.log(`[Global Setup] Pre-fetching ${endpoint}`);
        await page.evaluate(
          async ({ apiUrl, endpoint }) => {
            try {
              await fetch(`${apiUrl}${endpoint}`);
            } catch (error) {
              console.log(`Pre-fetch ${endpoint} failed:`, error);
            }
          },
          { apiUrl, endpoint }
        );

        // リクエスト間に遅延を入れる
        await page.waitForTimeout(2000);
      }

      console.log('[Global Setup] Endpoint warming completed successfully');
    } catch (error) {
      console.error('[Global Setup] Warming failed:', error);
      // ウォーミングの失敗はテストを中断しない
    } finally {
      await browser.close();
    }
  }

  // 環境変数の設定
  process.env.TEST_ENV = envName;
  process.env.API_BASE_URL = apiUrl;

  // テスト実行前の待機（S3/API Gateway起動時間確保）
  if (envName !== 'local') {
    const waitTime = envName === 'prod' ? 30000 : 20000;
    console.log(`[Global Setup] Waiting ${waitTime}ms for services to stabilize...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  console.log('[Global Setup] Setup completed');
}

export default globalSetup;
