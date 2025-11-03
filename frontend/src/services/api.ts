import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { isLocalhost } from '../utils/environment';
import type { PlayersResponse, HealthResponse, SchoolsResponse, PlayerData } from '../types/player';

// 環境変数から設定を取得
const useProductionData = import.meta.env.VITE_USE_PRODUCTION_DATA === 'true';

// 環境に応じたベースURL設定
let baseURL: string;
if (isLocalhost()) {
  // ローカル開発環境: プロキシ使用または環境変数
  baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
} else {
  // デプロイ環境（dev/prod）: 環境変数を優先、なければAPI_CONFIGから取得
  baseURL = import.meta.env.VITE_API_BASE_URL || API_CONFIG.BASE_URL;
}

const timeout = Number(import.meta.env.VITE_API_TIMEOUT) || API_CONFIG.TIMEOUT;
const isDevelopment = import.meta.env.DEV || import.meta.env.VITE_ENVIRONMENT === 'dev';

// 常にAPI設定をログ出力（デバッグ用）
console.log('API Configuration:', {
  isLocalhost: isLocalhost(),
  useProductionData,
  baseURL,
  timeout,
  environment: import.meta.env.VITE_ENVIRONMENT,
  envVar: import.meta.env.VITE_USE_PRODUCTION_DATA,
  willUseMockData: !useProductionData,
  allEnvVars: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
    VITE_USE_PRODUCTION_DATA: import.meta.env.VITE_USE_PRODUCTION_DATA
  }
});

// Axios インスタンス作成（キャッシュ無効化ヘッダー追加）
const apiClient = axios.create({
  baseURL,
  timeout,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
});

// リクエストインターセプター（キャッシュバスティング＆認証トークン）
apiClient.interceptors.request.use(
  async (config) => {
    // 認証トークン追加は現在無効化（CDKデプロイで認証無効化予定）
    // if (!isLocalhost && import.meta.env.VITE_ENVIRONMENT === 'prod') {
    //   try {
    //     const { fetchAuthSession } = await import('aws-amplify/auth');
    //     const session = await fetchAuthSession();
    //     const token = session.tokens?.accessToken?.toString();
    //
    //     if (token) {
    //       config.headers.Authorization = `Bearer ${token}`;
    //     }
    //   } catch (error) {
    //     if (isDevelopment) {
    //       console.warn('Failed to get auth token:', error);
    //     }
    //   }
    // }

    // キャッシュバスティング用のタイムスタンプを追加（GETリクエストのみ）
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }

    if (isDevelopment) {
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        headers: config.headers,
        params: config.params
      });
    }
    return config;
  },
  (error) => {
    if (isDevelopment) {
      console.error('API Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => {
    if (isDevelopment) {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      });
    }
    return response;
  },
  (error) => {
    if (isDevelopment) {
      console.error('API Response Error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL
        }
      });
    }
    return Promise.reject(error);
  }
);

// ローカル環境用モック応答
const createMockResponse = async <T>(data: T, delay: number = 500): Promise<T> => {
  await new Promise(resolve => setTimeout(resolve, delay));
  return data;
};

