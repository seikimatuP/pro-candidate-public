import { getEnv } from './env-helper';

/**
 * 実際のホスト名がローカル（開発マシン）かどうかを判定
 *
 * ここは URL パラメータや localStorage の影響を受けない。
 * 利用者が書き換えられる値でローカル扱いに化けさせないための土台。
 * @returns {boolean} ホスト名がローカルの場合true
 */
export const isLocalHostname = (): boolean => {
  const hostname = window.location.hostname;

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.')
  );
};

/**
 * E2Eテストモードが有効かどうかを判定
 *
 * `e2e=true` / `localStorage.E2E_TEST_MODE` はブラウザ側で誰でも立てられるため、
 * **実ホスト名が localhost / 127.0.0.1 のときだけ**尊重する。
 * CloudFront などのデプロイ済みドメインでは常に false を返し、
 * 画面ガードをフラグだけで外せないようにする。
 * @returns {boolean} E2Eテストモードの場合true
 */
export const isE2ETestMode = (): boolean => {
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return false;
  }

  return (
    window.location.search.includes('e2e=true') ||
    window.localStorage.getItem('E2E_TEST_MODE') === 'true'
  );
};

/**
 * ローカル環境かどうかを判定
 * @returns {boolean} ローカル環境の場合true
 */
export const isLocalhost = (): boolean => {
  return (
    isLocalHostname() ||
    // 環境変数での明示的な指定もサポート（ビルド時に決まるので利用者は変更できない）
    getEnv().VITE_ENVIRONMENT === 'local' ||
    // E2Eテストモード（ローカルホスト上でのみ有効）
    isE2ETestMode()
  );
};

/**
 * 現在の環境を判定
 * @returns {'local' | 'dev' | 'prod'} 環境名
 */
export const getEnvironment = (): 'local' | 'dev' | 'prod' => {
  // 環境変数で明示的に指定されている場合はそれを優先
  const env = getEnv();
  if (env.VITE_ENVIRONMENT) {
    return env.VITE_ENVIRONMENT as 'local' | 'dev' | 'prod';
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
  const env = getEnv();
  if (env.VITE_AUTH_REQUIRED !== undefined) {
    return env.VITE_AUTH_REQUIRED === 'true';
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
  const env = getEnv();
  if (env.VITE_SHOW_DEMO_INFO !== undefined) {
    return env.VITE_SHOW_DEMO_INFO === 'true';
  }

  // 開発環境ではデフォルトで表示
  return isDevelopment();
};