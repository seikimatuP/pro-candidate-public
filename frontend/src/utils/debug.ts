/**
 * デバッグ用ユーティリティ
 */

export const debugInfo = {
  // 環境変数の状態を表示
  logEnvironment: () => {
    console.group('🔧 Environment Debug Info');
    console.log('NODE_ENV:', import.meta.env.NODE_ENV);
    console.log('DEV:', import.meta.env.DEV);
    console.log('PROD:', import.meta.env.PROD);
    console.log('MODE:', import.meta.env.MODE);
    console.log('BASE_URL:', import.meta.env.BASE_URL);
    console.log('USE_PRODUCTION_DATA:', import.meta.env.VITE_USE_PRODUCTION_DATA);
    console.log('API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    console.log('API_TIMEOUT:', import.meta.env.VITE_API_TIMEOUT);
    console.log('ENABLE_DEBUG:', import.meta.env.VITE_ENABLE_DEBUG);
    console.log('All env vars:', import.meta.env);
    console.groupEnd();
  },

  // API設定の状態を表示
  logApiConfig: (config: Record<string, unknown>) => {
    console.group('🌐 API Configuration');
    console.log('Use Production Data:', config.useProductionData);
    console.log('Base URL:', config.baseURL);
    console.log('Timeout:', config.timeout);
    console.log('Mock Delay:', config.mockDelay);
    console.groupEnd();
  },

  // エラー詳細を表示
  logError: (context: string, error: Error & { response?: { status?: number; data?: unknown; headers?: unknown }; config?: { url?: string; method?: string; baseURL?: string; headers?: unknown } }) => {
    console.group(`❌ Error in ${context}`);
    console.error('Error object:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    }
    if (error.config) {
      console.error('Request config:', {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL,
        headers: error.config.headers
      });
    }
    console.groupEnd();
  },

  // データ読み込み状況を表示
  logDataLoad: (dataType: string, data: unknown, isLoading: boolean, error: unknown) => {
    console.group(`📊 Data Load: ${dataType}`);
    console.log('Loading:', isLoading);
    console.log('Data:', data);
    console.log('Error:', error);
    console.log('Data length:', Array.isArray(data) ? data.length : 'N/A');
    console.groupEnd();
  }
};

// グローバルに公開（ブラウザコンソールからアクセス可能）
if (typeof window !== 'undefined') {
  (window as typeof window & { debugInfo: typeof debugInfo }).debugInfo = debugInfo;
}