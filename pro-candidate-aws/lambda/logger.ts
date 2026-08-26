/**
 * Lambda用環境対応ロガー
 * 本番環境ではコンソール出力を制御
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  stage: string;
  env: string;
}

export class LambdaLogger {
  private config: LogConfig;

  constructor() {
    this.config = this.getLogConfig();
  }

  private getLogConfig(): LogConfig {
    const env = process.env.NODE_ENV || 'development';
    const isProduction = env === 'production';
    const logStage = process.env.STAGE || 'dev';

    // 本番ステージ（prod）ではコンソール出力を最小限に
    const enableConsole = !(isProduction || logStage === 'prod');

    // ログレベルを環境変数から取得
    let logLevel = enableConsole ? LogLevel.DEBUG : LogLevel.WARN;

    if (process.env.LOG_LEVEL) {
      switch (process.env.LOG_LEVEL.toUpperCase()) {
        case 'DEBUG':
          logLevel = LogLevel.DEBUG;
          break;
        case 'INFO':
          logLevel = LogLevel.INFO;
          break;
        case 'WARN':
          logLevel = LogLevel.WARN;
          break;
        case 'ERROR':
          logLevel = LogLevel.ERROR;
          break;
        case 'NONE':
          logLevel = LogLevel.NONE;
          break;
      }
    }

    return {
      level: logLevel,
      enableConsole,
      stage: logStage,
      env,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.config.stage}]`;
    const fullMessage =
      args.length > 0
        ? `${message} ${args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')}`
        : message;
    return `${prefix} ${fullMessage}`;
  }

  public debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    if (this.config.enableConsole) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }

  public info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    if (this.config.enableConsole) {
      console.log(this.formatMessage('INFO', message, ...args));
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    // prod環境では完全に無効化
    if (this.config.enableConsole) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  public error(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    // prod環境では完全に無効化
    if (this.config.enableConsole) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }

  // クリティカルレベル - prod環境でも完全無効化
  public critical(message: string, ...args: any[]): void {
    // prod環境ではconsole出力を完全に無効化
    if (this.config.enableConsole) {
      console.error(this.formatMessage('CRITICAL', message, ...args));
    }
  }

  // Lambda固有：リクエスト開始ログ
  public requestStart(event: any): void {
    if (this.config.enableConsole) {
      this.info('Request started', {
        method: event.httpMethod || event.requestContext?.http?.method,
        path: event.pathParameters?.proxy || event.path,
        stage: this.config.stage,
      });
    }
  }

  // Lambda固有：レスポンスログ
  public requestEnd(statusCode: number, duration: number): void {
    if (this.config.enableConsole) {
      this.info('Request completed', {
        statusCode,
        duration: `${duration}ms`,
        stage: this.config.stage,
      });
    }
  }
}

// シングルトンインスタンス
export const logger = new LambdaLogger();

// 便利な関数をエクスポート
export const log = {
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, ...args: any[]) => logger.error(message, ...args),
  critical: (message: string, ...args: any[]) => logger.critical(message, ...args),
  requestStart: (event: any) => logger.requestStart(event),
  requestEnd: (statusCode: number, duration: number) => logger.requestEnd(statusCode, duration),
};
