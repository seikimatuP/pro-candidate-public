/**
 * 共有型定義
 * frontend/backend間で共通使用する型
 *
 * 使用方法:
 * - frontend: import { PlayerData } from '../../shared/types';
 * - backend: import { PlayerData } from '../shared/types';
 */

// =========================================
// 選手データ関連
// =========================================

/**
 * 選手タイプ
 */
export type PlayerType = 'highschool' | 'university';

/**
 * 選手データの基本インターフェース
 * frontend/backend両方で使用
 */
export interface PlayerData {
  /** 一意ID: {type}_{year}_{index} */
  id: string;
  /** 選手名 */
  name: string;
  /** 学校名 */
  school: string;
  /** 選手タイプ */
  type?: PlayerType;
  /** 年度 */
  year?: number;
  /** ポジション */
  position?: string;
  /** 都道府県 */
  prefecture?: string;
  /** 地域 */
  region?: string;
  /** 志望届提出日 */
  filingDate: string;
  /** 身長 */
  height?: string;
  /** 体重 */
  weight?: string;
  /** 打撃スタイル */
  battingStyle?: string;
  /** ドラフト対象者かどうか */
  isDraftEligible?: boolean;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
}

/**
 * S3ファイル用の選手データファイル構造
 */
export interface PlayersDataFile {
  metadata: {
    year: number;
    type: PlayerType;
    totalCount: number;
    lastUpdated: string;
    version: string;
  };
  players: PlayerData[];
}

/**
 * 選手インデックスファイル構造
 */
export interface PlayersIndex {
  type: PlayerType;
  availableYears: number[];
  totalRecords: number;
  latestYear: number;
  lastUpdated: string;
  files: {
    year: number;
    filename: string;
    recordCount: number;
    fileSize: number;
    lastModified: string;
  }[];
}

// =========================================
// スクレイピング関連
// =========================================

/**
 * スクレイピングトリガータイプ
 */
export type ScrapingTriggerType = 'manual' | 'scheduled';

/**
 * スクレイピングステータス
 */
export type ScrapingStatusType = 'success' | 'failed' | 'running';

/**
 * 環境タイプ
 */
export type EnvironmentType = 'dev' | 'prod';

/**
 * スクレイピング実行結果
 */
export interface ScrapingResult {
  attempted: boolean;
  success: boolean;
  recordsFound: number;
  errorMessage?: string;
}

/**
 * スクレイピング履歴レコード
 * frontend/backend両方で使用
 */
export interface ScrapingHistoryRecord {
  /** 実行ID (timestamp-based) */
  id: string;
  /** 実行完了時刻 */
  timestamp: string;
  /** スクレイピングタイプ */
  type: PlayerType | 'both';
  /** 表示用のラベル（年度を含む） */
  typeLabel?: string;
  /** スクレイピング対象年度 */
  year?: number;
  /** 環境 */
  environment: EnvironmentType;
  /** 実行時間（秒） */
  duration: number;
  /** 前回実行日 */
  lastExecutionDate?: string | null;
  /** 前回実行からの経過日数 */
  daysSinceLastUpdate?: number | null;
  /** 更新期間表示（例：「3日分」「初回実行」） */
  updatePeriod?: string;
  /** 結果 */
  results: {
    highschool?: ScrapingDiffResult;
    university?: ScrapingDiffResult;
  };
  /** サマリー */
  summary: {
    totalCurrent: number;
    totalPrevious: number;
    totalDifference: number;
  };
  /** トリガータイプ */
  triggeredBy: ScrapingTriggerType;
}

/**
 * スクレイピング差分結果
 */
export interface ScrapingDiffResult {
  currentCount: number;
  previousCount: number;
  difference: number;
  newPlayers: string[];
  removedPlayers: string[];
}

/**
 * スクレイピングステータス
 */
export interface ScrapingStatus {
  lastRun: string;
  status: ScrapingStatusType;
  results: {
    highschool: ScrapingResult;
    university: ScrapingResult;
  };
  nextScheduledRun: string;
}

/**
 * スクレイピング履歴インデックス
 */
export interface ScrapingHistoryIndex {
  environment: EnvironmentType;
  totalRecords: number;
  lastUpdated: string;
  records: {
    id: string;
    timestamp: string;
    type: PlayerType | 'both';
    filename: string;
  }[];
}

// =========================================
// API レスポンス関連
// =========================================

/**
 * 基本APIレスポンス
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * ページネーション付きAPIレスポンス
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  metadata: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * 選手一覧APIレスポンス
 */
export interface PlayersResponse extends ApiResponse<PlayerData[]> {
  metadata: {
    year?: number;
    message?: string;
    totalCount?: number;
    highschoolCount?: number;
    universityCount?: number;
    lastUpdated?: string;
    /** 除外適用後の全件数（ページングの母数） */
    total?: number;
    /** 1ページの件数（APIの上限で丸められる） */
    limit?: number;
    /** ページの開始位置 */
    offset?: number;
    /** 続きのページがあるか */
    hasMore?: boolean;
  };
  /** このレスポンスに含まれる件数（全件数ではない。全件数は metadata.total） */
  count: number;
}

/**
 * 統計APIレスポンス
 */
export interface StatisticsResponse extends ApiResponse<{
  year: number;
  totalPlayers: number;
  byType: Partial<Record<PlayerType, number>>;
  byYear: Record<string, number>;
  byPosition: Record<string, number>;
  /** 個人を識別できない都道府県・地区別の集計 */
  byPrefecture: Record<string, number>;
  unresolvedPrefectureCount: number;
  /** 個人を識別できない日次・区分別の集計 */
  byDate: Record<string, { highschool: number; university: number }>;
  lastUpdated?: string;
}> {}

/**
 * トレンドデータ
 */
export interface TrendData {
  date: string;
  highschoolCount: number;
  universityCount: number;
  totalCount: number;
}

/**
 * ヘルスチェックレスポンス
 */
export interface HealthResponse {
  status: string;
  timestamp: string;
  bucket?: string;
}

/**
 * 学校一覧レスポンス
 */
export interface SchoolsResponse extends ApiResponse<
  Array<{ name: string; [key: string]: unknown }>
> {}

/**
 * スクレイピング履歴レスポンス
 */
export interface ScrapingHistoryResponse extends ApiResponse<ScrapingHistoryRecord[]> {
  metadata: {
    environment: EnvironmentType;
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    currentCount: number;
  };
}

// =========================================
// 年度管理関連
// =========================================

/**
 * 年度データ
 */
export interface YearData {
  years: number[];
  defaultYear: number;
  currentYear: number;
  latestYear: number;
}

/**
 * 年度セレクター状態
 */
export interface YearSelectorState {
  selectedYear: number;
  availableYears: number[];
  isLoading: boolean;
  error: string | null;
}

// =========================================
// 設定関連
// =========================================

/**
 * アプリケーション設定
 */
export interface AppSettings {
  version: string;
  environment: EnvironmentType | 'staging';
  features: {
    autoScraping: boolean;
    notifications: boolean;
    caching: boolean;
  };
  limits: {
    maxRecordsPerFile: number;
    maxFileSize: number;
    retentionDays: number;
  };
  scraping: {
    enabled: boolean;
    schedule: string;
    timeout: number;
    retryAttempts: number;
  };
}

// =========================================
// キャッシュ関連
// =========================================

/**
 * キャッシュオプション
 */
export interface CacheOptions {
  useCache?: boolean;
  cacheDuration?: number;
  encoding?: string;
}

/**
 * キャッシュエントリ
 */
export interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
  ttl: number;
}
