import { useMemo } from 'react';
import type { PlayerData } from '../../../types/player';

export interface SchoolStats {
  school: string;
  totalPlayers: number;
  highschoolCount: number;
  universityCount: number;
  yearlyData: Record<number, number>;
  prefecture: string;
  latestYear: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface YearComparison {
  year: number;
  totalPlayers: number;
  topSchools: Array<{
    school: string;
    count: number;
    percentage: number;
  }>;
  prefectureStats: Record<string, number>;
}

export const useSchoolStats = (playersData: PlayerData[]) => {
  // 利用可能年度の計算
  const availableYears = useMemo(() => {
    if (playersData.length === 0) return [];

    const years = new Set<number>();
    playersData.forEach(player => {
      if (player.filingDate) {
        const year = new Date(player.filingDate).getFullYear();
        years.add(year);
      } else {
        years.add(new Date().getFullYear());
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [playersData]);

  // 学校別統計の計算
  const schoolStats = useMemo(() => {
    if (playersData.length === 0) return [];

    const statsMap = new Map<string, SchoolStats>();

    playersData.forEach(player => {
      const school = player.school || '不明';
      const year = player.filingDate ? new Date(player.filingDate).getFullYear() : new Date().getFullYear();
      const prefecture = player.prefecture || '不明';

      if (!statsMap.has(school)) {
        statsMap.set(school, {
          school,
          totalPlayers: 0,
          highschoolCount: 0,
          universityCount: 0,
          yearlyData: {},
          prefecture,
          latestYear: year,
          trend: 'stable' as const,
          trendPercentage: 0,
        });
      }

      const stats = statsMap.get(school)!;
      stats.totalPlayers++;

      if (player.type === 'highschool' || player.id.includes('highschool')) {
        stats.highschoolCount++;
      } else {
        stats.universityCount++;
      }

      stats.yearlyData[year] = (stats.yearlyData[year] || 0) + 1;
      stats.latestYear = Math.max(stats.latestYear, year);
    });

    // トレンド計算
    statsMap.forEach(stats => {
      const years = Object.keys(stats.yearlyData).map(Number).sort();
      if (years.length >= 2) {
        const lastYear = years[years.length - 1];
        const prevYear = years[years.length - 2];
        const lastCount = stats.yearlyData[lastYear] || 0;
        const prevCount = stats.yearlyData[prevYear] || 0;

        if (prevCount > 0) {
          const change = ((lastCount - prevCount) / prevCount) * 100;
          stats.trendPercentage = Math.abs(change);

          if (change > 5) stats.trend = 'up';
          else if (change < -5) stats.trend = 'down';
          else stats.trend = 'stable';
        }
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalPlayers - a.totalPlayers);
  }, [playersData]);

  // 年度別比較データ
  const yearComparisons = useMemo(() => {
    const comparisons: YearComparison[] = [];

    availableYears.forEach(year => {
      const yearPlayers = playersData.filter(player => {
        const playerYear = player.filingDate ? new Date(player.filingDate).getFullYear() : new Date().getFullYear();
        return playerYear === year;
      });

      const schoolCounts = new Map<string, number>();
      const prefectureCounts = new Map<string, number>();

      yearPlayers.forEach(player => {
        const school = player.school || '不明';
        const prefecture = player.prefecture || '不明';

        schoolCounts.set(school, (schoolCounts.get(school) || 0) + 1);
        prefectureCounts.set(prefecture, (prefectureCounts.get(prefecture) || 0) + 1);
      });

      const topSchools = Array.from(schoolCounts.entries())
        .map(([school, count]) => ({
          school,
          count,
          percentage: (count / yearPlayers.length) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      comparisons.push({
        year,
        totalPlayers: yearPlayers.length,
        topSchools,
        prefectureStats: Object.fromEntries(prefectureCounts),
      });
    });

    return comparisons.sort((a, b) => b.year - a.year);
  }, [playersData, availableYears]);

  return { availableYears, schoolStats, yearComparisons };
};
