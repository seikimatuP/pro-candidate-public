import * as monitoring from '../monitoring-helper';
import { log } from '../logger';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; DataScraper/1.0; AWS Lambda; +mailto:yuta.nozue@gmail.com)';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_REQUEST_INTERVAL_MS = 1_000;
const DEFAULT_RETRY_BASE_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

export interface FetchHtmlOptions {
  timeout?: number;
  retryCount?: number;
  delayBetweenRequests?: number;
  retryBaseDelay?: number;
  userAgent?: string;
}

class HttpFetchError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'HttpFetchError';
  }
}

const sleep = (milliseconds: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

// 同じ Lambda コンテナ内で高校・大学を並列処理しても、HTTP 要求の開始時刻を
// 最低間隔だけ離す。Promise の鎖で予約処理を直列化し、fetch 自体は占有しない。
let requestReservation = Promise.resolve();
let nextRequestAt = 0;

const reserveRequestSlot = async (minimumIntervalMs: number): Promise<void> => {
  let release!: () => void;
  const previousReservation = requestReservation;
  requestReservation = new Promise<void>(resolve => {
    release = resolve;
  });

  await previousReservation;
  try {
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs > 0) await sleep(waitMs);
    nextRequestAt = Date.now() + minimumIntervalMs;
  } finally {
    release();
  }
};

/** テスト間でモジュール内の要求予約状態を持ち越さないためのリセット。 */
export const resetFetchScheduleForTests = (): void => {
  requestReservation = Promise.resolve();
  nextRequestAt = 0;
};

const clampNonNegative = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, MAX_RETRY_DELAY_MS);
  }

  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    return Math.min(Math.max(0, date - Date.now()), MAX_RETRY_DELAY_MS);
  }

  return undefined;
};

const isRetryableStatus = (status: number): boolean =>
  status === 408 || status === 425 || status === 429 || status >= 500;

const fetchWithTimeout = async (
  url: string,
  timeoutMs: number,
  userAgent: string
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await globalThis.fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export async function fetchHtml(url: string, options: FetchHtmlOptions = {}): Promise<string> {
  const startedAt = Date.now();
  const timeoutMs = clampNonNegative(options.timeout, DEFAULT_TIMEOUT_MS);
  const retryCount = Math.floor(clampNonNegative(options.retryCount, DEFAULT_RETRY_COUNT));
  const requestIntervalMs = clampNonNegative(
    options.delayBetweenRequests,
    DEFAULT_REQUEST_INTERVAL_MS
  );
  const retryBaseDelayMs = clampNonNegative(options.retryBaseDelay, DEFAULT_RETRY_BASE_DELAY_MS);
  const userAgent = options.userAgent?.trim() || process.env.USER_AGENT || DEFAULT_USER_AGENT;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    await reserveRequestSlot(requestIntervalMs);
    const attemptStartedAt = Date.now();

    let response: Response;
    try {
      response = await fetchWithTimeout(url, timeoutMs, userAgent);
    } catch (error) {
      const elapsed = Date.now() - attemptStartedAt;
      await monitoring.recordApiCall(url, 500, elapsed);

      if (attempt >= retryCount) {
        log.error(`HTML取得エラー (${url}, ${attempt + 1}回目):`, error);
        throw error;
      }

      const retryDelay = Math.min(retryBaseDelayMs * 2 ** attempt, MAX_RETRY_DELAY_MS);
      log.warn(`HTML取得を再試行します (${attempt + 1}/${retryCount}, ${retryDelay}ms後)`, {
        url,
        error,
      });
      if (retryDelay > 0) await sleep(retryDelay);
      continue;
    }

    const responseTime = Date.now() - attemptStartedAt;
    await monitoring.recordApiCall(url, response.status, responseTime);

    if (!response.ok) {
      const message =
        response.status === 404
          ? '404: データがまだ公開されていません'
          : `HTTP Error: ${response.status} - ${response.statusText}`;
      const error = new HttpFetchError(
        message,
        isRetryableStatus(response.status),
        parseRetryAfter(response.headers.get('Retry-After'))
      );

      if (!error.retryable || attempt >= retryCount) {
        log.error(`HTML取得エラー (${url}, HTTP ${response.status}):`, error);
        throw error;
      }

      const retryDelay =
        error.retryAfterMs ?? Math.min(retryBaseDelayMs * 2 ** attempt, MAX_RETRY_DELAY_MS);
      log.warn(
        `HTTP ${response.status} のため再試行します (${attempt + 1}/${retryCount}, ${retryDelay}ms後)`,
        { url }
      );
      if (retryDelay > 0) await sleep(retryDelay);
      continue;
    }

    const html = await response.text();
    log.info(`HTML取得成功: ${html.length} バイト`, {
      attempts: attempt + 1,
      totalElapsedMs: Date.now() - startedAt,
    });
    return html;
  }

  throw new Error('HTML取得の再試行回数を超過しました');
}
