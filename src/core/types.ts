/**
 * プロジェクト共通の型定義 - S3ベース
 */

/**
 * 統一されたログレベル定義
 * 数値ベースで比較可能、文字列表現も提供
 * 
 * @category コア機能
 */
 
export enum LogLevel {
  /** デバッグ情報 - 開発時のみ出力 */
  DEBUG = 0,
  /** 情報メッセージ - 通常の動作情報 */
  INFO = 1,
  /** 警告メッセージ - 注意が必要な状況 */
  WARN = 2,
  /** エラーメッセージ - エラー発生時 */
  ERROR = 3,
  /** ログ無効 - すべてのログを抑制 */
  NONE = 4
}

/**
 * ログレベルの文字列表現を取得
 */
export function getLogLevelName(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG: return 'DEBUG';
    case LogLevel.INFO: return 'INFO';
    case LogLevel.WARN: return 'WARN';
    case LogLevel.ERROR: return 'ERROR';
    case LogLevel.NONE: return 'NONE';
    default: return 'UNKNOWN';
  }
}

/**
 * 文字列からログレベルを取得
 */
export function parseLogLevel(levelStr: string): LogLevel {
  switch (levelStr.toUpperCase()) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'NONE': return LogLevel.NONE;
    default: return LogLevel.INFO;
  }
}

/**
 * 構造化ログエントリのインターフェース
 */
export interface LogEntry {
  /** ログの出力時刻 */
  timestamp: string;
  /** ログレベル */
  level: LogLevel;
  /** ログメッセージ */
  message: string;
  /** 追加のコンテキスト情報 */
  context?: Record<string, unknown>;
  /** エラーオブジェクト（該当する場合） */
  error?: Error;
}

/**
 * ログ設定インターフェース
 */
export interface LogConfig {
  /** 最小出力レベル */
  level: LogLevel;
  /** コンソール出力の有効化 */
  enableConsole: boolean;
  /** ファイル出力の有効化 */
  enableFile: boolean;
  /** ログファイルパス */
  logFilePath?: string;
}

export interface PlayerData {
  id: string;               // 一意ID: {type}_{year}_{index}
  name: string;             // 選手名
  school: string;           // 学校名
  type: 'highschool' | 'university';  // 選手タイプ
  year: number;             // 年度
  filingDate: string;       // 志望届提出日
  prefecture?: string;      // 都道府県
  region?: string;          // 地域
  position?: string;        // ポジション
  isDraftEligible?: boolean; // ドラフト対象者かどうか（高校生・大学生共通）
  createdAt: string;        // 作成日時
  updatedAt: string;        // 更新日時
}

export interface PlayersDataFile {
  metadata: {
    year: number;
    type: 'highschool' | 'university';
    totalCount: number;
    lastUpdated: string;
    version: string;
  };
  players: PlayerData[];
}

export interface PlayersIndex {
  type: 'highschool' | 'university';
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

export interface ScrapingStatus {
  lastRun: string;
  status: 'success' | 'failed' | 'running';
  results: {
    highschool: {
      attempted: boolean;
      success: boolean;
      recordsFound: number;
      errorMessage?: string;
    };
    university: {
      attempted: boolean;
      success: boolean;
      recordsFound: number;
      errorMessage?: string;
    };
  };
  nextScheduledRun: string;
}

export interface AppSettings {
  version: string;
  environment: 'dev' | 'staging' | 'prod';
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

export interface S3DataManager {
  savePlayersData(players: PlayerData[], type: string, year: number): Promise<void>;
  loadPlayersData(type: string, year: number): Promise<PlayerData[]>;
  getAllPlayersData(year: number): Promise<PlayerData[]>;
  getAvailableYears(type: string): Promise<number[]>;
  searchPlayersBySchool(school: string, year?: number): Promise<PlayerData[]>;
  updateScrapingStatus(status: ScrapingStatus): Promise<void>;
  getScrapingStatus(): Promise<ScrapingStatus>;
}

export interface S3FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

export interface Config {
  [key: string]: string;
}

export interface CacheOptions {
  useCache?: boolean;
  cacheDuration?: number;
  encoding?: string;
}

export interface SheetRange {
  row: number;
  column: string;
}

export interface CacheEntry {
  value: unknown;
  timestamp: number;
  ttl: number;
}

// スクレイピング履歴関連の型定義
export interface ScrapingHistoryRecord {
  id: string;                    // 実行ID (timestamp-based)
  timestamp: string;             // 実行完了時刻
  type: 'highschool' | 'university' | 'both';
  environment: 'dev' | 'prod';   // 環境別管理
  duration: number;              // 実行時間（秒）
  results: {
    highschool?: {
      currentCount: number;      // 今回取得件数
      previousCount: number;     // 前回件数
      difference: number;        // 差分 (current - previous)
      newPlayers: string[];      // 新規追加選手名リスト
      removedPlayers: string[];  // 削除された選手名リスト
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
    totalCurrent: number;        // 今回総数
    totalPrevious: number;       // 前回総数
    totalDifference: number;     // 総差分
  };
  triggeredBy: 'manual' | 'scheduled';
}

export interface PreviousCountData {
  count: number;
  timestamp: string;
  playerNames: string[];         // 前回の選手名リスト
}

export interface ScrapingHistoryIndex {
  environment: 'dev' | 'prod';
  totalRecords: number;
  lastUpdated: string;
  records: {
    id: string;
    timestamp: string;
    type: 'highschool' | 'university' | 'both';
    filename: string;
  }[];
}