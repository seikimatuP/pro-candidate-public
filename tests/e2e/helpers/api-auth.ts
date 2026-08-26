import * as fs from 'fs';
import * as path from 'path';

/**
 * auth.setup.ts が保存した認証状態から Cognito の idToken を取得する。
 *
 * dev / prod とも API Gateway に Cognito authorizer が設定されており、
 * 実名系・管理系のエンドポイントは admin グループ必須。
 * API を直接叩くテストは環境を問わずこのトークンを付与する必要がある。
 */
export function getAuthToken(): string | undefined {
  const environment = process.env.E2E_ENVIRONMENT || 'local';
  if (environment === 'local') return undefined;

  try {
    const authFile = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'playwright',
      '.auth',
      `${environment}.json`
    );
    const authState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    for (const origin of authState.origins || []) {
      for (const item of origin.localStorage || []) {
        if (item.name.endsWith('.idToken')) {
          return item.value;
        }
      }
    }
  } catch {
    console.log('認証状態ファイルの読み込みに失敗 - 認証なしでAPI呼び出し'); // eslint-disable-line no-console
  }
  return undefined;
}

/**
 * API リクエストへ付与する Authorization ヘッダーを組み立てる。
 * トークンを取得できない場合は空オブジェクトを返す（local 環境・認証不要エンドポイント向け）。
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
