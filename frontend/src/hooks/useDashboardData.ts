import { useMemo } from 'react';
import { useGetStatisticsQuery } from '../store/apiSlice';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 日次グラフに表示するカレンダー日数（末尾が最新届出日） */
const TREND_WINDOW_DAYS = 14;
/** ヘッダーの「最新7日間」の集計に使うカレンダー日数 */
const RECENT_WINDOW_DAYS = 7;
/** 異常な届出日が混じったときに日付範囲が際限なく伸びるのを防ぐ上限 */
const MAX_TREND_DAYS = 400;

/** `YYYY-MM-DD` 形式かどうか */
const isDateKey = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

export function useDashboardData() {
  const {
    data: statisticsResponse,
    isLoading: loading,
    isError,
    refetch: fetchData,
  } = useGetStatisticsQuery();
  const statistics = statisticsResponse?.data;

  /**
   * API が返す集計対象年度。フロント側で `new Date().getFullYear()` を使うと、
   * API 側の対象年度（`year` クエリ既定値）とずれて誤った年度を表示するため、
   * 必ずレスポンスの値を使う。取得できないときは null（＝年度を表示しない）。
   */
  const dataYear = useMemo(() => {
    const year = statistics?.year;
    return typeof year === 'number' && Number.isFinite(year) ? year : null;
  }, [statistics?.year]);

  /** 集計対象データ（S3 上の年度別ファイル）が最後に更新された時刻。取得できないときは null */
  const dataUpdatedAt = useMemo(() => {
    const lastUpdated = statistics?.lastUpdated;
    return typeof lastUpdated === 'string' && lastUpdated ? lastUpdated : null;
  }, [statistics?.lastUpdated]);

  const stats = useMemo(() => {
    const highschool = statistics?.byType.highschool ?? 0;
    const university = statistics?.byType.university ?? 0;
    return { total: statistics?.totalPlayers ?? 0, highschool, university };
  }, [statistics]);

  const prefectureStats = useMemo(() => {
    const sorted = Object.entries(statistics?.byPrefecture ?? {})
      .sort(([, a], [, b]) => b - a)
      .map(([prefecture, count]) => ({ prefecture, count }));
    return { list: sorted, unresolvedCount: statistics?.unresolvedPrefectureCount ?? 0 };
  }, [statistics]);

  /**
   * 日次の届出数。届出のあった日だけを並べると、間隔が一定でない棒グラフになり
   * 「毎日届出があった」ように読めてしまう。届出の無い日も 0 として埋め、
   * 棒の間隔＝時間の間隔が一致する連続したカレンダー日の系列にする。
   */
  const trendData = useMemo(() => {
    const dateMap = new Map(
      Object.entries(statistics?.byDate ?? {}).filter(([date]) => isDateKey(date))
    );
    if (dateMap.size === 0) return [];

    const keys = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));
    if (keys.length === 0) return [];

    const firstMs = Date.parse(`${keys[0]}T00:00:00Z`);
    const lastMs = Date.parse(`${keys[keys.length - 1]}T00:00:00Z`);
    if (Number.isNaN(firstMs) || Number.isNaN(lastMs)) return [];

    const startMs = Math.max(firstMs, lastMs - (MAX_TREND_DAYS - 1) * DAY_MS);
    const series: { date: string; highschool: number; university: number; total: number }[] = [];
    for (let ms = startMs; ms <= lastMs; ms += DAY_MS) {
      const date = new Date(ms).toISOString().slice(0, 10);
      const counts = dateMap.get(date) || { highschool: 0, university: 0 };
      series.push({
        date,
        highschool: counts.highschool,
        university: counts.university,
        total: counts.highschool + counts.university,
      });
    }
    return series;
  }, [statistics?.byDate]);

  const recentTrendData = useMemo(() => trendData.slice(-TREND_WINDOW_DAYS), [trendData]);

  /**
   * ヘッダー右のメタ情報。`recentDelta` は最新届出日を末日とする
   * カレンダー7日間の合計（届出の無い日も期間に含む）。
   */
  const heroMeta = useMemo(() => {
    if (trendData.length === 0) return { recentDelta: 0, latestDate: null as string | null };
    const lastDays = trendData.slice(-RECENT_WINDOW_DAYS);
    const recentDelta = lastDays.reduce((s, d) => s + d.total, 0);
    const latestDate = trendData[trendData.length - 1]?.date ?? null;
    return { recentDelta, latestDate };
  }, [trendData]);

  return {
    loading,
    isError,
    fetchData,
    dataYear,
    dataUpdatedAt,
    stats,
    prefectureStats,
    recentTrendData,
    heroMeta,
  };
}
