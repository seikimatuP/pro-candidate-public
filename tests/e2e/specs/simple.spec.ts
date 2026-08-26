import { test, expect } from '@playwright/test';

test.describe('Simple Test', () => {
  test('should pass a basic test', async ({ page }) => {
    const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
    
    try {
      await page.goto(baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // タイトル確認（より柔軟な判定）
      await expect(page).toHaveTitle(/プロ野球志望届管理システム|Vite|React/);
      
      console.log('✅ Simple test passed successfully');
    } catch (err) {
      console.log(`⚠️ Simple test environment info: ${baseUrl}`);
      console.log(`⚠️ Current title: ${await page.title()}`);
      throw err;
    }
  });
});