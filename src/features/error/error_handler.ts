/**
 * 統合的なエラーハンドリングシステム
 * アプリケーション全体で一貫したエラー処理、ロギング、リカバリーを提供します
 */

// 外部システム向けの型宣言
declare const window: any;
declare const ErrorLogger: any;
declare const ErrorNotification: any;
declare const ErrorDashboard: any;
declare const global: any;
declare const globalThis: any;

// 明示的なインポート
import { ErrorType, SeverityLevel, AppError, RecoveryStrategy, ErrorHandlerInterface } from './error_types';

/**
 * エラーを適切なタイプに分類するユーティリティクラス
 */
export class ErrorClassifier {
  /**
   * HTTPステータスコードからエラータイプを特定します
   * @param statusCode HTTPステータスコード
   * @returns 特定されたErrorTypeの値
   */
  static fromHttpStatus(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) {
      if (statusCode === 401) return ErrorType.UNAUTHORIZED;
      if (statusCode === 403) return ErrorType.FORBIDDEN;
      if (statusCode === 404) return ErrorType.DATA_NOT_FOUND;
      return ErrorType.DATA_VALIDATION_ERROR;
    }
    if (statusCode >= 500) {
      return ErrorType.HTTP_ERROR;
    }
    return ErrorType.UNKNOWN;
  }

  /**
   * エラーのメッセージとコンテキストからエラータイプを特定します
   * @param error エラーオブジェクト
   * @returns 特定されたErrorTypeの値
   */
  static fromError(error: Error): string {
    // すでにAppErrorならそのタイプを返す
    if (error instanceof AppError) {
      return error.type;
    }
    
    const errorMsg = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';
    const errorName = error.name.toLowerCase();
    
    // ネットワーク関連のエラー
    if (errorMsg.includes('network') || 
        errorMsg.includes('connection') || 
        errorMsg.includes('offline') ||
        errorMsg.includes('unreachable')) {
      return ErrorType.NETWORK_UNAVAILABLE;
    }
    
    if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
      return ErrorType.TIMEOUT;
    }
    
    if (errorMsg.includes('http') || errorName.includes('http')) {
      return ErrorType.HTTP_ERROR;
    }
    
    // データ処理関連のエラー
    if (errorMsg.includes('parse') || 
        errorMsg.includes('json') || 
        errorMsg.includes('syntax') || 
        errorName === 'syntaxerror') {
      return ErrorType.PARSE_ERROR;
    }
    
    if (errorMsg.includes('validation') || errorMsg.includes('invalid data')) {
      return ErrorType.DATA_VALIDATION_ERROR;
    }
    
    if (errorMsg.includes('not found') && 
        (errorMsg.includes('data') || errorMsg.includes('record'))) {
      return ErrorType.DATA_NOT_FOUND;
    }
    
    // スプレッドシート関連のエラー
    if (errorStack.includes('spreadsheet') || errorMsg.includes('spreadsheet')) {
      if (errorMsg.includes('not found')) {
        return ErrorType.SHEET_NOT_FOUND;
      }
      if (errorMsg.includes('permission') || errorMsg.includes('access denied')) {
        return ErrorType.SHEET_ACCESS_DENIED;
      }
      return ErrorType.SHEET_OPERATION_FAILED;
    }
    
    // リソース制限関連のエラー
    if (errorMsg.includes('quota') || errorMsg.includes('limit exceeded')) {
      return ErrorType.QUOTA_EXCEEDED;
    }
    
    if (errorMsg.includes('memory') || errorMsg.includes('heap')) {
      return ErrorType.MEMORY_LIMIT_EXCEEDED;
    }
    
    // その他のエラー
    return ErrorType.UNKNOWN;
  }
  
  /**
   * エラーの深刻度を推定します
   * @param error エラーオブジェクト
   * @param errorType エラータイプ
   * @returns 推定された深刻度レベル
   */
  static estimateSeverity(error: Error, errorType: string): number {
    // すでにAppErrorなら設定済みの深刻度を返す
    if (error instanceof AppError) {
      return error.severity;
    }
    
    // エラータイプによって深刻度を決定
    switch (errorType) {
      case ErrorType.NETWORK_UNAVAILABLE:
      case ErrorType.TIMEOUT:
      case ErrorType.HTTP_ERROR:
        return SeverityLevel.WARNING;
      
      case ErrorType.QUOTA_EXCEEDED:
      case ErrorType.MEMORY_LIMIT_EXCEEDED:
        return SeverityLevel.CRITICAL;
      
      case ErrorType.UNAUTHORIZED:
      case ErrorType.FORBIDDEN:
        return SeverityLevel.ERROR;
      
      default:
        return SeverityLevel.ERROR;
    }
  }
}

