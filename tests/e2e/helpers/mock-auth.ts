import { Page } from '@playwright/test';

/**
 * 認証状態をモックして、Cognitoリダイレクトをバイパスする
 */
export class MockAuth {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 認証済み状態をシミュレート
   * Cognitoトークンを直接localStorageに設定して認証をバイパス
   */
  async mockAuthentication(environment: 'dev' | 'prod' | 'local' = 'dev'): Promise<void> {
    // 環境に応じた設定
    const configs = {
      dev: {
        clientId: '6cfk60qf91r0qch7nfjops0scd',
        userPoolId: 'ap-northeast-1_yRTv0CRfz',
      },
      prod: {
        clientId: '3vuipnf467d9q43k40fo480fdk',
        userPoolId: 'ap-northeast-1_5m7pnXzt8',
      },
      local: {
        clientId: 'local-client',
        userPoolId: 'local-pool',
      },
    };

    const config = configs[environment as keyof typeof configs];
    const username = 'admin';

    // ダミートークンを作成（実際のCognito形式に準拠）
    const mockTokens = {
      idToken: this.generateMockJWT({
        'cognito:username': username,
        email: 'admin@example.com',
        email_verified: true,
        name: 'Admin User',
      }),
      accessToken: this.generateMockJWT({
        username: username,
        client_id: config.clientId,
        token_use: 'access',
      }),
      refreshToken: 'mock-refresh-token',
    };

    // アプリケーションのルートにアクセス
    await this.page.goto('/');

    // localStorageに認証情報を設定
    await this.page.evaluate(
      ({ config, username, tokens }) => {
        const prefix = `CognitoIdentityServiceProvider.${config.clientId}`;

        // Cognitoトークンを保存
        localStorage.setItem(`${prefix}.${username}.idToken`, tokens.idToken);
        localStorage.setItem(`${prefix}.${username}.accessToken`, tokens.accessToken);
        localStorage.setItem(`${prefix}.${username}.refreshToken`, tokens.refreshToken);
        localStorage.setItem(`${prefix}.LastAuthUser`, username);

        // ユーザーデータを保存
        localStorage.setItem(
          `${prefix}.${username}.userData`,
          JSON.stringify({
            Username: username,
            Attributes: [
              { Name: 'email', Value: 'admin@example.com' },
              { Name: 'email_verified', Value: 'true' },
              { Name: 'name', Value: 'Admin User' },
            ],
          })
        );

        // クロックドリフトを設定
        localStorage.setItem(`${prefix}.${username}.clockDrift`, '0');

        // E2Eテストモードフラグ
        localStorage.setItem('E2E_TEST_MODE', 'true');
        localStorage.setItem('MOCK_AUTH', 'true');
      },
      { config, username, tokens: mockTokens }
    );

    // ページをリロードして認証状態を反映
    await this.page.reload();

    // 少し待機
    await this.page.waitForTimeout(1000);
  }

  /**
   * モックJWTトークンを生成
   */
  private generateMockJWT(payload: Record<string, unknown>): string {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + 3600, // 1時間後
      iss: 'https://cognito-idp.ap-northeast-1.amazonaws.com/mock',
      sub: 'mock-sub-id',
      aud: 'mock-audience',
    };

    // Base64エンコード（簡易版）
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(fullPayload));
    const signature = 'mock-signature';

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * 認証状態をクリア
   */
  async clearAuthentication(): Promise<void> {
    await this.page.evaluate(() => {
      // Cognito関連のlocalStorageをクリア
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('CognitoIdentityServiceProvider')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem('E2E_TEST_MODE');
      localStorage.removeItem('MOCK_AUTH');
    });
  }
}
