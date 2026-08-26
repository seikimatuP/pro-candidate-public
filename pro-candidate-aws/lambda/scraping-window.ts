/**
 * スクレイピング定期実行の稼働期間（実行ウィンドウ）
 *
 * 志望届の公示はシーズンが限られるため、定期実行を通年で回す必要がない。
 * EventBridge は平日 17:30 JST に毎週発火させたうえで、実行側で
 * 「今日が稼働期間内か」を判定し、期間外なら何もせずスキップする。
 *
 * 期間はコード変更なしで差し替えられるよう SSM Parameter Store に置く。
 * パラメータ名は `/pro-candidate/{stage}/scraping-schedule-period`、値は JSON。
 *
 * ```json
 * { "start": "2026-09-01", "end": "2026-09-30" }
 * ```
 *
 * 期間を変えるときは以下のコマンドだけで済む（デプロイ不要）。
 *
 * ```bash
 * aws ssm put-parameter --overwrite \
 *   --name /pro-candidate/prod/scraping-schedule-period \
 *   --type String \
 *   --value '{"start":"2026-09-01","end":"2026-10-31"}'
 * ```
 *
 * 判定方針:
 *
 * - 未設定・空文字・不正な値はすべて「期間外」として**スキップする**（安全側）。
 *   設定ミスで意図せず通年スクレイピングが走るより、走らないほうが害が小さい。
 * - start / end はどちらも JST の日付で、**両端を含む**（9/1〜9/30 なら 9/30 も実行する）。
 * - 判定は JST の暦日で行う。Lambda の実行環境は UTC のため、UTC のまま日付を取ると
 *   17:30 JST（08:30 UTC）は同じ日付になるものの、期間端の扱いを取り違えやすい。
 *   明示的に JST へ寄せてから比較する。
 */
import { log } from './logger';

/** 稼働期間の設定値 */
export interface ScrapingPeriod {
  /** 開始日（JST・YYYY-MM-DD・当日を含む） */
  start: string;
  /** 終了日（JST・YYYY-MM-DD・当日を含む） */
  end: string;
}

/** 期間判定の結果 */
export interface ScrapingWindowDecision {
  /** 実行してよいか */
  shouldRun: boolean;
  /** スキップ・実行の理由（ログ用） */
  reason: string;
  /** 判定に使った JST の日付（YYYY-MM-DD） */
  today: string;
  /** 判定に使った期間（未設定なら null） */
  period: ScrapingPeriod | null;
}

/** SSM パラメータ名を組み立てる */
export function buildPeriodParameterName(stage: string): string {
  return `/pro-candidate/${stage}/scraping-schedule-period`;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * YYYY-MM-DD が実在する日付かどうか
 *
 * `2026-02-30` のような桁は合っているが存在しない日付を弾く。
 */
function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/**
 * SSM から読んだ生文字列を期間設定へ変換する
 *
 * 未設定・空・JSON として壊れている・日付形式が不正・start > end の場合は null を返す。
 * null は呼び出し側で「期間外（スキップ）」として扱う。
 */
export function parseScrapingPeriod(raw: string | null | undefined): ScrapingPeriod | null {
  if (!raw || raw.trim() === '') {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const { start, end } = parsed as Record<string, unknown>;
  if (typeof start !== 'string' || typeof end !== 'string') {
    return null;
  }
  if (!isRealDate(start) || !isRealDate(end)) {
    return null;
  }
  // 文字列比較で足りる（YYYY-MM-DD は辞書順＝日付順）
  if (start > end) {
    return null;
  }

  return { start, end };
}

/**
 * 指定時刻を JST の暦日（YYYY-MM-DD）に変換する
 */
export function toJstDateString(now: Date): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jst.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 今日が稼働期間内かどうかを判定する（純粋関数・テスト対象）
 */
export function decideScrapingWindow(
  period: ScrapingPeriod | null,
  now: Date = new Date()
): ScrapingWindowDecision {
  const today = toJstDateString(now);

  if (period === null) {
    return {
      shouldRun: false,
      reason: '稼働期間が未設定または不正なためスキップしました',
      today,
      period: null,
    };
  }

  // YYYY-MM-DD は辞書順が日付順なので文字列比較で判定できる（両端を含む）
  if (today < period.start) {
    return {
      shouldRun: false,
      reason: '稼働期間の開始前のためスキップしました',
      today,
      period,
    };
  }
  if (today > period.end) {
    return {
      shouldRun: false,
      reason: '稼働期間の終了後のためスキップしました',
      today,
      period,
    };
  }

  return {
    shouldRun: true,
    reason: '稼働期間内です',
    today,
    period,
  };
}

/** SSM 読み取り関数の型（テストから差し替えられるようにする） */
type ParameterReader = (name: string) => Promise<string | null>;

/**
 * SSM から稼働期間を読んで判定する
 *
 * SSM の読み取りに失敗した場合も「期間外」として扱う。定期実行は止まっても
 * 手動実行で取り返せる一方、意図しない期間に外部サイトへアクセスするほうが害が大きい。
 */
export async function evaluateScrapingWindow(
  stage: string,
  readParameter: ParameterReader,
  now: Date = new Date()
): Promise<ScrapingWindowDecision> {
  const parameterName = buildPeriodParameterName(stage);

  let raw: string | null = null;
  try {
    raw = await readParameter(parameterName);
  } catch (error) {
    log.error(`稼働期間の取得に失敗しました: ${parameterName}`, error);
    return {
      shouldRun: false,
      reason: '稼働期間の取得に失敗したためスキップしました',
      today: toJstDateString(now),
      period: null,
    };
  }

  return decideScrapingWindow(parseScrapingPeriod(raw), now);
}
