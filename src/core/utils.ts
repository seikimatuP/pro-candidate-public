/**
 * コアユーティリティ関数とロガー
 * 全アプリケーションで使用される基本的な機能を提供
 */

import { LogLevel, LogEntry } from './types';

/**
 * 構造化ログを出力する汎用ロガー
 *
 * @param level - ログレベル（DEBUG, INFO, WARN, ERROR）
 * @param message - ログメッセージ
 * @param context - 追加のコンテキスト情報（オプション）
 * @returns LogEntryオブジェクト
 *
 * @category コア機能
 * @example
 * ```typescript
 * log(LogLevel.INFO, 'データ処理を開始しました', { user: 'admin' });
 * ```
 */
export function log(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  // コンソールへの出力（循環参照対応）
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  } catch {
    // 循環参照の場合は安全な形式で出力
    const safeEntry = {
      ...entry,
      context: entry.context ? '[Circular Reference]' : undefined,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(safeEntry));
  }

  return entry;
}

/**
 * デバッグレベルのログを出力する
 *
 * 開発中の詳細なデバッグ情報を記録するために使用します。
 * 本番環境では通常表示されません。
 *
 * @param message - デバッグメッセージ
 * @param context - 追加のコンテキスト情報
 * @returns LogEntryオブジェクト
 *
 * @category コア機能
 * @example
 * ```typescript
 * debug('変数の値', { value: someVariable });
 * ```
 */
export function debug(message: string, context?: Record<string, unknown>): LogEntry {
  return log(LogLevel.DEBUG, message, context);
}

/**
 * 情報レベルのログを出力する
 *
 * 一般的な情報メッセージを記録するために使用します。
 *
 * @param message - 情報メッセージ
 * @param context - 追加のコンテキスト情報
 * @returns LogEntryオブジェクト
 *
 * @category コア機能
 * @example
 * ```typescript
 * info('データ処理が完了しました', { count: processedItems.length });
 * ```
 */
export function info(message: string, context?: Record<string, unknown>): LogEntry {
  return log(LogLevel.INFO, message, context);
}

/**
 * 警告レベルのログを出力する
 *
 * 問題が発生したが処理は継続できる場合に使用します。
 *
 * @param message - 警告メッセージ
 * @param context - 追加のコンテキスト情報
 * @returns LogEntryオブジェクト
 *
 * @category コア機能
 * @example
 * ```typescript
 * warn('レスポンスが遅延しています', { responseTime: '5000ms' });
 * ```
 */
export function warn(message: string, context?: Record<string, unknown>): LogEntry {
  const logEntry = log(LogLevel.WARN, message, context);
  // WARNレベルの場合はconsole.warnも出力
  console.warn(`[WARN] ${message}`, context);
  return logEntry;
}

/**
 * エラーレベルのログを出力する
 *
 * 処理を続行できない重大な問題が発生した場合に使用します。
 *
 * @param message - エラーメッセージ
 * @param context - 追加のコンテキスト情報
 * @returns LogEntryオブジェクト
 *
 * @category コア機能
 * @example
 * ```typescript
 * error('データの取得に失敗しました', { error: err.message });
 * ```
 */
export function error(message: string, context?: Record<string, unknown>): LogEntry {
  const logEntry = log(LogLevel.ERROR, message, context);
  // ERRORレベルの場合はconsole.errorも出力
  console.error(`[ERROR] ${message}`, context);
  return logEntry;
}

// Node.js環境とGAS環境の両方で動作するためのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LogLevel,
    log,
    debug,
    info,
    warn,
    error,
  };
}
