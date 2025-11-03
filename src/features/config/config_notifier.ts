/**
 * 設定変更通知システム
 * 設定変更時の通知を一元管理
 */

import { debug, info, warn, error } from "../../core/utils";

/**
 * 通知先タイプ
 */
export enum NotificationType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  CONSOLE = 'console',
  CUSTOM = 'custom'
}

/**
 * 通知設定インターフェース
 */
export interface NotificationConfig {
  type: NotificationType;
  enabled: boolean;
  options?: Record<string, any>;
}

/**
 * 通知メッセージインターフェース
 */
export interface NotificationMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
  importance?: 'low' | 'normal' | 'high';
}

/**
 * 通知処理用インターフェース
 */
interface NotificationHandler {
  send(message: NotificationMessage, config: NotificationConfig): Promise<boolean>;
}

/**
 * 設定変更通知マネージャー
 */
export class ConfigNotifier {
  private static instance: ConfigNotifier;
  private handlers: Map<NotificationType, NotificationHandler> = new Map();
  private configs: Map<NotificationType, NotificationConfig> = new Map();
  
  /**
   * プライベートコンストラクタ
   */
  private constructor() {
    // デフォルトハンドラの登録
    this.registerHandler(NotificationType.CONSOLE, {
      send: async (message: NotificationMessage) => {
        console.log(`[通知] ${message.title}`);
        console.log(message.body);
        if (message.data) {
          console.log(message.data);
        }
        return true;
      }
    });
    
    // デフォルト設定の登録
    this.configs.set(NotificationType.CONSOLE, {
      type: NotificationType.CONSOLE,
      enabled: true
    });
    
    debug('ConfigNotifier インスタンスを初期化しました');
  }
  
  /**
   * シングルトンインスタンスを取得
   * @returns ConfigNotifier インスタンス
   */
  public static getInstance(): ConfigNotifier {
    if (!ConfigNotifier.instance) {
      ConfigNotifier.instance = new ConfigNotifier();
    }
    return ConfigNotifier.instance;
  }
  
  /**
   * 通知ハンドラを登録
   * @param type 通知タイプ
   * @param handler 通知ハンドラ
   */
  public registerHandler(type: NotificationType, handler: NotificationHandler): void {
    this.handlers.set(type, handler);
    debug(`通知ハンドラを登録しました: ${type}`);
  }
  
  /**
   * 通知設定を登録
   * @param config 通知設定
   */
  public registerConfig(config: NotificationConfig): void {
    if (!this.handlers.has(config.type)) {
      warn(`未登録の通知タイプです: ${config.type}. 先にハンドラを登録してください。`);
      return;
    }
    
    this.configs.set(config.type, config);
    debug(`通知設定を登録しました: ${config.type}`);
  }
  
  /**
   * 設定変更通知を送信
   * @param key 変更された設定キー
   * @param oldValue 以前の値
   * @param newValue 新しい値
   * @param environment 環境
   * @returns 通知送信の成否
   */
  public async notifyConfigChange(
    key: string, 
    oldValue: any, 
    newValue: any, 
    environment: string
  ): Promise<boolean> {
    const message: NotificationMessage = {
      title: `設定変更通知: ${key}`,
      body: `環境 ${environment} の設定 "${key}" が変更されました`,
      data: {
        key,
        oldValue,
        newValue,
        environment,
        timestamp: new Date().toISOString()
      }
    };
    
    return this.notify(message);
  }
  
  /**
   * 通知を送信
   * @param message 通知メッセージ
   * @returns すべての通知の送信成否
   */
  public async notify(message: NotificationMessage): Promise<boolean> {
    let success = true;
    
    // 全ての有効な通知先に送信
    for (const [type, config] of this.configs.entries()) {
      if (config.enabled && this.handlers.has(type)) {
        try {
          const handler = this.handlers.get(type)!;
          const result = await handler.send(message, config);
          
          if (!result) {
            warn(`通知の送信に失敗しました: ${type}`);
            success = false;
          }
        } catch (err) {
          error(`通知送信中にエラーが発生しました: ${type}`, { error: err instanceof Error ? err.message : String(err) });
          success = false;
        }
      }
    }
    
    return success;
  }
}

// シングルトンインスタンス
const configNotifier = ConfigNotifier.getInstance();

// エクスポート
export default configNotifier;
