/**
 * エラータイプと関連インターフェースの定義
 * アプリケーション全体で一貫したエラー型を提供します
 */

/**
 * アプリケーション全体で使用するエラータイプの定義
 */
export const ErrorType = {
  // ネットワーク関連
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  HTTP_ERROR: 'HTTP_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // データ処理関連
  PARSE_ERROR: 'PARSE_ERROR',
  DATA_VALIDATION_ERROR: 'DATA_VALIDATION_ERROR',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  
  // スプレッドシート関連
  SHEET_NOT_FOUND: 'SHEET_NOT_FOUND',
  SHEET_ACCESS_DENIED: 'SHEET_ACCESS_DENIED',
  SHEET_OPERATION_FAILED: 'SHEET_OPERATION_FAILED',
  
  // 設定関連
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  INVALID_CONFIG: 'INVALID_CONFIG',
  
  // リソース制限関連
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  API_LIMIT_EXCEEDED: 'API_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  
  // セキュリティ関連
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // その他
  UNKNOWN: 'UNKNOWN'
};

/**
 * エラーの深刻度レベル
 */
export const SeverityLevel = {
  INFO: 0,     // 情報提供のみ
  WARNING: 1,  // 警告（処理は続行可能）
  ERROR: 2,    // エラー（処理を中断）
  CRITICAL: 3  // 重大なエラー（即時対応が必要）
};

/**
 * アプリケーション固有のエラークラスのインターフェース
 */
export interface AppErrorInterface extends Error {
  type: string;
  severity: number;
  context?: Record<string, any>;
  retryCount?: number;
  timestamp?: Date;
}

/**
 * アプリケーション固有のエラークラス
 */
export class AppError extends Error implements AppErrorInterface {
  type: string;
  severity: number;
  context?: Record<string, any>;
  retryCount: number;
  timestamp: Date;

  /**
   * コンストラクタ
   * @param options エラーオプション
   */
  constructor(options: {
    message: string;
    type?: string;
    severity?: number;
    context?: Record<string, any>;
    retryCount?: number;
  }) {
    const {
      message,
      type = ErrorType.UNKNOWN,
      severity = SeverityLevel.ERROR,
      context = {},
      retryCount = 0
    } = options;
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.retryCount = retryCount;
    this.timestamp = new Date();
    
    // TypeScriptでのErrorサブクラス対応
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * エラー情報を文字列として表現
   * @returns エラーの文字列表現
   */
  toString(): string {
    const severityNames = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    const severityName = severityNames[this.severity] || 'UNKNOWN';
    
    try {
      const contextStr = JSON.stringify(this.context || {});
      return `AppError: ${this.message} [Type: ${this.type}, Severity: ${severityName}, Context: ${contextStr}]`;
    } catch (e) {
      // 循環参照などでJSONシリアライゼーションが失敗した場合
      return `AppError: ${this.message} [Type: ${this.type}, Severity: ${severityName}, Context: <complex object>]`;
    }
  }

  /**
   * エラー情報をJSON形式で表現
   * @returns JSONオブジェクト
   */
  toJSON(): Record<string, any> {
    try {
      return {
        message: this.message,
        type: this.type,
        severity: this.severity,
        context: this.context || {},
        timestamp: this.timestamp.toISOString()
      };
    } catch (e) {
      // 循環参照などで問題がある場合は安全なバージョンを返す
      return {
        message: this.message,
        type: this.type,
        severity: this.severity,
        context: {},
        timestamp: this.timestamp.toISOString()
      };
    }
  }
}

/**
 * 回復戦略関数の型定義
 */
export type RecoveryStrategy = (error: AppError) => Promise<boolean>;

/**
 * エラーハンドラーのインターフェース
 */
export interface ErrorHandlerInterface {
  handleError(error: Error | AppError, context?: Record<string, any>): Promise<boolean>;
  getUserFriendlyMessage(error: AppError): string;
  registerRecoveryStrategy(errorType: string, strategy: RecoveryStrategy): void;
  unregisterRecoveryStrategy(errorType: string): void;
}

// グローバルからアクセスできるようにする
declare global {
  // 不要な自己参照による変数定義は削除
}

// グローバル変数として公開
if (typeof globalThis !== 'undefined') {
  globalThis.ErrorType = ErrorType;
  globalThis.SeverityLevel = SeverityLevel;
  globalThis.AppError = AppError;
} else if (typeof global !== 'undefined') {
  global.ErrorType = ErrorType;
  global.SeverityLevel = SeverityLevel;
  global.AppError = AppError;
}

export default {
  ErrorType,
  SeverityLevel,
  AppError
};