/**
 * エラーハンドラークラス
 * アプリケーション全体のエラー処理を一元管理します
 */
export class ErrorHandler implements ErrorHandlerInterface {
  private static _instance: ErrorHandler | null = null;
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private loggedErrors: Set<string> = new Set();  // 重複通知防止用
  private dashboardInitialized = false;
  
  /**
   * コンストラクタ - 直接インスタンス化せずgetInstanceを使用
   */
  private constructor() {
    // 初期化
  }
  
  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler._instance) {
      ErrorHandler._instance = new ErrorHandler();
    }
    return ErrorHandler._instance;
  }
  
  /**
   * エラーハンドリングシステムを初期化
   * @param options 初期化オプション
   */
  public initialize(options: { enableDashboard?: boolean } = {}): void {
    // ダッシュボードの初期化
    if (options.enableDashboard !== false) {
      this.initializeErrorDashboard();
    }
  }
  
  /**
   * エラーダッシュボードを初期化
   */
  private initializeErrorDashboard(): void {
    try {
      if (typeof ErrorDashboard !== 'undefined' && typeof ErrorDashboard.getInstance === 'function') {
        const dashboard = ErrorDashboard.getInstance();
        if (typeof dashboard.initialize === 'function') {
          this.dashboardInitialized = dashboard.initialize();
        }
      }
    } catch (e) {
      console.warn('エラーダッシュボードの初期化に失敗しました:', e);
      this.dashboardInitialized = false;
    }
  }
  
  /**
   * エラーを処理する
   * @param error 発生したエラー
   * @param context エラーのコンテキスト情報
   * @returns エラーから回復できたかどうか
   */
  public async handleError(error: Error | AppError, context: Record<string, any> = {}): Promise<boolean> {
    try {
      // エラーの正規化・変換
      const appError = this.normalizeError(error, context);
      
      // エラーログに記録
      this.logError(appError);
      
      // エラーダッシュボードを更新
      this.updateErrorDashboard(appError);
      
      // エラーから回復を試みる
      if (await this.attemptRecovery(appError)) {
        return true;
      }
      
      // エスカレーションを実施
      this.escalateIfNeeded(appError);
      
      return false;
    } catch (handlerError) {
      console.error('エラー処理中に例外が発生しました:', handlerError);
      return false;
    }
  }
  
  /**
   * エラーの重大度に応じてエスカレーションを実施
   * @param error アプリケーションエラー
   */
  private escalateIfNeeded(error: AppError): void {
    // 重大度に応じたエスカレーション
    if (error.severity >= SeverityLevel.ERROR) {
      this.notifyError(error);
    }
    
    // CRITICALエラーの場合は追加アクション
    if (error.severity >= SeverityLevel.CRITICAL) {
      this.handleCriticalError(error);
    }
  }
  
  /**
   * 重大なエラーの特別処理
   * @param error クリティカルなエラー
   */
  private handleCriticalError(error: AppError): void {
    try {
      // エラーキー（重複検出用）
      const errorKey = `${error.type}:${error.message}`;
      
      // 同じCRITICALエラーが短時間に繰り返し発生していないか確認
      if (!this.loggedErrors.has(`CRITICAL:${errorKey}`)) {
        console.error('重大なエラーが発生しました！', error);
        
        // エラー履歴に記録（30分間は同一エラーを再通知しない）
        this.loggedErrors.add(`CRITICAL:${errorKey}`);
        setTimeout(() => {
          this.loggedErrors.delete(`CRITICAL:${errorKey}`);
        }, 30 * 60 * 1000);
        
        // ここに緊急通知の処理を追加可能
        // 例: 管理者へのSMS通知、チャット通知など
      }
    } catch (e) {
      console.error('クリティカルエラー処理中にエラーが発生しました:', e);
    }
  }
  
  /**
   * エラーを正規化/変換
   * @param error オリジナルのエラーオブジェクト
   * @param context 追加のコンテキスト情報
   * @returns 正規化されたAppErrorオブジェクト
   */
  private normalizeError(error: Error | AppError, context: Record<string, any> = {}): AppError {
    if (error instanceof AppError) {
      // コンテキスト情報をマージ（既存データを優先）
      if (context && Object.keys(context).length > 0) {
        error.context = { ...context, ...error.context };
      }
      return error;
    }
    
    // 通常のErrorをAppErrorに変換
    const errorType = ErrorClassifier.fromError(error);
    const severity = ErrorClassifier.estimateSeverity(error, errorType);
    
    return new AppError({
      message: error.message,
      type: errorType,
      severity: severity,
      context: { ...context, originalStack: error.stack }
    });
  }
  
  /**
   * エラーをログに記録
   * @param error AppErrorオブジェクト
   */
  private logError(error: AppError): void {
    // ErrorLoggerが存在すれば利用
    if (typeof ErrorLogger !== 'undefined' && typeof ErrorLogger.getInstance === 'function') {
      const logger = ErrorLogger.getInstance();
      logger.log(error);
      return;
    }
    
    // ErrorLoggerがない場合はコンソール出力
    const level = error.severity === SeverityLevel.WARNING ? 'warn' : 
                  error.severity === SeverityLevel.ERROR ? 'error' : 
                  error.severity === SeverityLevel.CRITICAL ? 'error' : 'log';
    
    // エラーの詳細情報をログに出力（深刻度に応じたレベルで）
    console[level](
      `[${error.type}] ${error.message}`, 
      { 
        severity: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'][error.severity],
        timestamp: new Date().toISOString(),
        ...error.context 
      }
    );
  }

  /**
   * エラーダッシュボードを更新
   * @param error AppErrorオブジェクト
   * @private
   */
  private updateErrorDashboard(error: AppError): void {
    if (!this.dashboardInitialized) return;
    
    try {
      // ErrorDashboardが利用可能な場合のみ実行
      if (typeof ErrorDashboard !== 'undefined' && typeof ErrorDashboard.getInstance === 'function') {
        const dashboard = ErrorDashboard.getInstance();
        if (typeof dashboard.recordError === 'function') {
          dashboard.recordError(error);
        }
      }
    } catch (e) {
      console.warn('エラーダッシュボードの更新に失敗しました:', e);
    }
  }
  
  /**
   * エラーからの回復を試みる
   * @param error AppErrorオブジェクト
   * @returns 回復に成功したかどうか
   */
  private async attemptRecovery(error: AppError): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(error.type);
    if (!strategy) {
      return false;
    }
    
    try {
      console.log(`${error.type} からの回復を試みています...`);
      const recovered = await strategy(error);
      if (recovered) {
        console.log(`${error.type} からの回復に成功しました`);
      } else {
        console.warn(`${error.type} からの回復に失敗しました`);
      }
      return recovered;
    } catch (recoveryError) {
      console.error('回復処理中にエラーが発生しました:', recoveryError);
      return false;
    }
  }
  
  /**
   * エラーを通知する
   * @param error AppErrorオブジェクト
   */
  private notifyError(error: AppError): void {
    // エラーキー（重複検出用）
    const errorKey = `${error.type}:${error.message}`;
    
    // 同じエラーが短時間に繰り返し通知されることを防止
    if (this.loggedErrors.has(errorKey)) {
      return;
    }
    
    try {
      // ErrorNotificationが存在すれば利用
      if (typeof ErrorNotification !== 'undefined' && typeof ErrorNotification.send === 'function') {
        ErrorNotification.send(error);
        
        // エラー履歴に記録（5分間は同一エラーを再通知しない）
        this.loggedErrors.add(errorKey);
        setTimeout(() => {
          this.loggedErrors.delete(errorKey);
        }, 5 * 60 * 1000);
      }
    } catch (e) {
      console.error('エラー通知の送信に失敗しました:', e);
    }
  }
  
  /**
   * エラーに対する回復戦略を登録
   * @param errorType エラータイプ
   * @param strategy 回復戦略関数
   */
  public registerRecoveryStrategy(errorType: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(errorType, strategy);
  }
  
  /**
   * エラーに対する回復戦略の登録を解除
   * @param errorType エラータイプ
   */
  public unregisterRecoveryStrategy(errorType: string): void {
    this.recoveryStrategies.delete(errorType);
  }
  
  /**
   * エラーに対するユーザー向けメッセージを取得
   * @param error AppErrorオブジェクト
   * @returns ユーザー向けメッセージ
   */
  public getUserFriendlyMessage(error: AppError | Error): string {
    // 通常のエラーの場合
    if (!(error instanceof AppError)) {
      return 'エラーが発生しました。もう一度お試しください。';
    }
    
    // エラータイプに応じたユーザー向けメッセージを返す
    switch (error.type) {
      case ErrorType.NETWORK_UNAVAILABLE:
        return 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
      
      case ErrorType.HTTP_ERROR:
        return 'データの取得中にエラーが発生しました。しばらくしてから再試行してください。';
      
      case ErrorType.TIMEOUT:
        return 'サーバーからの応答がありません。しばらくしてから再試行してください。';
      
      case ErrorType.PARSE_ERROR:
        return 'データの解析中にエラーが発生しました。サポートにお問い合わせください。';
      
      case ErrorType.DATA_VALIDATION_ERROR:
        return '入力データが無効です。入力内容を確認してください。';
      
      case ErrorType.DATA_NOT_FOUND:
        return '指定されたデータが見つかりませんでした。';
      
      case ErrorType.SHEET_NOT_FOUND:
        return '指定されたスプレッドシートが見つかりませんでした。';
      
      case ErrorType.SHEET_ACCESS_DENIED:
        return 'スプレッドシートへのアクセス権限がありません。';
      
      case ErrorType.SHEET_OPERATION_FAILED:
        return 'スプレッドシートの操作中にエラーが発生しました。';
      
      case ErrorType.CONFIG_NOT_FOUND:
      case ErrorType.INVALID_CONFIG:
        return '設定に問題があります。管理者にお問い合わせください。';
      
      case ErrorType.QUOTA_EXCEEDED:
        return 'サービスの利用制限を超えました。しばらく待ってから再試行してください。';
      
      case ErrorType.MEMORY_LIMIT_EXCEEDED:
        return 'システムリソースの制限を超えました。処理するデータ量を減らしてください。';
      
      case ErrorType.UNAUTHORIZED:
        return 'アクセス権限がありません。ログインしてください。';
      
      case ErrorType.FORBIDDEN:
        return 'このリソースにアクセスする権限がありません。';
      
      default:
        return 'エラーが発生しました。もう一度お試しいただくか、サポートにお問い合わせください。';
    }
  }
}

// グローバルからアクセスできるようにする
declare global {
  interface Window {
    ErrorHandler: typeof ErrorHandler;
  }
  var ErrorHandler: {
    getInstance(): ErrorHandler;
  };
}

// グローバル変数として公開
if (typeof globalThis !== 'undefined') {
  globalThis.ErrorHandler = ErrorHandler;
} else if (typeof global !== 'undefined') {
  global.ErrorHandler = ErrorHandler;
} else if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
}

export default ErrorHandler;
