/**
 * デバッグ用ユーティリティ
 */
import log from './logger';
export const debugInfo = {
  // 環境変数の状態を表示
  logEnvironment: () => {
    log.debug('🔧 Environment Debug Info');
    log.debug('NODE_ENV:', import.meta.env.NODE_ENV);
    log.debug('DEV:', import.meta.env.DEV);
    log.debug('PROD:', import.meta.env.PROD);
    log.debug('MODE:', import.meta.env.MODE);
    log.debug('BASE_URL:', import.meta.env.BASE_URL);
    log.debug('USE_PRODUCTION_DATA:', import.meta.env.VITE_USE_PRODUCTION_DATA);
    log.debug('API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    log.debug('API_TIMEOUT:', import.meta.env.VITE_API_TIMEOUT);
    log.debug('ENABLE_DEBUG:', import.meta.env.VITE_ENABLE_DEBUG);
    log.debug('All env vars:', import.meta.env);
  },

  // API設定の状態を表示
  logApiConfig: (config: Record<string, unknown>) => {
    log.debug('🌐 API Configuration');
    log.debug('Use Production Data:', config.useProductionData);
    log.debug('Base URL:', config.baseURL);
    log.debug('Timeout:', config.timeout);
    log.debug('Mock Delay:', config.mockDelay);
  },

  // エラー詳細を表示
  logError: (context: string, error: Error & { response?: { status?: number; data?: unknown; headers?: unknown }; config?: { url?: string; method?: string; baseURL?: string; headers?: unknown } }) => {
    log.error(`❌ Error in ${context}`);
    log.error('Error object:', error);
    log.error('Error message:', error.message);
    log.error('Error stack:', error.stack);
    if (error.response) {
      log.error('Response status:', error.response.status);
      log.error('Response data:', error.response.data);
      log.error('Response headers:', error.response.headers);
    }
    if (error.config) {
      log.error('Request config:', {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL,
        headers: error.config.headers
      });
    }
  },

  // データ読み込み状況を表示
  logDataLoad: (dataType: string, data: unknown, isLoading: boolean, error: unknown) => {
    log.debug(`📊 Data Load: ${dataType}`);
    log.debug('Loading:', isLoading);
    log.debug('Data:', data);
    log.debug('Error:', error);
    log.debug('Data length:', Array.isArray(data) ? data.length : 'N/A');
  }
};

// グローバルに公開（ブラウザコンソールからアクセス可能）
if (typeof window !== 'undefined') {
  (window as typeof window & { debugInfo: typeof debugInfo }).debugInfo = debugInfo;
}