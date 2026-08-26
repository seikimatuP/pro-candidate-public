/**
 * DOMPurifyベースのHTMLサニタイズユーティリティ
 * XSS攻撃防止のための堅牢な入力サニタイズを提供
 *
 * v1.2.85: DOMPurify導入によるセキュリティ強化
 */

import DOMPurify from 'dompurify';

/**
 * サニタイズ設定オプション
 */
interface SanitizeOptions {
  /** HTMLタグを完全に除去するか（デフォルト: true） */
  stripAllTags?: boolean;
  /** 許可するHTMLタグ（stripAllTagsがfalseの場合） */
  allowedTags?: string[];
  /** 許可する属性 */
  allowedAttributes?: string[];
  /** リンクを許可するか */
  allowLinks?: boolean;
}

/**
 * DOMPurify設定型
 */
interface PurifyConfig {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  ALLOW_DATA_ATTR?: boolean;
  ALLOW_UNKNOWN_PROTOCOLS?: boolean;
  FORBID_TAGS?: string[];
  FORBID_ATTR?: string[];
  RETURN_TRUSTED_TYPE?: boolean;
}

/**
 * デフォルトのDOMPurify設定
 */
const DEFAULT_CONFIG: PurifyConfig = {
  ALLOWED_TAGS: [], // デフォルトは全タグ禁止
  ALLOWED_ATTR: [], // デフォルトは全属性禁止
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  RETURN_TRUSTED_TYPE: false,
};

/**
 * リッチテキスト許可時の設定
 */
const RICH_TEXT_CONFIG: PurifyConfig = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'span'],
  ALLOWED_ATTR: ['class'],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  RETURN_TRUSTED_TYPE: false,
};

/**
 * HTMLをサニタイズ（XSS攻撃防止）
 * @param input サニタイズする文字列
 * @param options サニタイズオプション
 * @returns サニタイズされた安全な文字列
 */
export function sanitizeHtml(input: unknown, options?: SanitizeOptions): string {
  if (typeof input !== 'string') {
    return '';
  }

  const config: PurifyConfig = options?.stripAllTags === false
    ? {
        ...RICH_TEXT_CONFIG,
        ...(options.allowedTags && { ALLOWED_TAGS: options.allowedTags }),
        ...(options.allowedAttributes && { ALLOWED_ATTR: options.allowedAttributes }),
      }
    : DEFAULT_CONFIG;

  const result = DOMPurify.sanitize(input, config);
  return typeof result === 'string' ? result : String(result);
}

/**
 * プレーンテキストとしてサニタイズ（全HTMLタグ除去）
 * @param input サニタイズする文字列
 * @returns プレーンテキスト
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  const result = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], RETURN_TRUSTED_TYPE: false });
  return typeof result === 'string' ? result : String(result);
}

/**
 * URLをサニタイズ（javascript:等の危険なプロトコル除去）
 * @param url サニタイズするURL
 * @returns 安全なURL、または空文字列
 */
export function sanitizeUrl(url: unknown): string {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  // 許可されたプロトコルのみ
  const allowedProtocols = ['http:', 'https:', 'mailto:'];
  try {
    const parsed = new URL(trimmed);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    return trimmed;
  } catch {
    // 相対URLの場合
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return trimmed;
    }
    return '';
  }
}

/**
 * フォーム入力をサニタイズ
 * @param input フォーム入力値
 * @param maxLength 最大文字数（デフォルト: 1000）
 * @returns サニタイズされた入力値
 */
export function sanitizeFormInput(input: unknown, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // HTMLタグを除去し、長さを制限
  const sanitized = sanitizeText(input);
  return sanitized.slice(0, maxLength).trim();
}

/**
 * 検索クエリをサニタイズ
 * @param query 検索クエリ
 * @returns サニタイズされたクエリ
 */
export function sanitizeSearchQuery(query: unknown): string {
  if (typeof query !== 'string') {
    return '';
  }

  // HTMLタグ除去、特殊文字エスケープ、長さ制限
  return sanitizeText(query)
    .replace(/[<>'"&]/g, '')
    .slice(0, 200)
    .trim();
}

/**
 * 数値入力をサニタイズ
 * @param input 数値入力
 * @param min 最小値
 * @param max 最大値
 * @param defaultValue デフォルト値
 * @returns サニタイズされた数値
 */
export function sanitizeNumber(
  input: unknown,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER,
  defaultValue: number = 0
): number {
  const num = typeof input === 'string' ? parseFloat(input) : input;

  if (typeof num !== 'number' || isNaN(num)) {
    return defaultValue;
  }

  return Math.min(Math.max(num, min), max);
}

/**
 * 年度入力をサニタイズ
 * @param year 年度
 * @returns サニタイズされた年度、または現在年度
 */
export function sanitizeYear(year: unknown): number {
  const currentYear = new Date().getFullYear();
  const minYear = 2000;
  const maxYear = currentYear + 1;

  return sanitizeNumber(year, minYear, maxYear, currentYear);
}

// デフォルトエクスポート
export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeFormInput,
  sanitizeSearchQuery,
  sanitizeNumber,
  sanitizeYear,
};
