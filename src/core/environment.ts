/**
 * 環境検出ユーティリティ
 * プロジェクト全体で使用される環境判定機能
 */

/**
 * 環境情報と検出ユーティリティ
 */
export class Environment {
  /**
   * 本番環境かどうかを判定
   */
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production' || process.env.STAGE === 'prod';
  }

  /**
   * 開発環境かどうかを判定
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.STAGE === 'dev';
  }

  /**
   * テスト環境かどうかを判定
   */
  static isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * AWS Lambda 環境かどうかを判定
   */
  static isLambda(): boolean {
    return !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  }

  /**
   * ローカル環境かどうかを判定
   */
  static isLocal(): boolean {
    return !this.isLambda() && this.isDevelopment();
  }

  /**
   * CI/CD 環境かどうかを判定
   */
  static isCI(): boolean {
    return !!(process.env.CI || process.env.GITHUB_ACTIONS);
  }

  /**
   * 現在の環境名を取得
   */
  static getCurrentEnvironment(): string {
    if (this.isProduction()) return 'production';
    if (this.isDevelopment()) return 'development';
    if (this.isTest()) return 'test';
    return 'unknown';
  }

  /**
   * 現在の実行コンテキストを取得
   */
  static getExecutionContext(): string {
    if (this.isLambda()) return 'lambda';
    if (this.isCI()) return 'ci';
    if (this.isLocal()) return 'local';
    return 'server';
  }

  /**
   * AWS リージョンを取得
   */
  static getAWSRegion(): string {
    return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-northeast-1';
  }

  /**
   * デバッグモードが有効かどうかを判定
   */
  static isDebugMode(): boolean {
    return process.env.DEBUG === 'true' || this.isDevelopment();
  }

  /**
   * 環境情報のサマリーを取得
   */
  static getSummary(): Record<string, unknown> {
    return {
      environment: this.getCurrentEnvironment(),
      context: this.getExecutionContext(),
      isProduction: this.isProduction(),
      isDevelopment: this.isDevelopment(),
      isTest: this.isTest(),
      isLambda: this.isLambda(),
      isLocal: this.isLocal(),
      isCI: this.isCI(),
      isDebug: this.isDebugMode(),
      awsRegion: this.getAWSRegion(),
      nodeEnv: process.env.NODE_ENV,
      stage: process.env.STAGE
    };
  }
}

/**
 * 環境固有の設定を取得するヘルパー関数
 */
export function getEnvironmentConfig<T>(configs: {
  production?: T;
  development?: T;
  test?: T;
  default: T;
}): T {
  if (Environment.isProduction() && configs.production) {
    return configs.production;
  }
  if (Environment.isDevelopment() && configs.development) {
    return configs.development;
  }
  if (Environment.isTest() && configs.test) {
    return configs.test;
  }
  return configs.default;
}

/**
 * 環境変数を安全に取得するヘルパー関数
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  if (value === undefined && defaultValue !== undefined) {
    return defaultValue;
  }
  return value;
}

/**
 * 必須環境変数を取得する（未設定時はエラー）
 */
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}