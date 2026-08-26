/* global localStorage, btoa */
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
   *
   * ただし auth.setup.ts が保存した実セッション（storageState）が既に読み込まれている場合は
   * 何もしない。dev/prod とも API Gateway に Cognito authorizer が付いており、
   * ダミートークンで上書きすると実名系 API が 401 になってしまうため。
   */
  async mockAuthentication(environment: 'dev' | 'prod' | 'local' = 'dev'): Promise<void> {
    if (await this.hasRealSession()) {
      return;
    }
    await this.injectMockTokens(environment);
  }

  /**
   * 実 Cognito セッションが localStorage にあるかどうか。
   * ダミートークン（署名が 'mock-signature'）は実セッションとみなさない。
   */
  private async hasRealSession(): Promise<boolean> {
    try {
      if (this.page.url() === 'about:blank') {
        await this.page.goto('/');
      }
      return await this.page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(key => {
          if (!key.startsWith('CognitoIdentityServiceProvider.') || !key.endsWith('.idToken')) {
            return false;
          }
          const token = localStorage.getItem(key) || '';
          return token.length > 0 && !token.endsWith('.mock-signature');
        });
      });
    } catch {
      return false;
    }
  }

  private async injectMockTokens(environment: 'dev' | 'prod' | 'local' = 'dev'): Promise<void> {
    // 環境に応じた設定
    const configs = {
      dev: {
        clientId: 'devclientidxxxxxxxxxxxxxxx',
        userPoolId: 'ap-northeast-1_devPoolId',
      },
      prod: {
        clientId: 'prodclientidxxxxxxxxxxxxxx',
        userPoolId: 'ap-northeast-1_prodPoolId',
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
