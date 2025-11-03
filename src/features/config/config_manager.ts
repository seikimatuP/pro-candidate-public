/**
 * 設定管理システム
 * アプリケーション全体の設定を一元管理するマネージャー
 */

import { debug, info, warn, error } from '../../core/utils';
import fsService from '../../scripts/filesystem_service';
import configHistory from './config_history';
import configSecurity from './config_security';
import configNotifier from './config_notifier';
import configReference, { ConfigValueType } from './config_reference';
import { validator } from '../validation/validator';
import * as path from 'path';

/**
 * 環境タイプの定義
 */
export enum Environment {
  DEVELOPMENT = 'development',
  TEST = 'test',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * 設定マネージャーのオプション
 */
export interface ConfigManagerOptions {
  configDir?: string;
  environment?: Environment;
  autoSave?: boolean;
  autoLoad?: boolean;
  encryptSensitiveValues?: boolean;
  notifyOnChange?: boolean;
}

/**
 * 設定マネージャークラス
 * アプリケーション全体の設定管理を担当
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: Map<string, any> = new Map();
  private readonly configDir: string;
  private readonly environment: Environment;
  private readonly autoSave: boolean;
  private readonly encryptSensitiveValues: boolean;
  private readonly notifyOnChange: boolean;
  private configFilePath: string;
  private defaultConfigFilePath: string;
  private isDirty = false;

  /**
   * プライベートコンストラクタ
   * @param options 初期化オプション
   */
  private constructor(options: ConfigManagerOptions = {}) {
    this.configDir = options.configDir || path.join(process.cwd(), 'config');
    this.environment = options.environment || Environment.DEVELOPMENT;
    this.autoSave = options.autoSave !== false;
    this.encryptSensitiveValues = options.encryptSensitiveValues !== false;
    this.notifyOnChange = options.notifyOnChange !== false;

    // 設定ファイルのパスを構築
    this.configFilePath = path.join(this.configDir, `${this.environment}.json`);
    this.defaultConfigFilePath = path.join(this.configDir, 'default.json');

    // 自動読み込み
    if (options.autoLoad !== false) {
      this.load();
    }

    debug(`ConfigManager インスタンスを初期化しました (環境: ${this.environment})`);
  }

