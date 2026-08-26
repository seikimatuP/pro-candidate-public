/**
 * 選手データ型定義
 *
 * shared/types から共有型を再エクスポート
 * frontend/backend間の型一貫性を確保
 */

// 共有型からの再エクスポート
export type {
  // 選手データ関連
  PlayerType,
  PlayerData,
  PlayersDataFile,
  PlayersIndex,

  // スクレイピング関連
  ScrapingTriggerType,
  ScrapingStatusType,
  EnvironmentType,
  ScrapingResult,
  ScrapingHistoryRecord,
  ScrapingDiffResult,
  ScrapingStatus,
  ScrapingHistoryIndex,

  // API レスポンス関連
  ApiResponse,
  PaginatedApiResponse,
  PlayersResponse,
  StatisticsResponse,
  TrendData,
  HealthResponse,
  SchoolsResponse,
  ScrapingHistoryResponse,

  // 年度管理関連
  YearData,
  YearSelectorState,

  // 設定関連
  AppSettings,

  // キャッシュ関連
  CacheOptions,
  CacheEntry,
} from '../../../shared/types';
