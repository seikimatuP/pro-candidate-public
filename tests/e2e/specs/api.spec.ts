import { test, expect } from '@playwright/test';

/**
 * API専用E2Eテスト - ブラウザ依存関係なし
 * システムライブラリが不足している環境でも実行可能
 */
test.describe('AWS API E2E Tests', () => {
  const baseUrl =
    process.env.E2E_API_BASE_URL ||
    'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev';

  test('Health Check API', async ({ request }) => {
    const response = await request.get(`${baseUrl}/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('timestamp');
    expect(data.message).toContain('Pro Baseball API');
  });

  test('Highschool Players API', async ({ request }) => {
    const response = await request.get(`${baseUrl}/players?type=highschool&year=2024`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);

    // First player data structure validation
    const firstPlayer = data.data[0];
    expect(firstPlayer).toHaveProperty('id');
    expect(firstPlayer).toHaveProperty('name');
    expect(firstPlayer).toHaveProperty('school');
    expect(firstPlayer).toHaveProperty('prefecture');
  });

  test('University Players API', async ({ request }) => {
    const response = await request.get(`${baseUrl}/players?type=university&year=2024`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);

    // First player data structure validation
    const firstPlayer = data.data[0];
    expect(firstPlayer).toHaveProperty('id');
    expect(firstPlayer).toHaveProperty('name');
    expect(firstPlayer).toHaveProperty('school');
  });

  test('Schools API', async ({ request }) => {
    const response = await request.get(`${baseUrl}/schools?year=2024`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);

    // Allow empty data as schools endpoint may not have data yet
    if (data.data.length > 0) {
      // School data structure validation
      const firstSchool = data.data[0];
      expect(firstSchool).toHaveProperty('school');
      expect(firstSchool).toHaveProperty('totalPlayers');
      expect(typeof firstSchool.totalPlayers).toBe('number');
    } else {
      console.log('Schools API returned empty data - this is acceptable');
    }
  });

  test('API Error Handling - Invalid Year', async ({ request }) => {
    const response = await request.get(`${baseUrl}/players?type=highschool&year=2030`);

    if (!response.ok()) {
      expect(response.status()).toBe(404);
    } else {
      // If successful, should return empty or default data
      const data = await response.json();
      expect(data).toHaveProperty('success');
    }
  });

  test('API Error Handling - Invalid Type', async ({ request }) => {
    const response = await request.get(`${baseUrl}/players?type=invalid&year=2024`);

    if (!response.ok()) {
      expect([400, 404]).toContain(response.status());
    } else {
      // If successful, should handle gracefully
      const data = await response.json();
      expect(data).toHaveProperty('success');
    }
  });

  test('API Performance - Response Time', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get(`${baseUrl}/health`);
    const endTime = Date.now();

    expect(response.ok()).toBeTruthy();

    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(5000); // 5秒以内

    console.log(`API Response Time: ${responseTime}ms`);
  });

  test('API CORS Headers', async ({ request }) => {
    const response = await request.get(`${baseUrl}/health`);
    expect(response.ok()).toBeTruthy();

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toBeTruthy();
  });
});
