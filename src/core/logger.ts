/**
 * 環境対応ロガーシステム
 * 本番環境ではコンソール出力を制御
 */

// 統一されたログレベルとコンフィグをインポート
import { LogLevel, LogConfig } from "./types";

class Logger {
  private config: LogConfig;

  constructor() {
    this.config = this.getLogConfig();
  }

  // 設定を再読み込み（テスト用）
  private reloadConfig(): void {
    this.config = this.getLogConfig();
  }

  private getLogConfig(): LogConfig {
    const env = process.env.NODE_ENV || 'development';
    const isProduction = env === 'production';
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    // 本番環境またはLambda環境ではコンソール出力を無効化
    const enableConsole = !isProduction && !isLambda;
    
    // ログレベルを環境変数から取得（デフォルトは本番でWARN、開発でDEBUG）
    const logLevelEnv = process.env.LOG_LEVEL;
    let logLevel = isProduction ? LogLevel.WARN : LogLevel.DEBUG;
    
    if (logLevelEnv) {
      switch (logLevelEnv.toUpperCase()) {
        case 'DEBUG': logLevel = LogLevel.DEBUG; break;
        case 'INFO': logLevel = LogLevel.INFO; break;
        case 'WARN': logLevel = LogLevel.WARN; break;
        case 'ERROR': logLevel = LogLevel.ERROR; break;
        case 'NONE': logLevel = LogLevel.NONE; break;
      }
    }

    return {
      level: logLevel,
      enableConsole,
      enableFile: false, // ファイルログは必要に応じて有効化
      logFilePath: process.env.LOG_FILE_PATH
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    const fullMessage = args.length > 0 ? 
      `${message} ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}` : 
      message;
    return `${prefix} ${fullMessage}`;
  }

  debug(message: string, ...args: unknown[]): void {
    // テスト時は設定を再読み込み
    if (process.env.NODE_ENV === 'test') {
      this.reloadConfig();
    }
    
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const formattedMessage = this.formatMessage('DEBUG', message, ...args);
    
    const isProduction = process.env.NODE_ENV === 'production' || process.env.STAGE === 'prod';
    if (this.config.enableConsole && !isProduction && typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.debug(formattedMessage);
    }
  }

  info(message: string, ...args: unknown[]): void {
    // テスト時は設定を再読み込み
    if (process.env.NODE_ENV === 'test') {
      this.reloadConfig();
    }
    
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const formattedMessage = this.formatMessage('INFO', message, ...args);
    
    const isProduction = process.env.NODE_ENV === 'production' || process.env.STAGE === 'prod';
    if (this.config.enableConsole && !isProduction && typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log(formattedMessage);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    // テスト時は設定を再読み込み
    if (process.env.NODE_ENV === 'test') {
      this.reloadConfig();
    }
    
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const formattedMessage = this.formatMessage('WARN', message, ...args);
    
    if (this.config.enableConsole) {
       
      console.warn(formattedMessage);
    }
  }

  error(message: string, ...args: unknown[]): void {
    // テスト時は設定を再読み込み
    if (process.env.NODE_ENV === 'test') {
      this.reloadConfig();
    }
    
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const formattedMessage = this.formatMessage('ERROR', message, ...args);
    
    if (this.config.enableConsole) {
       
      console.error(formattedMessage);
    }
  }

  // 本番環境でも必ず出力される重要なログ
  critical(message: string, ...args: unknown[]): void {
    const formattedMessage = this.formatMessage('CRITICAL', message, ...args);
     
    console.error(formattedMessage);
  }

  // 環境情報を取得
  getEnvironmentInfo(): { env: string; isProduction: boolean; isLambda: boolean; logLevel: string } {
    return {
      env: process.env.NODE_ENV || 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      logLevel: LogLevel[this.config.level]
    };
  }

  // 設定を動的に更新
  updateConfig(newConfig: Partial<LogConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// シングルトンインスタンス
export const logger = new Logger();

// 便利な関数をエクスポート
export const log = {
  debug: (message: string, ...args: unknown[]) => logger.debug(message, ...args),
  info: (message: string, ...args: unknown[]) => logger.info(message, ...args),
  warn: (message: string, ...args: unknown[]) => logger.warn(message, ...args),
  error: (message: string, ...args: unknown[]) => logger.error(message, ...args),
  critical: (message: string, ...args: unknown[]) => logger.critical(message, ...args)
};