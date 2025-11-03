/* eslint-disable no-console, @typescript-eslint/no-unused-vars */
import { FullConfig } from '@playwright/test';

/**
 * グローバルティアダウン
 * テスト実行後のクリーンアップ
 */
async function globalTeardown(config: FullConfig) {
  console.log('[Global Teardown] Starting cleanup...');

  // 環境変数のクリーンアップ
  delete process.env.TEST_ENV;
  delete process.env.API_BASE_URL;

  // テスト結果のサマリー出力
  const testEnv = process.env.E2E_BASE_URL || 'local';
  console.log(`[Global Teardown] Tests completed for environment: ${testEnv}`);

  console.log('[Global Teardown] Cleanup completed');
}

export default globalTeardown;