// API関数
export const apiService = {
  // ヘルスチェック
  getHealth: async (): Promise<HealthResponse> => {
    if (!useProductionData) {
      return createMockResponse({
        status: 'healthy',
        message: 'ローカル環境（モックデータ）',
        timestamp: new Date().toISOString(),
        version: '1.0.0-local'
      });
    }
    const response = await apiClient.get<HealthResponse>(API_CONFIG.ENDPOINTS.HEALTH);
    return response.data;
  },

  // 選手データ取得
  getPlayers: async (): Promise<PlayersResponse> => {
    if (!useProductionData) {
      return createMockResponse({
        success: true,
        data: [],
        metadata: {
          total: 0,
          source: 'mock',
          message: 'ローカル環境用モックデータ'
        },
        count: 0
      });
    }
    const response = await apiClient.get<PlayersResponse>(API_CONFIG.ENDPOINTS.PLAYERS);
    return response.data;
  },

  // 高校生選手データ取得
  getHighschoolPlayers: async (year?: number): Promise<{data: PlayerData[], metadata?: { message?: string; [key: string]: unknown }}> => {
    if (!useProductionData) {
      // モックデータモードでは空配列を返す（コンポーネント側で処理）
      return { data: [], metadata: { message: 'モックデータモードです' } };
    }
    const response = await apiClient.get<PlayersResponse>(
      `${API_CONFIG.ENDPOINTS.PLAYERS}?type=highschool&year=${year || 2024}`
    );
    
    // レスポンス全体を返す（データが存在しない場合でもmetadataのメッセージが利用可能）
    return {
      data: response.data.data || [],
      metadata: response.data.metadata
    };
  },

  // 大学生選手データ取得
  getUniversityPlayers: async (year?: number): Promise<{data: PlayerData[], metadata?: { message?: string; [key: string]: unknown }}> => {
    if (!useProductionData) {
      // モックデータモードでは空配列を返す（コンポーネント側で処理）
      return { data: [], metadata: { message: 'モックデータモードです' } };
    }
    const response = await apiClient.get<PlayersResponse>(
      `${API_CONFIG.ENDPOINTS.PLAYERS}?type=university&year=${year || 2024}`
    );
    
    // レスポンス全体を返す（データが存在しない場合でもmetadataのメッセージが利用可能）
    return {
      data: response.data.data || [],
      metadata: response.data.metadata
    };
  },

  // 学校データ取得
  getSchools: async (): Promise<SchoolsResponse> => {
    if (!useProductionData) {
      return createMockResponse({
        success: true,
        data: [],
        metadata: {
          total: 0,
          source: 'mock',
          message: 'ローカル環境用モック学校データ'
        }
      });
    }
    const response = await apiClient.get<SchoolsResponse>(API_CONFIG.ENDPOINTS.SCHOOLS);
    return response.data;
  },

  // 利用可能年度取得
  getAvailableYears: async () => {
    if (!useProductionData) {
      // モックモードでも2024年〜現在年を返す
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let year = currentYear; year >= 2024; year--) {
        years.push(year);
      }
      return createMockResponse({
        years: years,
        defaultYear: currentYear,
        currentYear: currentYear,
        latestYear: currentYear,
        existingYears: []  // モックモードでは実データなし
      });
    }
    
    try {
      const response = await apiClient.get('/years/available');
      return response.data.data;
    } catch (error) {
      if (isDevelopment) {
        console.error('Available years fetch error:', error);
      }
      
      // フォールバック: 2024年〜現在年
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let year = currentYear; year >= 2024; year--) {
        years.push(year);
      }
      return {
        years: years,
        defaultYear: currentYear,
        currentYear: currentYear,
        latestYear: currentYear,
        existingYears: []
      };
    }
  },

  // スクレイピング実行
  triggerScraping: async (dataType: 'highschool' | 'university' | 'both' = 'both', year?: number) => {
    if (!useProductionData) {
      return createMockResponse({
        success: false,
        message: 'スクレイピングはモックモードでは利用できません'
      });
    }
    
    try {
      if (isDevelopment) {
        console.log('Triggering scraping:', {
          dataType,
          url: '/scraping/trigger',
          baseURL: baseURL
        });
      }
      
      const response = await apiClient.post('/scraping/trigger', {
        type: dataType,
        year: year || new Date().getFullYear()
      });
      
      return response.data;
    } catch (error) {
      if (isDevelopment) {
        console.error('Scraping trigger error:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          response: error && typeof error === 'object' && 'response' in error ? (error as { response?: { data?: unknown } }).response?.data : undefined,
          status: error && typeof error === 'object' && 'response' in error ? (error as { response?: { status?: number } }).response?.status : undefined
        });
      }
      throw error;
    }
  },

  // スクレイピング履歴取得
  getScrapingHistory: async (
    environment: 'dev' | 'prod' = 'dev', 
    limit: number = 50, 
    offset: number = 0
  ) => {
    if (!useProductionData) {
      return createMockResponse({
        data: [],
        metadata: {
          environment,
          total: 0,
          limit,
          offset,
          hasMore: false,
          currentCount: 0
        },
        message: 'スクレイピング履歴はモックモードでは利用できません'
      });
    }
    
    try {
      if (isDevelopment) {
        console.log('Fetching scraping history:', {
          environment,
          limit,
          offset,
          url: `/scraping/history?environment=${environment}&limit=${limit}&offset=${offset}`,
          baseURL: baseURL
        });
      }
      
      const response = await apiClient.get(
        `/scraping/history?environment=${environment}&limit=${limit}&offset=${offset}`
      );
      
      return response.data;
    } catch (error) {
      if (isDevelopment) {
        console.error('Scraping history fetch error:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          response: error && typeof error === 'object' && 'response' in error ? (error as { response?: { data?: unknown } }).response?.data : undefined,
          status: error && typeof error === 'object' && 'response' in error ? (error as { response?: { status?: number } }).response?.status : undefined
        });
      }
      throw error;
    }
  },
};

// 環境設定のエクスポート
export const apiConfig = {
  isLocalhost: isLocalhost(),
  useProductionData,
  baseURL,
  timeout,
  mockDelay: Number(import.meta.env.VITE_MOCK_DELAY) || 500,
};

export default apiService;