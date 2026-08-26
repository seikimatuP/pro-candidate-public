import { test, expect } from '@playwright/test';
import { getAuthHeaders } from '../helpers/api-auth';
import { getApiBaseUrl } from '../helpers/api-url';

const environment = process.env.E2E_ENVIRONMENT || 'local';

/**
 * API専用E2Eテスト
 * dev/prod環境ではCognito認証トークンを自動付与
 * local環境ではAWS APIに接続できないためスキップ
 */
test.describe('AWS API E2E Tests', () => {
  test.skip(() => environment === 'local', 'local環境ではAWS APIに接続できないためスキップ');

  // E2E_API_URL（run-e2e-test.sh が注入）を優先し、旧名 E2E_API_BASE_URL も
  // 後方互換で受け付ける。末尾スラッシュは helper 側で正規化済み。
  const baseUrl = getApiBaseUrl();

  const authHeaders = getAuthHeaders();

  test('Health Check API', async ({ request }) => {
    const response = await request.get(`${baseUrl}/health`, { headers: authHeaders });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('timestamp');
    expect(data.message).toContain('Pro Baseball API');
  });

  test('Highschool Players API', async ({ request }) => {
    const response = await request.get(`${baseUrl}/players?type=highschool&year=2024`, {
      headers: authHeaders,
    });
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
    const response = await request.get(`${baseUrl}/players?type=university&year=2024`, {
      headers: authHeaders,
    });
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
    const response = await request.get(`${baseUrl}/schools?year=2024`, { headers: authHeaders });
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
      console.log('Schools API returned empty data - this is acceptable'); // eslint-disable-line no-console
    }
  });

  test('API Error Handling - Invalid Year', async ({ request }) => {
    const response = await request.get(`${baseUrl}/players?type=highschool&year=2030`, {
      headers: authHeaders,
    });

    if (!response.ok()) {
      expect(response.status()).toBe(404);
    } else {
      // If successful, should return empty or default data
      const data = await response.json();
      expect(data).toHaveProperty('success');
    }
  });

  test('API Error Handling - Invalid Type', async ({ request }) => {
    const response = await request.get(`${baseUrl}/players?type=invalid&year=2024`, {
      headers: authHeaders,
    });

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
    const response = await request.get(`${baseUrl}/health`, { headers: authHeaders });
    const endTime = Date.now();

    expect(response.ok()).toBeTruthy();

    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(5000); // 5秒以内

    console.log(`API Response Time: ${responseTime}ms`); // eslint-disable-line no-console
  });

  test('API CORS Headers', async ({ request }) => {
    const response = await request.get(`${baseUrl}/health`, { headers: authHeaders });
    expect(response.ok()).toBeTruthy();

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toBeTruthy();
  });
});
