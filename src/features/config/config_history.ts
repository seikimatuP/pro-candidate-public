/**
 * 設定履歴管理
 * 設定変更の履歴を記録・管理するためのユーティリティ
 */

import { debug, info, warn, error } from "../../core/utils";
import fsService from '../../scripts/filesystem_service';
import * as path from 'path';

/**
 * 設定変更エントリの型定義
 */
export interface ConfigChangeEntry {
  timestamp: string;
  user?: string;
  key: string;
  oldValue: any;
  newValue: any;
  environment: string;
}

/**
 * 設定履歴管理クラス
 */
export class ConfigHistory {
  private static instance: ConfigHistory;
  private historyEntries: ConfigChangeEntry[] = [];
  private readonly historyFile: string;
  private readonly maxEntries: number;
  private readonly autoSave: boolean;
  
  /**
   * プライベートコンストラクタ
   * @param options 初期化オプション
   */
  private constructor(options: {
    historyFile?: string;
    maxEntries?: number;
    autoSave?: boolean;
  } = {}) {
    this.historyFile = options.historyFile || path.join(process.cwd(), 'config-history.json');
    this.maxEntries = options.maxEntries || 100;
    this.autoSave = options.autoSave !== false;
    
    // 履歴ファイルを読み込む
    this.loadHistory();
    
    debug('ConfigHistory インスタンスを初期化しました');
  }
  
  /**
   * シングルトンインスタンスを取得
   * @param options 初期化オプション
   * @returns ConfigHistory インスタンス
   */
  public static getInstance(options?: {
    historyFile?: string;
    maxEntries?: number;
    autoSave?: boolean;
  }): ConfigHistory {
    if (!ConfigHistory.instance) {
      ConfigHistory.instance = new ConfigHistory(options);
    }
    return ConfigHistory.instance;
  }
  
  /**
   * 設定変更を記録
   * @param entry 変更エントリ
   */
  public recordChange(entry: Omit<ConfigChangeEntry, 'timestamp'>): void {
    const timestamp = new Date().toISOString();
    
    const fullEntry: ConfigChangeEntry = {
      timestamp,
      ...entry
    };
    
    // 変更前と変更後の値が同じ場合は記録しない
    if (JSON.stringify(entry.oldValue) === JSON.stringify(entry.newValue)) {
      return;
    }
    
    this.historyEntries.unshift(fullEntry);
    
    // 最大エントリ数を超えた場合、古いエントリを削除
    if (this.historyEntries.length > this.maxEntries) {
      this.historyEntries = this.historyEntries.slice(0, this.maxEntries);
    }
    
    // 自動保存が有効な場合
    if (this.autoSave) {
      this.saveHistory();
    }
    
    debug(`設定変更を記録: ${entry.key}`, { environment: entry.environment });
  }
  
  /**
   * 履歴を取得
   * @param limit 取得する最大エントリ数
   * @returns 履歴エントリの配列
   */
  public getHistory(limit = 10): ConfigChangeEntry[] {
    return this.historyEntries.slice(0, limit);
  }
  
  /**
   * 特定のキーの履歴を取得
   * @param key 設定キー
   * @param limit 取得する最大エントリ数
   * @returns 指定キーの履歴エントリの配列
   */
  public getKeyHistory(key: string, limit = 10): ConfigChangeEntry[] {
    return this.historyEntries
      .filter(entry => entry.key === key)
      .slice(0, limit);
  }
  
  /**
   * 履歴をファイルに保存
   * @returns 成功した場合はtrue
   */
  public saveHistory(): boolean {
    try {
      return fsService.writeJson(this.historyFile, this.historyEntries);
    } catch (err) {
      error(`設定履歴の保存に失敗しました: ${this.historyFile}`, { error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }
  
  /**
   * 履歴をファイルから読み込む
   * @returns 成功した場合はtrue
   */
  private loadHistory(): boolean {
    try {
      if (fsService.fileExists(this.historyFile)) {
        const history = fsService.readJson<ConfigChangeEntry[]>(this.historyFile);
        if (Array.isArray(history)) {
          this.historyEntries = history;
          debug(`設定履歴を読み込みました: ${this.historyEntries.length}件`);
          return true;
        }
      }
      
      // ファイルが存在しない、または読み込みに失敗した場合
      this.historyEntries = [];
      return false;
    } catch (err) {
      error(`設定履歴の読み込みに失敗しました: ${this.historyFile}`, { error: err instanceof Error ? err.message : String(err) });
      this.historyEntries = [];
      return false;
    }
  }
  
  /**
   * 特定の時点の設定値を取得
   * @param key 設定キー
   * @param timestamp タイムスタンプ（これ以前の最新の設定値を取得）
   * @returns 設定値、見つからない場合はnull
   */
  public getValueAtTime(key: string, timestamp: string): any {
    const targetTime = new Date(timestamp).getTime();
    
    // 指定されたタイムスタンプ以前の、対象キーの変更履歴を取得
    const relevantEntries = this.historyEntries
      .filter(entry => entry.key === key && new Date(entry.timestamp).getTime() <= targetTime)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // 該当する変更がない場合はnullを返す
    if (relevantEntries.length === 0) {
      return null;
    }
    
    // 最も新しい変更を返す
    return relevantEntries[0].newValue;
  }
  
  /**
   * 環境別の設定履歴を取得
   * @param environment 環境名
   * @param limit 取得する最大エントリ数
   * @returns 指定環境の履歴エントリの配列
   */
  public getEnvironmentHistory(environment: string, limit = 10): ConfigChangeEntry[] {
    return this.historyEntries
      .filter(entry => entry.environment === environment)
      .slice(0, limit);
  }
  
  /**
   * 履歴をクリア
   */
  public clearHistory(): void {
    this.historyEntries = [];
    
    if (this.autoSave) {
      this.saveHistory();
    }
    
    debug('設定履歴をクリアしました');
  }
}

// シングルトンインスタンス
const configHistory = ConfigHistory.getInstance();

// デフォルトエクスポート
export default configHistory;
