// API設定
// 環境変数から取得、未設定の場合はデフォルト値を使用
const getApiBaseUrl = () => {
  // 環境変数から取得
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 環境に応じたデフォルト値
  // 本番環境
  if (import.meta.env.PROD) {
    // CloudFrontのドメインから環境を判定
    const hostname = window.location.hostname;
    if (hostname.includes('d3brmn978dqs63')) {
      // dev環境
      return 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev';
    } else if (hostname.includes('dh2yk8y9mj9wl')) {
      // prod環境
      return 'https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod';
    }
  }

  // ローカル開発環境のデフォルト
  return '/api';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    HEALTH: '/health',
    PLAYERS: '/players',
    SCHOOLS: '/schools',
    STATISTICS: '/statistics',
  },
  TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
};

export const API_URLS = {
  health: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HEALTH}`,
  players: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PLAYERS}`,
  schools: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCHOOLS}`,
};
