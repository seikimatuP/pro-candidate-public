/**
 * 入力検証のための統合ユーティリティ
 * アプリケーション全体の入力検証を一元管理
 */
import { debug, info, warn, error } from "../../core/utils";

/**
 * 検証用の正規表現パターン
 */
export const ValidationPatterns = {
  /** 年度フォーマット (4桁の数字) */
  YEAR: /^\d{4}$/,
  /** URLパターン */
  URL: /^https?:\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
  /** メールアドレスパターン */
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  /** スクリプト要素の検出パターン */
  SCRIPT: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /** XSS関連属性の検出パターン */
  XSS_ATTR: /on\w+\s*=|javascript:|data:/gi,
  /** シート名の有効文字パターン */
  SHEET_NAME: /^[^\\\/\?\*\[\]]{1,100}$/,
  /** HTMLタグ */
  HTML_TAGS: /<[^>]*>/i,
  /** 数値パターン */
  NUMBER: /^-?\d+(\.\d+)?$/,
  /** 整数パターン */
  INTEGER: /^-?\d+$/,
  /** 英数字のみ */
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  /** キー名パターン（アルファベット、数字、アンダースコア、ハイフンのみ） */
  KEY_NAME: /^[a-zA-Z0-9_-]+$/,
  /** 日付パターン (YYYY-MM-DD形式) */
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  /** JSONパターン */
  JSON_FORMAT: /^[\{\[].*[\}\]]$/,
  /** ファイルパスセキュリティパターン（ディレクトリトラバーサル防止） */
  SAFE_PATH: /^[a-zA-Z0-9_\-\/\. ]+$/,
  /** IPアドレスパターン */
  IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
};

/**
 * 検証エラーの種類
 */
export enum ValidationErrorType {
  REQUIRED = 'required',
  TYPE_MISMATCH = 'type_mismatch',
  FORMAT = 'format',
  RANGE = 'range',
  PATTERN = 'pattern',
  CONTENT = 'content',
  SECURITY = 'security',
  OTHER = 'other'
}

/**
 * 検証エラー情報
 */
export interface ValidationError {
  type: ValidationErrorType;
  field: string;
  message: string;
  value?: any;
  details?: any;
}

/**
 * 入力検証クラス
 * データの検証とサニタイズを行います
 * 
 * このクラスは、アプリケーション全体で入力データの検証に使用されるメソッドを提供します。
 * セキュリティリスクを低減し、データ整合性を保証するために使用します。
 * 
 * @category セキュリティ
 */
export class Validator {
  private static instance: Validator;

  /**
   * プライベートコンストラクタ
   */
  private constructor() {
    debug('Validator インスタンスを初期化しました');
  }

  /**
   * シングルトンインスタンスを取得
   * @returns Validator インスタンス
   */
  public static getInstance(): Validator {
    if (!Validator.instance) {
      Validator.instance = new Validator();
    }
    return Validator.instance;
  }

  /**
   * 必須項目チェック
   * @param value 検証対象値
   * @param fieldName フィールド名（エラーメッセージ用）
   * @returns 検証済みの値
   * @throws Error 空の場合はエラーをスロー
   * 
   * @example
   * ```typescript
   * const username = validator.required(formData.username, 'ユーザー名');
   * ```
   */
  public required(value: any, fieldName = '値'): any {
    if (value === null || value === undefined || value === '') {
      throw new Error(`${fieldName}は必須です`);
    }
    return value;
  }

  /**
   * 文字列検証
   * @param value 検証対象値
   * @param options バリデーションオプション
   * @returns 検証済みの文字列
   * @throws Error 検証エラー時
   * 
   * @example
   * ```typescript
   * const description = validator.string(input.description, 0, 500, '説明文');
   * ```
   */
  public string(value: any, options: { 
    required?: boolean;
    minLength?: number; 
    maxLength?: number;
    fieldName?: string;
    pattern?: RegExp;
    allowHtml?: boolean;
  } = {}): string {
    const fieldName = options.fieldName || '文字列';
    
    if (options.required) {
      this.required(value, fieldName);
    } else if (value === null || value === undefined || value === '') {
      return '';
    }
    
    const strValue = String(value);
    
    // 最小文字数チェック
    if (options.minLength !== undefined && strValue.length < options.minLength) {
      throw new Error(`${fieldName}は${options.minLength}文字以上である必要があります`);
    }
    
    // 最大文字数チェック
    if (options.maxLength !== undefined && strValue.length > options.maxLength) {
      throw new Error(`${fieldName}は${options.maxLength}文字以下である必要があります`);
    }
    
    // パターンチェック
    if (options.pattern !== undefined && !options.pattern.test(strValue)) {
      throw new Error(`${fieldName}は正しい形式ではありません`);
    }
    
    // HTML禁止チェック
    if (!options.allowHtml && ValidationPatterns.HTML_TAGS.test(strValue)) {
      throw new Error(`${fieldName}にHTMLタグを含めることはできません`);
    }
    
    return strValue;
  }

