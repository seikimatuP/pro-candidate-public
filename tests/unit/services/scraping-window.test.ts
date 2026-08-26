import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  buildPeriodParameterName,
  decideScrapingWindow,
  evaluateScrapingWindow,
  parseScrapingPeriod,
  toJstDateString,
} from '../../../pro-candidate-aws/lambda/scraping-window';

const mockLog = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
vi.mock('../../../pro-candidate-aws/lambda/logger', () => ({
  log: {
    debug: (...args: unknown[]) => mockLog.debug(...args),
    info: (...args: unknown[]) => mockLog.info(...args),
    warn: (...args: unknown[]) => mockLog.warn(...args),
    error: (...args: unknown[]) => mockLog.error(...args),
  },
}));

/** 平日17:30 JST に相当するUTC時刻（08:30 UTC）を作る */
const at1730Jst = (isoDate: string) => new Date(`${isoDate}T08:30:00.000Z`);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildPeriodParameterName', () => {
  test('stage ごとにパラメータ名を組み立てる', () => {
    expect(buildPeriodParameterName('prod')).toBe('/pro-candidate/prod/scraping-schedule-period');
    expect(buildPeriodParameterName('dev')).toBe('/pro-candidate/dev/scraping-schedule-period');
  });
});

describe('toJstDateString', () => {
  test('UTCの時刻をJSTの暦日に変換する', () => {
    // 08:30 UTC = 17:30 JST（同日）
    expect(toJstDateString(new Date('2026-09-01T08:30:00.000Z'))).toBe('2026-09-01');
  });

  test('UTCで前日の深夜でもJSTでは翌日になる', () => {
    // 2026-08-31 23:00 UTC = 2026-09-01 08:00 JST
    expect(toJstDateString(new Date('2026-08-31T23:00:00.000Z'))).toBe('2026-09-01');
  });

  test('JSTの日付が1桁でもゼロ埋めする', () => {
    expect(toJstDateString(new Date('2026-09-04T08:30:00.000Z'))).toBe('2026-09-04');
  });
});

describe('parseScrapingPeriod', () => {
  test('正しいJSONを期間として読み取る', () => {
    expect(parseScrapingPeriod('{"start":"2026-09-01","end":"2026-09-30"}')).toEqual({
      start: '2026-09-01',
      end: '2026-09-30',
    });
  });

  test('開始日と終了日が同じ1日だけの期間も受け付ける', () => {
    expect(parseScrapingPeriod('{"start":"2026-09-01","end":"2026-09-01"}')).toEqual({
      start: '2026-09-01',
      end: '2026-09-01',
    });
  });

  test.each([
    ['未設定（null）', null],
    ['未設定（undefined）', undefined],
    ['空文字', ''],
    ['空白のみ', '   '],
    ['JSONとして壊れている', '{start:2026-09-01}'],
    ['オブジェクトではない', '"2026-09-01"'],
    ['startが空', '{"start":"","end":"2026-09-30"}'],
    ['endが空', '{"start":"2026-09-01","end":""}'],
    ['startとendが両方空（CDKの初期値）', '{"start":"","end":""}'],
    ['キーが足りない', '{"start":"2026-09-01"}'],
    ['日付形式が不正', '{"start":"2026/09/01","end":"2026/09/30"}'],
    ['存在しない日付', '{"start":"2026-02-30","end":"2026-03-31"}'],
    ['開始日が終了日より後', '{"start":"2026-09-30","end":"2026-09-01"}'],
    ['型が文字列ではない', '{"start":20260901,"end":20260930}'],
  ])('%s は null を返す', (_label, raw) => {
    expect(parseScrapingPeriod(raw as string | null | undefined)).toBeNull();
  });
});

