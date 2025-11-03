/* eslint-disable security/detect-object-injection */
/**
 * E2Eテスト環境別設定
 * ネットワーク遅延対策のための環境特化設定
 */

export interface EnvironmentConfig {
  name: string;
  baseUrl: string;
  apiUrl: string;
  timeouts: {
    navigation: number;
    action: number;
    test: number;
    apiRequest: number;
  };
  retries: {
    navigation: number;
    api: number;
  };
  delays: {
    betweenRetries: number;
    afterNavigation: number;
    betweenActions: number;
  };
  features: {
    useNetworkOptimization: boolean;
    useAPIFallback: boolean;
    preWarmEndpoints: boolean;
    useStableWait: boolean;
  };
}

// 環境判定
function getEnvironmentName(): string {
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';

  if (baseUrl.includes('.cloudfront.net') && baseUrl.includes('prod')) {
    return 'prod';
  } else if (baseUrl.includes('.cloudfront.net') && baseUrl.includes('dev')) {
    return 'dev';
  } else if (baseUrl.includes('prod.s3-website') || baseUrl.includes('prod/')) {
    return 'prod';
  } else if (baseUrl.includes('dev.s3-website') || baseUrl.includes('dev/')) {
    return 'dev';
  } else {
    return 'local';
  }
}

// 環境別設定
const configurations: Record<string, EnvironmentConfig> = {
  local: {
    name: 'local',
    baseUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:3000',
    timeouts: {
      navigation: 30000,
      action: 10000,
      test: 30000,
      apiRequest: 10000,
    },
    retries: {
      navigation: 1,
      api: 1,
    },
    delays: {
      betweenRetries: 1000,
      afterNavigation: 500,
      betweenActions: 100,
    },
    features: {
      useNetworkOptimization: false,
      useAPIFallback: false,
      preWarmEndpoints: false,
      useStableWait: false,
    },
  },
  dev: {
    name: 'dev',
    baseUrl: process.env.E2E_BASE_URL || 'http://localhost:5173',
    apiUrl:
      process.env.E2E_API_URL || 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev',
    timeouts: {
      navigation: 120000, // 2分（CloudFront高速化対応）
      action: 45000, // 45秒
      test: 90000, // 1.5分
      apiRequest: 30000, // 30秒
    },
    retries: {
      navigation: 3,
      api: 3,
    },
    delays: {
      betweenRetries: 5000, // 5秒
      afterNavigation: 3000, // 3秒（S3読み込み待機）
      betweenActions: 500, // 500ms
    },
    features: {
      useNetworkOptimization: true,
      useAPIFallback: true,
      preWarmEndpoints: true,
      useStableWait: true,
    },
  },
  prod: {
    name: 'prod',
    baseUrl: process.env.E2E_BASE_URL || 'http://localhost:5173',
    apiUrl:
      process.env.E2E_API_URL || 'https://9cyk8cfgo1.execute-api.ap-northeast-1.amazonaws.com/prod',
    timeouts: {
      navigation: 240000, // 4分
      action: 90000, // 1.5分
      test: 180000, // 3分
      apiRequest: 45000, // 45秒
    },
    retries: {
      navigation: 4,
      api: 4,
    },
    delays: {
      betweenRetries: 10000, // 10秒
      afterNavigation: 5000, // 5秒
      betweenActions: 1000, // 1秒
    },
    features: {
      useNetworkOptimization: true,
      useAPIFallback: true,
      preWarmEndpoints: true,
      useStableWait: true,
    },
  },
};

// 現在の環境設定を取得
export function getEnvironmentConfig(): EnvironmentConfig {
  const envName = getEnvironmentName();
  return configurations[envName] || configurations.local;
}

// APIフォールバックデータ
export const API_FALLBACK_DATA = {
  '/health': {
    status: 'ok',
    timestamp: new Date().toISOString(),
  },
  '/players': {
    players: [],
    total: 0,
  },
  '/years/available': {
    years: [2024, 2023, 2022],
  },
  '/scraping/history': {
    history: [],
    total: 0,
  },
};

// テスト安定化のためのユーティリティ
export const STABILITY_SELECTORS = {
  // 読み込み完了を示すセレクタ
  pageLoaded: 'h1, [data-testid="app-header"]',
  dashboardLoaded: '[data-testid="total-players-card"], [class*="MuiCard"], [class*="Alert"]',
  tableLoaded: '[class*="MuiDataGrid"], [class*="MuiTable"], [data-testid="players-table"]',

  // エラー状態のセレクタ
  errorAlert: '[class*="Alert"][severity="error"], [class*="MuiAlert-standardError"]',
  loadingSpinner: '[class*="CircularProgress"], [class*="MuiSkeleton"]',
};

// パフォーマンス閾値（環境別）
export const PERFORMANCE_THRESHOLDS = {
  local: {
    firstContentfulPaint: 1000,
    largestContentfulPaint: 2000,
    timeToInteractive: 3000,
  },
  dev: {
    firstContentfulPaint: 5000,
    largestContentfulPaint: 10000,
    timeToInteractive: 15000,
  },
  prod: {
    firstContentfulPaint: 7000,
    largestContentfulPaint: 15000,
    timeToInteractive: 20000,
  },
};
