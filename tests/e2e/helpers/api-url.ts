/**
 * E2E テストが叩く API Gateway のベース URL を一元的に解決する。
 *
 * 優先順位:
 *   1. E2E_API_URL       … scripts/run-e2e-test.sh が CloudFormation の
 *                           ApiEndpoint から注入する（末尾スラッシュ付き）
 *   2. E2E_API_BASE_URL  … 旧名。Doppler 等の外部設定に残っている可能性が
 *                           あるため後方互換として残す
 *   3. dev の API Gateway URL（ローカル実行時のフォールバック）
 *
 * 返り値は末尾スラッシュを除去して正規化する。呼び出し側は
 * `${getApiBaseUrl()}/health` のようにスラッシュ付きで連結すること。
 */

/** dev 環境の API Gateway URL。環境変数が無いときのフォールバック。 */
export const DEFAULT_API_BASE_URL =
  'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev';

/**
 * 末尾スラッシュを除いた API ベース URL を返す。
 */
export function getApiBaseUrl(): string {
  const raw = process.env.E2E_API_URL || process.env.E2E_API_BASE_URL || DEFAULT_API_BASE_URL;
  return raw.replace(/\/+$/, '');
}

/**
 * API のオリジン（scheme + host）を返す。preconnect など
 * パスを含めたくない用途で使う。
 */
export function getApiOrigin(): string {
  try {
    return new URL(getApiBaseUrl()).origin;
  } catch {
    return new URL(DEFAULT_API_BASE_URL).origin;
  }
}