describe('decideScrapingWindow', () => {
  const period = { start: '2026-09-01', end: '2026-09-30' };

  test('期間内なら実行する', () => {
    const decision = decideScrapingWindow(period, at1730Jst('2026-09-15'));
    expect(decision.shouldRun).toBe(true);
    expect(decision.today).toBe('2026-09-15');
    expect(decision.period).toEqual(period);
  });

  test('開始日当日は実行する（両端を含む）', () => {
    expect(decideScrapingWindow(period, at1730Jst('2026-09-01')).shouldRun).toBe(true);
  });

  test('終了日当日は実行する（両端を含む）', () => {
    expect(decideScrapingWindow(period, at1730Jst('2026-09-30')).shouldRun).toBe(true);
  });

  test('開始日の前日はスキップする', () => {
    const decision = decideScrapingWindow(period, at1730Jst('2026-08-31'));
    expect(decision.shouldRun).toBe(false);
    expect(decision.reason).toContain('開始前');
  });

  test('終了日の翌日はスキップする', () => {
    const decision = decideScrapingWindow(period, at1730Jst('2026-10-01'));
    expect(decision.shouldRun).toBe(false);
    expect(decision.reason).toContain('終了後');
  });

  test('期間が未設定ならスキップする', () => {
    const decision = decideScrapingWindow(null, at1730Jst('2026-09-15'));
    expect(decision.shouldRun).toBe(false);
    expect(decision.reason).toContain('未設定');
    expect(decision.period).toBeNull();
  });

  test('JSTで日付が変わる境界でも期間内と判定する', () => {
    // 2026-08-31 23:00 UTC = 2026-09-01 08:00 JST（開始日当日）
    const decision = decideScrapingWindow(period, new Date('2026-08-31T23:00:00.000Z'));
    expect(decision.today).toBe('2026-09-01');
    expect(decision.shouldRun).toBe(true);
  });

  test('年をまたぐ期間も扱える', () => {
    const acrossYear = { start: '2026-12-20', end: '2027-01-10' };
    expect(decideScrapingWindow(acrossYear, at1730Jst('2026-12-31')).shouldRun).toBe(true);
    expect(decideScrapingWindow(acrossYear, at1730Jst('2027-01-05')).shouldRun).toBe(true);
    expect(decideScrapingWindow(acrossYear, at1730Jst('2027-01-11')).shouldRun).toBe(false);
  });
});

describe('evaluateScrapingWindow', () => {
  test('SSMの値が期間内なら実行する', async () => {
    const reader = vi.fn().mockResolvedValue('{"start":"2026-09-01","end":"2026-09-30"}');

    const decision = await evaluateScrapingWindow('prod', reader, at1730Jst('2026-09-15'));

    expect(reader).toHaveBeenCalledWith('/pro-candidate/prod/scraping-schedule-period');
    expect(decision.shouldRun).toBe(true);
  });

  test('SSMが未設定（null）ならスキップする', async () => {
    const reader = vi.fn().mockResolvedValue(null);

    const decision = await evaluateScrapingWindow('prod', reader, at1730Jst('2026-09-15'));

    expect(decision.shouldRun).toBe(false);
    expect(decision.period).toBeNull();
  });

  test('CDKの初期値（start/endが空）ならスキップする', async () => {
    const reader = vi.fn().mockResolvedValue('{"start":"","end":""}');

    const decision = await evaluateScrapingWindow('prod', reader, at1730Jst('2026-09-15'));

    expect(decision.shouldRun).toBe(false);
  });

  test('SSMの取得に失敗したらスキップする（安全側に倒す）', async () => {
    const reader = vi.fn().mockRejectedValue(new Error('AccessDenied'));

    const decision = await evaluateScrapingWindow('prod', reader, at1730Jst('2026-09-15'));

    expect(decision.shouldRun).toBe(false);
    expect(decision.reason).toContain('取得に失敗');
    expect(mockLog.error).toHaveBeenCalled();
  });

  test('期間外ならスキップする', async () => {
    const reader = vi.fn().mockResolvedValue('{"start":"2026-09-01","end":"2026-09-30"}');

    const decision = await evaluateScrapingWindow('prod', reader, at1730Jst('2026-11-01'));

    expect(decision.shouldRun).toBe(false);
    expect(decision.reason).toContain('終了後');
  });
});
