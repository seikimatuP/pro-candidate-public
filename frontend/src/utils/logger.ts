/**
 * フロントエンド用環境対応ロガー
 * 本番環境ではコンソール出力を制御
 */

const LogLevelValues = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
} as const;

type LogLevel = 0 | 1 | 2 | 3 | 4;

interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  mode: string;
}

class FrontendLogger {
  private config: LogConfig;

  constructor() {
    this.config = this.getLogConfig();
  }

  private getLogConfig(): LogConfig {
    // Vite環境変数から環境判定
    const mode = import.meta.env.MODE || 'development';
    const isProduction = mode === 'production';

    // 本番環境ではコンソール出力を最小限に
    const enableConsole = !isProduction;

    // ログレベルを環境変数から取得（開発時のみ）
    let logLevel: LogLevel = (enableConsole ? LogLevelValues.DEBUG : LogLevelValues.ERROR) as LogLevel;

    // 環境変数でログレベルを上書き可能（開発時のみ）
    if (import.meta.env.VITE_LOG_LEVEL && enableConsole) {
      switch (import.meta.env.VITE_LOG_LEVEL.toUpperCase()) {
        case 'DEBUG':
          logLevel = LogLevelValues.DEBUG as LogLevel;
          break;
        case 'INFO':
          logLevel = LogLevelValues.INFO as LogLevel;
          break;
        case 'WARN':
          logLevel = LogLevelValues.WARN as LogLevel;
          break;
        case 'ERROR':
          logLevel = LogLevelValues.ERROR as LogLevel;
          break;
        case 'NONE':
          logLevel = LogLevelValues.NONE as LogLevel;
          break;
      }
    }

    return {
      level: logLevel,
      enableConsole,
      mode,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.config.mode}]`;
    const fullMessage =
      args.length > 0
        ? `${message} ${args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')}`
        : message;
    return `${prefix} ${fullMessage}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevelValues.DEBUG)) return;

    if (this.config.enableConsole) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevelValues.INFO)) return;

    if (this.config.enableConsole) {
      console.log(this.formatMessage('INFO', message, ...args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevelValues.WARN)) return;

    if (this.config.enableConsole) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevelValues.ERROR)) return;

    // エラーログは本番環境でも出力（監視のため重要）
    console.error(this.formatMessage('ERROR', message, ...args));
  }

  // React固有：コンポーネントマウント時のログ
  componentMount(componentName: string): void {
    if (this.config.enableConsole) {
      this.debug(`Component mounted: ${componentName}`);
    }
  }

  // React固有：コンポーネントアンマウント時のログ
  componentUnmount(componentName: string): void {
    if (this.config.enableConsole) {
      this.debug(`Component unmounted: ${componentName}`);
    }
  }

  // API呼び出し開始ログ
  apiStart(method: string, url: string): void {
    if (this.config.enableConsole) {
      this.info(`API ${method} ${url}`);
    }
  }

  // API呼び出し完了ログ
  apiEnd(method: string, url: string, status: number, duration: number): void {
    if (this.config.enableConsole) {
      this.info(`API ${method} ${url} - ${status} (${duration}ms)`);
    }
  }

  // API呼び出しエラーログ
  apiError(method: string, url: string, error: unknown): void {
    this.error(`API ${method} ${url} failed`, error);
  }
}

// シングルトンインスタンス
const logger = new FrontendLogger();

// 便利な関数をエクスポート
export const log = {
  debug: (message: string, ...args: unknown[]) => logger.debug(message, ...args),
  info: (message: string, ...args: unknown[]) => logger.info(message, ...args),
  warn: (message: string, ...args: unknown[]) => logger.warn(message, ...args),
  error: (message: string, ...args: unknown[]) => logger.error(message, ...args),
  componentMount: (componentName: string) => logger.componentMount(componentName),
  componentUnmount: (componentName: string) => logger.componentUnmount(componentName),
  apiStart: (method: string, url: string) => logger.apiStart(method, url),
  apiEnd: (method: string, url: string, status: number, duration: number) =>
    logger.apiEnd(method, url, status, duration),
  apiError: (method: string, url: string, error: unknown) => logger.apiError(method, url, error),
};

export { logger };
export type { LogLevel };
export default log;
