/**
 * 環境判定ユーティリティ
 * localhost判定の重複を解消し、環境判定を一元化
 */

/**
 * ローカル環境かどうかを判定
 * @returns {boolean} ローカル環境の場合true
 */
export const isLocalhost = (): boolean => {
  const hostname = window.location.hostname;

  // E2Eテストモードの判定（URLパラメータまたはlocalStorageで検出）
  const isE2ETest =
    window.location.search.includes('e2e=true') ||
    window.localStorage.getItem('E2E_TEST_MODE') === 'true';

  // IPアドレス、localhost、環境変数、E2Eテストでの判定
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    // 環境変数での明示的な指定もサポート
    import.meta.env.VITE_ENVIRONMENT === 'local' ||
    // E2Eテストモード
    isE2ETest
  );
};

/**
 * 現在の環境を判定
 * @returns {'local' | 'dev' | 'prod'} 環境名
 */
export const getEnvironment = (): 'local' | 'dev' | 'prod' => {
  // 環境変数で明示的に指定されている場合はそれを優先
  if (import.meta.env.VITE_ENVIRONMENT) {
    return import.meta.env.VITE_ENVIRONMENT as 'local' | 'dev' | 'prod';
  }

  // ローカル環境
  if (isLocalhost()) {
    return 'local';
  }

  const hostname = window.location.hostname;

  // dev環境の判定（dev, development, staging などを含む）
  if (
    hostname.includes('dev') ||
    hostname.includes('development') ||
    hostname.includes('staging') ||
    hostname.includes('d3brmn978dqs63') // 既存のdev CloudFront
  ) {
    return 'dev';
  }

  // それ以外はprod環境と判定
  return 'prod';
};

/**
 * 環境ごとに異なる値を返す
 * @param config 環境別の設定オブジェクト
 * @returns 現在の環境に対応する値
 */
export const getEnvironmentValue = <T>(config: {
  local?: T;
  dev?: T;
  prod?: T;
  default: T;
}): T => {
  const env = getEnvironment();
  return config[env] ?? config.default;
};

/**
 * 開発環境かどうかを判定（localまたはdev）
 * @returns {boolean} 開発環境の場合true
 */
export const isDevelopment = (): boolean => {
  const env = getEnvironment();
  return env === 'local' || env === 'dev';
};

/**
 * 本番環境かどうかを判定
 * @returns {boolean} 本番環境の場合true
 */
export const isProduction = (): boolean => {
  return getEnvironment() === 'prod';
};

/**
 * 認証が必要かどうかを判定
 * @returns {boolean} 認証が必要な場合true
 */
export const isAuthRequired = (): boolean => {
  // ローカル環境では認証をスキップ
  if (isLocalhost()) {
    return false;
  }

  // 環境変数で明示的に指定されている場合
  if (import.meta.env.VITE_AUTH_REQUIRED !== undefined) {
    return import.meta.env.VITE_AUTH_REQUIRED === 'true';
  }

  // dev/prod環境では認証必須
  return true;
};

/**
 * デモ情報を表示するかどうかを判定
 * @returns {boolean} デモ情報を表示する場合true
 */
export const shouldShowDemoInfo = (): boolean => {
  // 本番環境では絶対に表示しない
  if (isProduction()) {
    return false;
  }

  // 環境変数で明示的に制御
  if (import.meta.env.VITE_SHOW_DEMO_INFO !== undefined) {
    return import.meta.env.VITE_SHOW_DEMO_INFO === 'true';
  }

  // 開発環境ではデフォルトで表示
  return isDevelopment();
};