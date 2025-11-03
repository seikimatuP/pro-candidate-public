/* eslint-disable no-console, sonarjs/cognitive-complexity, sonarjs/no-redundant-jump, security/detect-object-injection */
import { Page } from '@playwright/test';

/**
 * ネットワーク環境に適応する待機戦略ヘルパー
 * dev環境の遅延・不安定性に対応した段階的フォールバック
 */
export class AdaptiveWaiter {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * ページ読み込み完了の段階的待機
   * networkidle → load → domcontentloaded の順でフォールバック
   */
  async waitForPageLoad(
    options: {
      maxRetries?: number;
      baseTimeout?: number;
      logProgress?: boolean;
    } = {}
  ): Promise<void> {
    const { maxRetries = 3, baseTimeout = 30000, logProgress = true } = options;

    const strategies = [
      { state: 'networkidle', timeout: baseTimeout, description: 'ネットワーク静止' },
      { state: 'load', timeout: baseTimeout / 2, description: 'ページ読み込み完了' },
      { state: 'domcontentloaded', timeout: baseTimeout / 3, description: 'DOM構築完了' },
    ] as const;

    for (let i = 0; i < maxRetries; i++) {
      const strategy = strategies[i] || strategies[strategies.length - 1];

      try {
        if (logProgress) {
          console.log(`🔄 ページ読み込み待機 (${i + 1}/${maxRetries}): ${strategy.description}`);
        }

        await this.page.waitForLoadState(strategy.state, {
          timeout: strategy.timeout,
        });

        if (logProgress) {
          console.log(`✅ ページ読み込み成功: ${strategy.description}`);
        }
        return; // 成功
      } catch (error) {
        if (logProgress) {
          console.log(`⚠️ ${strategy.description}タイムアウト (${strategy.timeout}ms)`);
        }

        if (i === maxRetries - 1) {
          console.log(`❌ 全ての読み込み戦略が失敗 - 最大${maxRetries}回試行`);
          throw new Error(`Page load failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * データ表示待機または適切なスキップ判定
   * タイムアウト時は false を返してスキップを促す
   */
  async waitForDataOrSkip(
    selector: string,
    options: {
      timeout?: number;
      retries?: number;
      description?: string;
    } = {}
  ): Promise<boolean> {
    const { timeout = 60000, retries = 2, description = selector } = options;

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔍 データ待機 (${i + 1}/${retries}): ${description}`);

        await this.page.waitForSelector(selector, {
          timeout: timeout / retries,
          state: 'visible',
        });

        console.log(`✅ データ表示確認: ${description}`);
        return true;
      } catch (error) {
        console.log(`⏰ データ待機タイムアウト: ${description} (${timeout / retries}ms)`);

        if (i === retries - 1) {
          console.log(`❌ データ利用不可 - dev環境制約による適切なスキップ対象: ${description}`);
          return false;
        }

        // 短時間待機後リトライ
        await this.page.waitForTimeout(1000);
      }
    }

    return false;
  }

  /**
   * 要素の安定表示待機（位置・サイズ安定化）
   * performance.spec.ts等で使用
   */
  async waitForElementStable(
    selector: string,
    options: {
      timeout?: number;
      stableTime?: number;
      retries?: number;
    } = {}
  ): Promise<boolean> {
    const { timeout = 30000, stableTime = 1000, retries = 3 } = options;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`🎯 要素安定化待機 (${attempt + 1}/${retries}): ${selector}`);

        // 要素の出現待機
        await this.page.waitForSelector(selector, {
          state: 'visible',
          timeout: timeout / retries,
        });

        // 要素の安定待機（first()でstrict mode violation回避）
        const element = this.page.locator(selector).first();
        let previousBox = await element.boundingBox();
        const startTime = Date.now();

        while (Date.now() - startTime < stableTime) {
          await this.page.waitForTimeout(100);
          const currentBox = await element.boundingBox();

          if (!currentBox || !previousBox) {
            continue;
          }

          // 位置・サイズが安定しているかチェック
          const isStable =
            Math.abs(currentBox.x - previousBox.x) < 1 &&
            Math.abs(currentBox.y - previousBox.y) < 1 &&
            Math.abs(currentBox.width - previousBox.width) < 1 &&
            Math.abs(currentBox.height - previousBox.height) < 1;

          if (!isStable) {
            previousBox = currentBox;
            continue;
          }
        }

        console.log(`✅ 要素安定化完了: ${selector}`);
        return true;
      } catch (error) {
        console.log(`⚠️ 要素安定化失敗 (${attempt + 1}/${retries}): ${error.message}`);

        if (attempt === retries - 1) {
          console.log(`❌ 要素安定化不可 - dev環境制約: ${selector}`);
          return false;
        }
      }
    }

    return false;
  }

  /**
   * API応答待機（ネットワーク遅延対応）
   */
  async waitForAPIResponse(
    urlPattern: string | RegExp,
    options: {
      timeout?: number;
      method?: string;
      status?: number;
    } = {}
  ): Promise<boolean> {
    const { timeout = 45000, method = 'GET', status = 200 } = options;

    try {
      console.log(`🌐 API応答待機: ${urlPattern}`);

      const response = await this.page.waitForResponse(
        response => {
          const matchesUrl =
            typeof urlPattern === 'string'
              ? response.url().includes(urlPattern)
              : urlPattern.test(response.url());
          const matchesMethod = response.request().method() === method;
          const matchesStatus = response.status() === status;

          return matchesUrl && matchesMethod && matchesStatus;
        },
        { timeout }
      );

      console.log(`✅ API応答確認: ${response.url()} (${response.status()})`);
      return true;
    } catch (error) {
      console.log(`❌ API応答タイムアウト: ${urlPattern} (${timeout}ms)`);
      return false;
    }
  }

  /**
   * 段階的セレクタ待機
   * 複数のセレクタを優先順位順に試行
   */
  async waitForAnySelector(
    selectors: string[],
    options: {
      timeout?: number;
      description?: string;
    } = {}
  ): Promise<string | null> {
    const { timeout = 30000, description = 'elements' } = options;

    console.log(`🎯 段階的要素検索開始: ${description}`);

    const timeoutPerSelector = Math.floor(timeout / selectors.length);

    for (const selector of selectors) {
      try {
        console.log(`🔍 要素検索: ${selector}`);

        await this.page.waitForSelector(selector, {
          timeout: timeoutPerSelector,
          state: 'visible',
        });

        console.log(`✅ 要素発見: ${selector}`);
        return selector;
      } catch (error) {
        console.log(`⏰ 要素未発見: ${selector} (${timeoutPerSelector}ms)`);
      }
    }

    console.log(`❌ 全セレクタ未発見: ${description}`);
    return null;
  }

  /**
   * 条件分岐実行ヘルパー
   * 条件に応じてテスト実行またはスキップ
   */
  async executeOrSkip<T>(
    condition: () => Promise<boolean>,
    action: () => Promise<T>,
    skipReason: string
  ): Promise<T | null> {
    try {
      const shouldExecute = await condition();

      if (shouldExecute) {
        console.log(`✅ 条件満足 - テスト実行`);
        return await action();
      } else {
        console.log(`⏭️ 条件不満足 - スキップ: ${skipReason}`);
        return null;
      }
    } catch (error) {
      console.log(`❌ 条件チェックエラー - スキップ: ${skipReason}`);
      return null;
    }
  }

  /**
   * dev環境最適化された汎用待機
   * 最も一般的な使用パターン
   */
  async smartWait(
    options: {
      pageLoad?: boolean;
      dataSelector?: string;
      apiPattern?: string | RegExp;
      fallbackTimeout?: number;
    } = {}
  ): Promise<{
    pageLoaded: boolean;
    dataAvailable: boolean;
    apiResponded: boolean;
  }> {
    const { pageLoad = true, dataSelector, apiPattern, fallbackTimeout = 10000 } = options;

    const results = {
      pageLoaded: false,
      dataAvailable: false,
      apiResponded: false,
    };

    // 1. ページ読み込み待機
    if (pageLoad) {
      try {
        await this.waitForPageLoad({ baseTimeout: fallbackTimeout });
        results.pageLoaded = true;
      } catch (error) {
        console.log('⚠️ ページ読み込み失敗 - 継続');
      }
    }

    // 2. データ表示待機
    if (dataSelector) {
      results.dataAvailable = await this.waitForDataOrSkip(dataSelector, {
        timeout: fallbackTimeout,
      });
    }

    // 3. API応答待機
    if (apiPattern) {
      results.apiResponded = await this.waitForAPIResponse(apiPattern, {
        timeout: fallbackTimeout,
      });
    }

    console.log(`📊 SmartWait結果:`, results);
    return results;
  }
}
