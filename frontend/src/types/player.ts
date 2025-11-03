export interface PlayerData {
  id: string;
  name: string;
  school: string;
  type?: 'highschool' | 'university';
  year?: number;
  position?: string;
  prefecture?: string;
  region?: string;
  filingDate: string;
  height?: string;
  weight?: string;
  battingStyle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayersResponse {
  success: boolean;
  data: PlayerData[];
  metadata: {
    year?: number;
    message?: string;
    totalCount?: number;
    highschoolCount?: number;
    universityCount?: number;
    lastUpdated?: string;
  };
  count: number;
}

export interface TrendData {
  date: string;
  highschoolCount: number;
  universityCount: number;
  totalCount: number;
}

export interface StatisticsResponse {
  success: boolean;
  data: {
    yearly: Array<{
      year: number;
      highschool: number;
      university: number;
      total: number;
    }>;
    monthly: Array<{
      month: string;
      highschool: number;
      university: number;
      total: number;
    }>;
    trend: TrendData[];
  };
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  bucket?: string;
}

export interface SchoolsResponse {
  success: boolean;
  data: Array<{ name: string; [key: string]: unknown }>;
  message?: string;
}

// スクレイピング履歴関連の型定義
export interface ScrapingHistoryRecord {
  id: string;
  timestamp: string;
  type: 'highschool' | 'university' | 'both';
  typeLabel?: string;  // 表示用のラベル（年度を含む）
  year?: number;  // スクレイピング対象年度
  environment: 'dev' | 'prod';
  duration: number;
  lastExecutionDate?: string | null;  // 前回実行日
  daysSinceLastUpdate?: number | null;  // 前回実行からの経過日数
  updatePeriod?: string;  // 更新期間表示（例：「3日分」「初回実行」）
  results: {
    highschool?: {
      currentCount: number;
      previousCount: number;
      difference: number;
      newPlayers: string[];
      removedPlayers: string[];
    };
    university?: {
      currentCount: number;
      previousCount: number;
      difference: number;
      newPlayers: string[];
      removedPlayers: string[];
    };
  };
  summary: {
    totalCurrent: number;
    totalPrevious: number;
    totalDifference: number;
  };
  triggeredBy: 'manual' | 'scheduled';
}

export interface ScrapingHistoryResponse {
  success: boolean;
  data: ScrapingHistoryRecord[];
  metadata: {
    environment: 'dev' | 'prod';
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    currentCount: number;
  };
  message?: string;
}

// 年度管理関連の型定義
export interface YearData {
  years: number[];
  defaultYear: number;
  currentYear: number;
  latestYear: number;
}

export interface YearSelectorState {
  selectedYear: number;
  availableYears: number[];
  isLoading: boolean;
  error: string | null;
}