  /**
   * URL検証
   * @param value 検証対象URL
   * @param required 必須かどうか
   * @returns 検証済みのURL
   * @throws Error 不正なURLの場合
   * 
   * @example
   * ```typescript
   * const websiteUrl = validator.url(formData.website, 'ウェブサイトURL', true);
   * ```
   */
  public url(value: any, required = false): string {
    if (!required && (value === null || value === undefined || value === '')) {
      return '';
    }

    if (required) {
      this.required(value, 'URL');
    }

    const urlString = String(value);
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

    if (!urlPattern.test(urlString)) {
      throw new Error('正しいURL形式ではありません');
    }

    return urlString;
  }

  /**
   * 年度検証
   * @param value 検証対象年
   * @param options オプション
   * @returns 検証済みの年
   * @throws Error 不正な年の場合
   */
  public year(value: any, options: {
    required?: boolean;
    min?: number;
    max?: number;
    fieldName?: string;
  } = {}): number | null {
    const fieldName = options.fieldName || '年度';
    
    if (!options.required && (value === null || value === undefined || value === '')) {
      return null;
    }
    
    if (options.required) {
      this.required(value, fieldName);
    }
    
    const yearStr = String(value);
    if (!ValidationPatterns.YEAR.test(yearStr)) {
      throw new Error(`${fieldName}は4桁の数字で入力してください`);
    }
    
    const yearNum = parseInt(yearStr, 10);
    
    if (options.min !== undefined && yearNum < options.min) {
      throw new Error(`${fieldName}は${options.min}以上である必要があります`);
    }
    
    if (options.max !== undefined && yearNum > options.max) {
      throw new Error(`${fieldName}は${options.max}以下である必要があります`);
    }
    
    return yearNum;
  }

  /**
   * メールアドレス検証
   * @param value メールアドレス
   * @param required 必須かどうか
   * @returns 検証済みのメールアドレス
   * @throws Error 不正なメールアドレスの場合
   */
  public email(value: any, required = false): string {
    if (!required && (value === null || value === undefined || value === '')) {
      return '';
    }

    if (required) {
      this.required(value, 'メールアドレス');
    }

    const emailStr = String(value);
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailPattern.test(emailStr)) {
      throw new Error('正しいメールアドレス形式ではありません');
    }