  /**
   * シングルトンインスタンスを取得
   * @param options 初期化オプション
   * @returns ConfigManager インスタンス
   */
  public static getInstance(options?: ConfigManagerOptions): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(options);
    }
    return ConfigManager.instance;
  }

  /**
   * 設定を取得
   * @param key 設定キー
   * @param defaultValue デフォルト値
   * @returns 設定値
   */
  public get<T = any>(key: string, defaultValue?: T): T {
    // メタデータを取得
    const metadata = configReference.getKeyMetadata(key);

    // 設定値を取得
    const value = this.config.get(key);

    // 値が設定されていない場合はデフォルト値を使用
    if (value === undefined) {
      // メタデータのデフォルト値があればそれを返す
      if (metadata && metadata.defaultValue !== undefined) {
        return metadata.defaultValue as T;
      }

      // 引数のデフォルト値があればそれを返す
      if (defaultValue !== undefined) {
        return defaultValue;
      }

      // 必須設定でデフォルト値もない場合はエラー
      if (metadata && metadata.required) {
        error(`必須設定 "${key}" が設定されていません`);
      }

      return defaultValue as T;
    }

    return value as T;
  }

  /**
   * 機密設定を取得
   * @param key 設定キー
   * @param defaultValue デフォルト値
   * @returns 復号化された設定値
   */
  public getSecure<T = string>(key: string, defaultValue?: T): T {
    const value = this.get<string>(key, defaultValue as string);

    if (typeof value !== 'string') {
      return value as T;
    }

    // 暗号化されている場合は復号化
    if (configSecurity.isEncrypted(value)) {
      return configSecurity.decrypt(value) as unknown as T;
    }

    return value as unknown as T;
  }

  /**
   * 設定を設定
   * @param key 設定キー
   * @param value 設定値
   * @param options オプション
   * @returns 成功した場合はtrue
   */
  public set(
    key: string,
    value: any,
    options: {
      validate?: boolean;
      save?: boolean;
      trackHistory?: boolean;
      notify?: boolean;
    } = {}
  ): boolean {
    const validate = options.validate !== false;
    const save = options.save ?? this.autoSave;
    const trackHistory = options.trackHistory !== false;
    const notify = options.notify ?? this.notifyOnChange;

    try {
      // メタデータを取得
      const metadata = configReference.getKeyMetadata(key);

      // 古い値を保存
      const oldValue = this.config.get(key);

      // 設定キーのバリデーション
      if (validate && metadata) {
        this.validateConfigValue(key, value, metadata.valueType);
      }

      // 設定を更新
      this.config.set(key, value);
      this.isDirty = true;

      // 履歴を記録
      if (trackHistory) {
        configHistory.recordChange({
          key,
          oldValue,
          newValue: value,
          environment: this.environment,
        });
      }

      // 変更通知
      if (notify) {
        configNotifier.notifyConfigChange(key, oldValue, value, this.environment);
      }

      // 自動保存
      if (save) {
        this.save();
      }

      debug(`設定 "${key}" を更新しました`);
      return true;
    } catch (err) {
      error(`設定 "${key}" の更新に失敗しました`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * 機密設定を設定（暗号化して保存）
   * @param key 設定キー
   * @param value 設定値（平文）
   * @param options オプション
   * @returns 成功した場合はtrue
   */
  public setSecure(
    key: string,
    value: string,
    options: {
      validate?: boolean;
      save?: boolean;
      trackHistory?: boolean;
      notify?: boolean;
    } = {}
  ): boolean {
    if (typeof value !== 'string') {
      error(`機密設定 "${key}" は文字列である必要があります`);
      return false;
    }

    // 暗号化する
    if (this.encryptSensitiveValues && value && !configSecurity.isEncrypted(value)) {
      const encryptedValue = configSecurity.encrypt(value);
      return this.set(key, encryptedValue, options);
    }

    return this.set(key, value, options);
  }

  /**
   * 設定を削除
   * @param key 設定キー
   * @param options オプション
   * @returns 成功した場合はtrue
   */
  public remove(
    key: string,
    options: {
      save?: boolean;
      trackHistory?: boolean;
      notify?: boolean;
    } = {}
  ): boolean {
    const save = options.save ?? this.autoSave;
    const trackHistory = options.trackHistory !== false;
    const notify = options.notify ?? this.notifyOnChange;

    try {
      // 既存の値を確認
      if (!this.config.has(key)) {
        return true; // すでに存在しない場合は成功とみなす
      }

      // 古い値を保存
      const oldValue = this.config.get(key);

      // 設定を削除
      this.config.delete(key);
      this.isDirty = true;

      // 履歴を記録
      if (trackHistory) {
        configHistory.recordChange({
          key,
          oldValue,
          newValue: undefined,
          environment: this.environment,
        });
      }

      // 変更通知
      if (notify) {
        configNotifier.notifyConfigChange(key, oldValue, undefined, this.environment);
      }

      // 自動保存
      if (save) {
        this.save();
      }

      debug(`設定 "${key}" を削除しました`);
      return true;
    } catch (err) {
      error(`設定 "${key}" の削除に失敗しました`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * 設定が存在するか確認
   * @param key 設定キー
   * @returns 存在する場合はtrue
   */
  public has(key: string): boolean {
    return this.config.has(key);
  }

  /**
   * すべての設定を取得
   * @returns 設定のオブジェクト
   */
  public getAll(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of this.config.entries()) {
      result[key] = value;
    }

    return result;
  }

  /**
   * 複数の設定を一括設定
   * @param configs 設定のオブジェクト
   * @param options オプション
   * @returns 成功した場合はtrue
   */
  public setMultiple(
    configs: Record<string, any>,
    options: {
      validate?: boolean;
      save?: boolean;
      trackHistory?: boolean;
      notify?: boolean;
    } = {}
  ): boolean {
    try {
      const keys = Object.keys(configs);

      // すべてのキーを順番に設定
      // 注: 自動保存はまとめて行うため、個別設定では無効化
      const individualOptions = { ...options, save: false };

      let success = true;
      for (const key of keys) {
        const result = this.set(key, configs[key], individualOptions);
        if (!result) {
          success = false;
        }
      }

      // まとめて保存
      const save = options.save ?? this.autoSave;
      if (save && this.isDirty) {
        this.save();
      }

      return success;
    } catch (err) {
      error('複数設定の更新に失敗しました', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * 設定ファイルを読み込む
   * @param reload キャッシュを無視して再読み込みするか
   * @returns 成功した場合はtrue
   */
  public load(reload = false): boolean {
    try {
      // 設定が既に読み込まれていて、再読み込みが不要な場合
      if (!reload && this.config.size > 0 && !this.isDirty) {
        return true;
      }

      // デフォルト設定を読み込む
      let defaultConfig: Record<string, any> = {};
      if (fsService.fileExists(this.defaultConfigFilePath)) {
        const defaultConfigData = fsService.readJson<Record<string, any>>(
          this.defaultConfigFilePath
        );
        if (defaultConfigData) {
          defaultConfig = defaultConfigData;
        }
      }

      // 環境別設定を読み込む
      let envConfig: Record<string, any> = {};
      if (fsService.fileExists(this.configFilePath)) {
        const envConfigData = fsService.readJson<Record<string, any>>(this.configFilePath);
        if (envConfigData) {
          envConfig = envConfigData;
        }
      }

      // 設定をマージ
      this.config.clear();
      this.loadConfigToMap(defaultConfig);
      this.loadConfigToMap(envConfig);

      this.isDirty = false;
      debug(`設定を読み込みました (環境: ${this.environment})`);

      // 必須設定の検証
      this.validateRequiredConfigs();

      return true;
    } catch (err) {
      error('設定の読み込みに失敗しました', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * 設定ファイルを保存
   * @returns 成功した場合はtrue
   */
  public save(): boolean {
    try {
      if (!this.isDirty) {
        return true; // 変更がない場合は何もしない
      }

      // 設定オブジェクトを作成
      const configData: Record<string, any> = {};
      for (const [key, value] of this.config.entries()) {
        configData[key] = value;
      }

      // 設定ディレクトリの存在確認
      fsService.ensureDir(this.configDir);

      // 設定ファイルに書き込み
      const success = fsService.writeJson(this.configFilePath, configData);

      if (success) {
        this.isDirty = false;
        debug(`設定を保存しました: ${this.configFilePath}`);
      }

      return success;
    } catch (err) {
      error('設定の保存に失敗しました', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * 環境を切り替える
   * @param environment 新しい環境
   * @param options オプション
   * @returns 成功した場合はtrue
   */
  public switchEnvironment(
    environment: Environment,
    options: {
      save?: boolean;
      load?: boolean;
    } = {}
  ): boolean {
    try {
      // 現在の設定を保存
      const save = options.save ?? this.autoSave;
      if (save && this.isDirty) {
        this.save();
      }

      // 環境を切り替え
      (this as any).environment = environment;
      this.configFilePath = path.join(this.configDir, `${environment}.json`);

      // 新しい環境の設定を読み込む
      const load = options.load !== false;
      if (load) {
        return this.load(true);
      }

      return true;
    } catch (err) {
      error(`環境の切り替えに失敗しました: ${environment}`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * 現在の環境を取得
   * @returns 現在の環境
   */
  public getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * 設定値を検証
   * @param key 設定キー
   * @param value 設定値
   * @param valueType 値の型
   * @throws 検証エラー
   */
  private validateConfigValue(key: string, value: any, valueType?: ConfigValueType): void {
    if (!valueType) return;

    try {
      switch (valueType) {
        case ConfigValueType.STRING:
          validator.string(value, { required: true });
          break;
        case ConfigValueType.NUMBER:
          validator.number(value, { required: true });
          break;
        case ConfigValueType.BOOLEAN:
          if (typeof value !== 'boolean') {
            throw new Error(`"${key}" はブール値である必要があります`);
          }
          break;
        case ConfigValueType.OBJECT:
          validator.object(value, { required: true });
          break;
        case ConfigValueType.ARRAY:
          if (!Array.isArray(value)) {
            throw new Error(`"${key}" は配列である必要があります`);
          }
          break;
        case ConfigValueType.DATE:
          validator.date(value, { required: true });
          break;
        case ConfigValueType.SECURE:
          // 暗号化値または文字列
          if (typeof value !== 'string') {
            throw new Error(`"${key}" は文字列である必要があります`);
          }
          break;
      }
    } catch (err) {
      throw new Error(
        `設定 "${key}" の検証に失敗しました: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * 必須設定の検証
   */
  private validateRequiredConfigs(): void {
    const requiredKeys = configReference.getRequiredKeys();

    for (const metadata of requiredKeys) {
      if (!this.config.has(metadata.key)) {
        warn(`必須設定 "${metadata.key}" が設定されていません`);
      }
    }
  }

  /**
   * 設定オブジェクトをMapに読み込み
   * @param config 設定オブジェクト
   */
  private loadConfigToMap(config: Record<string, any>): void {
    for (const key of Object.keys(config)) {
      this.config.set(key, config[key]);
    }
  }

  /**
   * 設定をリセット
   * @returns 成功した場合はtrue
   */
  public reset(): boolean {
    try {
      this.config.clear();
      this.isDirty = true;

      debug('設定をリセットしました');

      return this.save();
    } catch (err) {
      error('設定のリセットに失敗しました', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }
}

// シングルトンインスタンス
const configManager = ConfigManager.getInstance();

// エクスポート
export default configManager;
