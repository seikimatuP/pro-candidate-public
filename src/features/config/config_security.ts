/**
 * 設定値のセキュリティ管理
 * 機密性の高い設定値の暗号化と復号化を担当
 */

import * as crypto from 'crypto';
import { debug, info, warn, error } from "../../core/utils";

/**
 * 暗号化設定オプション
 */
interface EncryptionOptions {
  algorithm?: string;
  secretKey?: string;
  ivLength?: number;
}

/**
 * 設定セキュリティマネージャー
 * 機密情報の暗号化と復号化を処理するユーティリティクラス
 */
export class ConfigSecurity {
  private static instance: ConfigSecurity;
  private readonly algorithm: string;
  private readonly secretKey: Buffer;
  private readonly ivLength: number;
  
  /**
   * プライベートコンストラクタ
   * @param options 暗号化オプション
   */
  private constructor(options: EncryptionOptions = {}) {
    this.algorithm = options.algorithm || 'aes-256-cbc';
    this.ivLength = options.ivLength || 16;
    
    // 秘密鍵の設定（環境変数から取得するか、指定されたものを使用）
    const key = options.secretKey || 
                (typeof process !== 'undefined' && process.env.CONFIG_ENCRYPTION_KEY) || 
                'default-encryption-key-change-in-production';
                
    // 安全のため、鍵の長さが十分であることを確認
    if (key.length < 32) {
      warn('暗号化キーが短すぎます。セキュリティのリスクがあります。32文字以上を推奨します。');
    }
    
    // 鍵の長さを調整（32バイト = 256ビット）
    this.secretKey = crypto.scryptSync(key, 'salt', 32);
    
    debug('ConfigSecurity インスタンスを初期化しました');
  }
  
  /**
   * シングルトンインスタンスを取得
   * @param options 暗号化オプション
   * @returns ConfigSecurity インスタンス
   */
  public static getInstance(options?: EncryptionOptions): ConfigSecurity {
    if (!ConfigSecurity.instance) {
      ConfigSecurity.instance = new ConfigSecurity(options);
    }
    return ConfigSecurity.instance;
  }
  
  /**
   * 値を暗号化する
   * @param value 暗号化する値
   * @returns 暗号化された文字列
   */
  public encrypt(value: string): string {
    try {
      if (!value) return '';
      
      // 初期化ベクトル（IV）の生成
      const iv = crypto.randomBytes(this.ivLength);
      
      // 暗号化
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // IV + 暗号文 の形式で保存（復号時にIVが必要）
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (err) {
      error('値の暗号化に失敗しました', { error: err instanceof Error ? err.message : String(err) });
      return '';
    }
  }
  
  /**
   * 値を復号化する
   * @param encryptedValue 暗号化された文字列
   * @returns 復号化された値、失敗した場合は空文字列
   */
  public decrypt(encryptedValue: string): string {
    try {
      if (!encryptedValue) return '';
      
      // IV と 暗号文 を分離
      const [ivHex, encrypted] = encryptedValue.split(':');
      if (!ivHex || !encrypted) {
        throw new Error('暗号化された値のフォーマットが不正です');
      }
      
      // IV を変換
      const iv = Buffer.from(ivHex, 'hex');
      
      // 復号化
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (err) {
      error('値の復号化に失敗しました', { error: err instanceof Error ? err.message : String(err) });
      return '';
    }
  }
  
  /**
   * 値が暗号化されているかチェック
   * @param value チェックする値
   * @returns 暗号化されていれば true
   */
  public isEncrypted(value: string): boolean {
    if (!value) return false;
    
    // 暗号化された値のパターン（hex:hex）をチェック
    const pattern = /^[0-9a-f]+:[0-9a-f]+$/i;
    return pattern.test(value);
  }
}

// シングルトンインスタンス
const configSecurity = ConfigSecurity.getInstance();

// エクスポート
export default configSecurity;