    return emailStr;
  }

  /**
   * 数値検証
   * @param value 検証対象値
   * @param options 検証オプション
   * @returns 検証済みの数値
   * @throws Error 検証エラー時
   */
  public number(value: any, options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
    fieldName?: string;
  } = {}): number | null {
    const fieldName = options.fieldName || '数値';
    
    if (!options.required && (value === null || value === undefined || value === '')) {
      return null;
    }
    
    if (options.required) {
      this.required(value, fieldName);
    }
    
    // 数値に変換
    let numValue: number;
    if (typeof value === 'number') {
      numValue = value;
    } else {
      const strValue = String(value);
      if (options.integer && !ValidationPatterns.INTEGER.test(strValue)) {
        throw new Error(`${fieldName}は整数で入力してください`);
      } else if (!ValidationPatterns.NUMBER.test(strValue)) {
        throw new Error(`${fieldName}は数値で入力してください`);
      }
      numValue = options.integer ? parseInt(strValue, 10) : parseFloat(strValue);
    }
    
    // 最小値チェック
    if (options.min !== undefined && numValue < options.min) {
      throw new Error(`${fieldName}は${options.min}以上である必要があります`);
    }
    
    // 最大値チェック
    if (options.max !== undefined && numValue > options.max) {
      throw new Error(`${fieldName}は${options.max}以下である必要があります`);
    }
    
    return numValue;
  }

  /**
   * 配列検証
   * @param value 検証対象配列
   * @param options 検証オプション
   * @returns 検証済み配列
   * @throws Error 検証エラー時
   */
  public array(value: any, options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    fieldName?: string;
    validator?: (item: any, index: number) => any;
  } = {}): any[] | null {
    const fieldName = options.fieldName || '配列';
    
    if (!options.required && (value === null || value === undefined)) {
      return null;
    }
    
    if (options.required) {
      this.required(value, fieldName);
    }
    
    if (!Array.isArray(value)) {
      throw new Error(`${fieldName}は配列である必要があります`);
    }
    
    // 最小長さチェック
    if (options.minLength !== undefined && value.length < options.minLength) {
      throw new Error(`${fieldName}は${options.minLength}項目以上必要です`);
    }
    
    // 最大長さチェック
    if (options.maxLength !== undefined && value.length > options.maxLength) {
      throw new Error(`${fieldName}は${options.maxLength}項目以下である必要があります`);
    }
    
    // 各要素の検証
    if (options.validator) {
      return value.map((item, index) => options.validator!(item, index));
    }
    
    return value;
  }

  /**
   * オブジェクト検証
   * @param value 検証対象オブジェクト
   * @param options 検証オプション
   * @returns 検証済みオブジェクト
   * @throws Error 検証エラー時
   */
  public object(value: any, options: {
    required?: boolean;
    schema?: {[key: string]: (v: any) => any};
    fieldName?: string;
    allowExtra?: boolean;
  } = {}): Record<string, any> | null {
    const fieldName = options.fieldName || 'オブジェクト';
    
    if (!options.required && (value === null || value === undefined)) {
      return null;
    }
    
    if (options.required) {
      this.required(value, fieldName);
    }
    
    if (typeof value !== 'object' || Array.isArray(value) || value === null) {
      throw new Error(`${fieldName}はオブジェクトである必要があります`);
    }
    
    // スキーマ検証
    if (options.schema) {
      const result: Record<string, any> = {};
      const schemaKeys = Object.keys(options.schema);
      
      // 必須キーのチェック
      schemaKeys.forEach(key => {
        try {
            result[key] = options.schema![key](value[key]);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            throw new Error(`${fieldName}の${key}: ${errorMessage}`);
          }
      });
      
      // 余分なキーのチェック
      if (!options.allowExtra) {
        Object.keys(value).forEach(key => {
          if (!schemaKeys.includes(key)) {
            throw new Error(`${fieldName}に未定義のプロパティ ${key} が含まれています`);
          }
        });
      }
      
      return result;
    }
    
    return value;
  }

  /**
   * 日付検証
   * @param value 検証対象日付
   * @param options 検証オプション
   * @returns 検証済み日付
   * @throws Error 検証エラー時
   */
  public date(value: any, options: {
    required?: boolean;
    min?: Date;
    max?: Date;
    fieldName?: string;
    format?: string;
  } = {}): Date | null {
    const fieldName = options.fieldName || '日付';
    
    if (!options.required && (value === null || value === undefined || value === '')) {
      return null;
    }
    
    if (options.required) {
      this.required(value, fieldName);
    }
    
    let dateValue: Date;
    
    // 日付オブジェクトかどうか
    if (value instanceof Date) {
      dateValue = value;
    } else {
      // 文字列から日付へ変換
      const dateStr = String(value);
      
      // フォーマットチェック（デフォルトはYYYY-MM-DD）
      if (options.format === 'YYYY/MM/DD') {
        if (!/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
          throw new Error(`${fieldName}はYYYY/MM/DD形式で入力してください`);
        }
      } else {
        if (!ValidationPatterns.DATE.test(dateStr)) {
          throw new Error(`${fieldName}はYYYY-MM-DD形式で入力してください`);
        }
      }
      
      dateValue = new Date(dateStr);
      
      // 有効な日付かチェック
      if (isNaN(dateValue.getTime())) {
        throw new Error(`${fieldName}は有効な日付ではありません`);
      }
    }
    
    // 最小日付チェック
    if (options.min && dateValue < options.min) {
      throw new Error(`${fieldName}は${options.min.toISOString().split('T')[0]}以降である必要があります`);
    }
    
    // 最大日付チェック
    if (options.max && dateValue > options.max) {
      throw new Error(`${fieldName}は${options.max.toISOString().split('T')[0]}以前である必要があります`);
    }
    
    return dateValue;
  }

  /**
   * ファイルパス検証
   * @param value 検証対象パス
   * @param options 検証オプション
   * @returns 検証済みパス
   * @throws Error 検証エラー時
   */
  public path(value: any, options: {
    required?: boolean;
    fieldName?: string;
    allowedExtensions?: string[];
  } = {}): string {
    const fieldName = options.fieldName || 'ファイルパス';
    
    if (!options.required && (value === null || value === undefined || value === '')) {
      return '';
    }
    
    if (options.required) {
      this.required(value, fieldName);
    }
    
    const pathStr = String(value);
    
    // ディレクトリトラバーサル攻撃対策
    if (pathStr.includes('..') || !ValidationPatterns.SAFE_PATH.test(pathStr)) {
      throw new Error(`${fieldName}に不正な文字が含まれています`);
    }
    
    // 拡張子チェック
    if (options.allowedExtensions && options.allowedExtensions.length > 0) {
      const ext = pathStr.split('.').pop()?.toLowerCase();
      if (!ext || !options.allowedExtensions.includes(ext)) {
        throw new Error(`${fieldName}は次の拡張子のみ許可されています: ${options.allowedExtensions.join(', ')}`);
      }
    }
    
    return pathStr;
  }

  /**
   * JSONデータ検証
   * @param value 検証対象JSON文字列
   * @param options 検証オプション
   * @returns 検証済みJSONオブジェクト
   * @throws Error 検証エラー時
   */
  public json(value: any, options: {
    required?: boolean;
    fieldName?: string;
    schema?: (obj: any) => any;
  } = {}): any {
    const fieldName = options.fieldName || 'JSON';
    
    if (!options.required && (value === null || value === undefined || value === '')) {
      return null;
    }
    
    if (options.required) {
      this.required(value, fieldName);
    }
    
    let jsonStr: string;
    let parsedJson: any;
    
    // オブジェクトが渡された場合は文字列化
    if (typeof value === 'object' && value !== null) {
      try {
        jsonStr = JSON.stringify(value);
        parsedJson = value;
      } catch (err) {
        throw new Error(`${fieldName}は有効なJSONオブジェクトではありません`);
      }
    } else {
      jsonStr = String(value);
      
      // JSON文字列の基本的な形式チェック
      if (!ValidationPatterns.JSON_FORMAT.test(jsonStr.trim())) {
        throw new Error(`${fieldName}は有効なJSON形式ではありません`);
      }
      
      // JSONとしてパース
      try {
        parsedJson = JSON.parse(jsonStr);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new Error(`${fieldName}は有効なJSON形式ではありません: ${errorMessage}`);
      }
    }
    
    // スキーマ検証
    if (options.schema) {
      try {
        return options.schema(parsedJson);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new Error(`${fieldName}のスキーマ検証に失敗しました: ${errorMessage}`);
      }
    }
    
    return parsedJson;
  }

  /**
   * IPアドレス検証
   * @param value 検証対象IPアドレス
   * @param required 必須かどうか
   * @returns 検証済みIPアドレス
   * @throws Error 検証エラー時
   */
  public ipAddress(value: any, required = false): string {
    const fieldName = 'IPアドレス';
    
    if (!required && (value === null || value === undefined || value === '')) {
      return '';
    }
    
    if (required) {
      this.required(value, fieldName);
    }
    
    const ipStr = String(value);
    
    if (!ValidationPatterns.IP_ADDRESS.test(ipStr)) {
      throw new Error(`${fieldName}は有効なIPv4アドレス形式ではありません`);
    }
    
    return ipStr;
  }

  /**
   * 郵便番号検証
   * @param value 検証対象郵便番号
   * @param required 必須かどうか
   * @returns 検証済み郵便番号
   */
  public postalCode(value: any, required = false): string {
    if (!required && (value === null || value === undefined || value === '')) {
      return '';
    }
    
    if (required) {
      this.required(value, '郵便番号');
    }
    
    const postalStr = String(value);
    // 日本の郵便番号パターン（123-4567または1234567）
    const postalPattern = /^(\d{3}-\d{4}|\d{7})$/;
    
    if (!postalPattern.test(postalStr)) {
      throw new Error('郵便番号は123-4567または7桁の数字で入力してください');
    }
    
    return postalStr;
  }

  /**
   * 電話番号検証
   * @param value 検証対象電話番号
   * @param required 必須かどうか
   * @returns 検証済み電話番号
   */
  public phoneNumber(value: any, required = false): string {
    if (!required && (value === null || value === undefined || value === '')) {
      return '';
    }
    
    if (required) {
      this.required(value, '電話番号');
    }
    
    const phoneStr = String(value);
    // 日本の電話番号パターン
    const phonePattern = /^(0\d{1,4}-\d{1,4}-\d{4}|\d{10,11})$/;
    
    if (!phonePattern.test(phoneStr)) {
      throw new Error('電話番号の形式が正しくありません');
    }
    
    return phoneStr;
  }

  /**
   * 選手ID検証
   * @param value 検証対象選手ID
   * @param required 必須かどうか
   * @returns 検証済み選手ID
   */
  public playerId(value: any, required = false): string {
    if (!required && (value === null || value === undefined || value === '')) {
      return '';
    }
    
    if (required) {
      this.required(value, '選手ID');
    }
    
    const idStr = String(value);
    // 選手IDの形式 (例: PL-2023-00001)
    const playerIdPattern = /^(PL|HS|UNI)-\d{4}-\d{5}$/;
    
    if (!playerIdPattern.test(idStr)) {
      throw new Error('選手IDは正しい形式で入力してください (例: PL-2023-00001)');
    }
    
    return idStr;
  }

  /**
   * 一般的な文字列のサニタイズ
   * @param value サニタイズ対象文字列
   * @returns サニタイズ済み文字列
   */
  public sanitize(value: string): string {
    if (typeof value !== 'string') {
      return '';
    }
    
    // 特殊文字をエスケープ
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * HTMLのサニタイズ
   * @param html サニタイズ対象HTML
   * @returns サニタイズ済みHTML
   * 
   * 危険なスクリプトやタグを除去し、XSS攻撃を防止します。
   * 
   * @example
   * ```typescript
   * const safeHtml = validator.sanitizeHtml(userSubmittedContent);
   * ```
   */
  public sanitizeHtml(html: string): string {
    if (typeof html !== 'string') {
      return '';
    }
    
    // 危険なスクリプトタグを除去
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }

  /**
   * SQL注入対策のサニタイズ
   * @param value サニタイズ対象値
   * @returns サニタイズ済み値
   */
  public sanitizeSql(value: string): string {
    if (typeof value !== 'string') {
      return '';
    }
    
    // SQL注入対策として一般的な特殊文字をエスケープ
    return value
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\x1a/g, '\\Z');
  }

  /**
   * 検証エラーを標準化して処理する
   * @param error 発生したエラー
   * @param fieldName フィールド名
   * @returns 標準化された検証エラー
   */
  public handleValidationError(error: any, fieldName = '不明'): ValidationError {
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      // エラータイプの推測
      let errorType = ValidationErrorType.OTHER;
      
      if (errorMessage.includes('必須')) {
        errorType = ValidationErrorType.REQUIRED;
      } else if (errorMessage.includes('形式')) {
        errorType = ValidationErrorType.FORMAT;
      } else if (errorMessage.includes('以上') || errorMessage.includes('以下') || 
                errorMessage.includes('未満') || errorMessage.includes('超える')) {
        errorType = ValidationErrorType.RANGE;
      } else if (errorMessage.includes('パターン') || errorMessage.includes('一致')) {
        errorType = ValidationErrorType.PATTERN;
      } else if (errorMessage.includes('危険') || errorMessage.includes('不正') || 
                errorMessage.includes('安全でない')) {
        errorType = ValidationErrorType.SECURITY;
      } else if (errorMessage.includes('タイプ') || errorMessage.includes('型')) {
        errorType = ValidationErrorType.TYPE_MISMATCH;
      }
      
      return {
        type: errorType,
        field: fieldName,
        message: errorMessage,
        details: error.stack
      };
    }
    
    // Error以外のエラーの場合
    return {
      type: ValidationErrorType.OTHER,
      field: fieldName,
      message: String(error)
    };
  }
}

// シングルトンインスタンス
const validator = Validator.getInstance();

// デフォルトエクスポート
export { validator };

