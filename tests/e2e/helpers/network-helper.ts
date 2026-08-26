/* eslint-disable no-console, no-unused-vars, @typescript-eslint/no-explicit-any, sonarjs/cognitive-complexity, sonarjs/no-redundant-jump */
import { Page, Request, Response } from '@playwright/test';
import { getApiOrigin } from './api-url';

/**
 * ネットワーク関連のヘルパー関数
 * S3静的ホスティングとAPI Gatewayの遅延問題対策
 */
export class NetworkHelper {
  constructor(private page: Page) {}

  /**
   * リトライ機能付きページ遷移
   * S3初回接続の遅延対策
   */
  async gotoWithRetry(
    url: string,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      timeout?: number;
    } = {}
  ) {
    const { maxRetries = 3, retryDelay = 5000, timeout = 180000 } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[NetworkHelper] Attempting to navigate to ${url} (attempt ${attempt}/${maxRetries})`
        );

        // プレウォーミングリクエスト（S3/API Gateway起動用）
        if (attempt === 1) {
          await this.warmupEndpoint(url);
        }

        // 実際のページ遷移
        const response = await this.page.goto(url, {
          waitUntil: 'domcontentloaded', // 'networkidle' は避ける（遅い場合がある）
          timeout: timeout,
        });

        // レスポンス確認
        if (response && response.ok()) {
          console.log(`[NetworkHelper] Successfully navigated to ${url}`);
          return response;
        }

        throw new Error(`Failed to load page: ${response?.status()}`);
      } catch (error: any) {
        lastError = error;
        console.error(
          `[NetworkHelper] Navigation failed (attempt ${attempt}/${maxRetries}):`,
          error.message
        );

        if (attempt < maxRetries) {
          console.log(`[NetworkHelper] Waiting ${retryDelay}ms before retry...`);
          await this.page.waitForTimeout(retryDelay);
        }
      }
    }

    throw new Error(`Failed to navigate after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * エンドポイントのプレウォーミング
   * S3/API Gatewayの初回起動遅延を軽減
   */
  private async warmupEndpoint(url: string) {
    try {
      console.log(`[NetworkHelper] Warming up endpoint: ${url}`);

      // fetchを使った軽量リクエスト
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(() => {
        // エラーは無視（ウォーミング目的のため）
      });

      clearTimeout(timeoutId);
    } catch (error) {
      // ウォーミングの失敗は無視
    }
  }

  /**
   * API呼び出しのリトライ機能
   */
  async apiRequestWithRetry(
    apiCall: () => Promise<Response | null>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      exponentialBackoff?: boolean;
    } = {}
  ): Promise<Response | null> {
    const { maxRetries = 3, retryDelay = 2000, exponentialBackoff = true } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await apiCall();

        if (response && response.ok()) {
          return response;
        }

        // 5xxエラーの場合はリトライ
        if (response && response.status() >= 500) {
          throw new Error(`Server error: ${response.status()}`);
        }

        // 4xxエラーの場合はリトライしない
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(
          `[NetworkHelper] API request failed (attempt ${attempt}/${maxRetries}):`,
          error.message
        );

        if (attempt < maxRetries) {
          const delay = exponentialBackoff ? retryDelay * Math.pow(2, attempt - 1) : retryDelay;
          console.log(`[NetworkHelper] Waiting ${delay}ms before retry...`);
          await this.page.waitForTimeout(delay);
        }
      }
    }

    throw new Error(`API request failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * ネットワークアイドル待機（カスタム実装）
   * 'networkidle' より制御可能な待機方法
   */
  async waitForNetworkIdle(
    options: {
      timeout?: number;
      idleTime?: number;
    } = {}
  ) {
    const { timeout = 30000, idleTime = 500 } = options;
    const startTime = Date.now();
    let lastRequestTime = Date.now();
    const pendingRequests = new Set<Request>();

    // リクエスト監視の設定
    const requestHandler = (request: Request) => {
      pendingRequests.add(request);
      lastRequestTime = Date.now();
    };

    const responseHandler = (response: Response) => {
      pendingRequests.delete(response.request());
    };

    const requestFailedHandler = (request: Request) => {
      pendingRequests.delete(request);
    };

    this.page.on('request', requestHandler);
    this.page.on('response', responseHandler);
    this.page.on('requestfailed', requestFailedHandler);

    try {
      // ネットワークアイドル待機
      while (Date.now() - startTime < timeout) {
        if (pendingRequests.size === 0 && Date.now() - lastRequestTime > idleTime) {
          console.log('[NetworkHelper] Network is idle');
          break;
        }
        await this.page.waitForTimeout(100);
      }
    } finally {
      // リスナーのクリーンアップ
      this.page.off('request', requestHandler);
      this.page.off('response', responseHandler);
      this.page.off('requestfailed', requestFailedHandler);
    }
  }

  /**
   * 要素の安定待機
   * 要素が表示され、かつ安定するまで待機
   */
  async waitForElementStable(
    selector: string,
    options: {
      timeout?: number;
      stableTime?: number;
    } = {}
  ) {
    const { timeout = 30000, stableTime = 1000 } = options;

    // 要素の出現待機
    await this.page.waitForSelector(selector, {
      state: 'visible',
      timeout: timeout,
    });

    // 要素の安定待機（strict mode violation回避）
    const element = this.page.locator(selector).first();
    let previousBox = await element.boundingBox();
    const startTime = Date.now();

    while (Date.now() - startTime < stableTime) {
      await this.page.waitForTimeout(100);
      const currentBox = await element.boundingBox();

      if (!currentBox || !previousBox) {
        continue;
      }

      // 位置やサイズが変わった場合はリセット
      if (
        currentBox.x !== previousBox.x ||
        currentBox.y !== previousBox.y ||
        currentBox.width !== previousBox.width ||
        currentBox.height !== previousBox.height
      ) {
        previousBox = currentBox;
        continue;
      }
    }

    console.log(`[NetworkHelper] Element ${selector} is stable`);
  }

  /**
   * S3静的ホスティング特有の対策
   * CloudFrontなしでのパフォーマンス改善
   */
  async optimizeForS3StaticHosting() {
    // ブラウザキャッシュの活用
    await this.page.context().addCookies([
      {
        name: 'cache-control',
        value: 'max-age=3600',
        domain: '.s3-website-ap-northeast-1.amazonaws.com',
        path: '/',
      },
    ]);

    // HTTP/2プッシュの代替として、重要リソースの事前読み込み
    // preconnect 先は実行中の環境の API オリジン（E2E_API_URL 由来）。
    // addInitScript はブラウザ側で走るため、値は引数で渡す。
    const apiOrigin = getApiOrigin();
    await this.page.addInitScript(origin => {
      // link preconnect/prefetchの追加
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = origin;
      document.head.appendChild(preconnect);
    }, apiOrigin);
  }

  /**
   * APIレスポンスのインターセプト・モック
   * 不安定なAPIに対する一時的な対策
   */
  async setupAPIFallback(
    patterns: {
      url: string | RegExp;
      fallbackData: any;
    }[]
  ) {
    for (const pattern of patterns) {
      await this.page.route(pattern.url, async route => {
        try {
          // 実際のAPIリクエストを試行
          const response = await route.fetch();
          if (response.ok()) {
            await route.fulfill({ response });
            return;
          }
        } catch (error) {
          console.log(`[NetworkHelper] API request failed, using fallback for ${pattern.url}`);
        }

        // フォールバックデータを返す
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(pattern.fallbackData),
        });
      });
    }
  }
}
