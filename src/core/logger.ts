/**
 * 環境対応ロガーシステム
 * 本番環境ではコンソール出力を制御
 * セキュリティ強化: 機密情報のフィルタリング (v1.2.85)
 */

// 統一されたログレベルとコンフィグをインポート
import { LogLevel, LogConfig } from './types';

/**
 * ログ出力から機密情報を除去するサニタイザー
 */
class LogSanitizer {
  // 機密情報パターン
  private static readonly SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
    // AWSキー
    { pattern: /AKIA[0-9A-Z]{16}/gi, replacement: '[AWS_KEY_REDACTED]' },
    {
      pattern: /(?:aws_secret_access_key|secret_access_key)[=:\s]*[^\s&"']+/gi,
      replacement: '[AWS_SECRET_REDACTED]',
    },
    // パスワード・シークレット
    { pattern: /password[=:\s]*[^\s&"']+/gi, replacement: 'password=[REDACTED]' },
    { pattern: /token[=:\s]*[^\s&"']+/gi, replacement: 'token=[REDACTED]' },
    { pattern: /secret[=:\s]*[^\s&"']+/gi, replacement: 'secret=[REDACTED]' },
    { pattern: /apikey[=:\s]*[^\s&"']+/gi, replacement: 'apikey=[REDACTED]' },
    { pattern: /api_key[=:\s]*[^\s&"']+/gi, replacement: 'api_key=[REDACTED]' },
    { pattern: /authorization[=:\s]*[^\s&"']+/gi, replacement: 'authorization=[REDACTED]' },
    // JWT
    {
      pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/gi,
      replacement: '[JWT_REDACTED]',
    },
    // メールアドレス（ログに不要な場合）
    {
      pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
      replacement: '[EMAIL_REDACTED]',
    },
    // 内部ファイルパス
    { pattern: /\/home\/[a-zA-Z0-9_-]+\/[^\s"']+/gi, replacement: '[PATH_REDACTED]' },
    // クレジットカード風の数字列（念のため）
    { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD_REDACTED]' },
  ];

  // 機密キー名
  private static readonly SENSITIVE_KEYS = new Set([
    'password',
    'pwd',
    'secret',
    'token',
    'apikey',
    'api_key',
    'authorization',
    'cookie',
    'session',
    'credential',
    'private',
    'privatekey',
    'private_key',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'secretkey',
    'secret_key',
    'awssecretaccesskey',
    'aws_secret_access_key',
  ]);

  /**
   * 文字列から機密情報を除去
   */
  static sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
      return str;
    }

    let sanitized = str;
    for (const { pattern, replacement } of this.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  /**
   * オブジェクトから機密情報を除去
   */
  static sanitizeObject(obj: unknown, depth: number = 0): unknown {
    // 深度制限（循環参照防止）
    if (depth > 10) {
      return '[MAX_DEPTH_REACHED]';
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase().replace(/[_-]/g, '');
        if (this.SENSITIVE_KEYS.has(lowerKey)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeObject(value, depth + 1);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * ログ引数をサニタイズ
   */
  static sanitizeArgs(args: unknown[]): unknown[] {
    return args.map(arg => this.sanitizeObject(arg));
  }
}

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
      enableFile: false, // ファイルログは必要に応じて有効化
      logFilePath: process.env.LOG_FILE_PATH,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;

    // メッセージをサニタイズ
    const sanitizedMessage = LogSanitizer.sanitizeString(message);

    // 引数をサニタイズ
    const sanitizedArgs = LogSanitizer.sanitizeArgs(args);

    const fullMessage =
      sanitizedArgs.length > 0
        ? `${sanitizedMessage} ${sanitizedArgs.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')}`
        : sanitizedMessage;
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
  getEnvironmentInfo(): {
    env: string;
    isProduction: boolean;
    isLambda: boolean;
    logLevel: string;
  } {
    return {
      env: process.env.NODE_ENV || 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      logLevel: LogLevel[this.config.level],
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
  critical: (message: string, ...args: unknown[]) => logger.critical(message, ...args),
};

// LogSanitizerをエクスポート（外部から利用可能に）
export { LogSanitizer };
