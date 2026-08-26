import React from 'react';
import { apiConfig } from '../config/apiConfig';
import { useLazyGetScrapingHistoryQuery } from '../store/apiSlice';
import type { ScrapingHistoryRecord } from '../types/player';
import log from '../utils/logger';

// 同時実行レコードをグループ化する関数
const groupConcurrentRecords = (records: ScrapingHistoryRecord[]): ScrapingHistoryRecord[] => {
  const grouped: ScrapingHistoryRecord[] = [];
  const groupWindow = 10000; // 10秒以内の実行をグループ化

  for (let i = 0; i < records.length; i++) {
    const current = records[i];
    const currentTime = new Date(current.timestamp).getTime();

    if (current.type === 'both') {
      grouped.push(current);
      continue;
    }

    const next = records[i + 1];
    if (
      next &&
      Math.abs(currentTime - new Date(next.timestamp).getTime()) <= groupWindow &&
      current.type !== next.type
    ) {
      const mergedResults = {
        ...current.results,
        ...next.results,
      };

      const highschoolDiff = mergedResults.highschool?.difference || 0;
      const universityDiff = mergedResults.university?.difference || 0;
      const correctTotalDifference = highschoolDiff + universityDiff;

      const mergedRecord: ScrapingHistoryRecord = {
        id: `${current.timestamp}_both`,
        timestamp: current.timestamp,
        type: 'both',
        environment: current.environment,
        duration: Math.max(current.duration, next.duration),
        results: mergedResults,
        summary: {
          totalCurrent: (current.summary?.totalCurrent || 0) + (next.summary?.totalCurrent || 0),
          totalPrevious: (current.summary?.totalPrevious || 0) + (next.summary?.totalPrevious || 0),
          totalDifference: correctTotalDifference,
        },
        triggeredBy: current.triggeredBy,
      };

      grouped.push(mergedRecord);
      i++;
    } else {
      grouped.push(current);
    }
  }

  return grouped;
};

// 前回実行時との差分を計算（年度を考慮）
const calculatePreviousDifference = (data: ScrapingHistoryRecord[]): ScrapingHistoryRecord[] => {
  const calculatedData = [...data];

  calculatedData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  for (let i = 0; i < calculatedData.length; i++) {
    const current = calculatedData[i];

    let previous: ScrapingHistoryRecord | null = null;
    for (let j = i + 1; j < calculatedData.length; j++) {
      const candidate = calculatedData[j];

      const currentYear = current.year || new Date(current.timestamp).getFullYear();
      const candidateYear = candidate.year || new Date(candidate.timestamp).getFullYear();
      if (currentYear !== candidateYear) {
        continue;
      }

      if (current.type === 'both' || candidate.type === 'both' || current.type === candidate.type) {
        previous = candidate;
        break;
      }
    }

    if (previous) {
      if (current.results.highschool && previous.results.highschool) {
        current.results.highschool.difference =
          current.results.highschool.currentCount - previous.results.highschool.currentCount;
      } else if (current.results.highschool && !previous.results.highschool) {
        current.results.highschool.difference = current.results.highschool.currentCount;
      }

      if (current.results.university && previous.results.university) {
        current.results.university.difference =
          current.results.university.currentCount - previous.results.university.currentCount;
      } else if (current.results.university && !previous.results.university) {
        current.results.university.difference = current.results.university.currentCount;
      }
    } else {
      if (current.results.highschool) {
        current.results.highschool.difference = current.results.highschool.currentCount;
      }
      if (current.results.university) {
        current.results.university.difference = current.results.university.currentCount;
      }
    }
  }

  return calculatedData;
};

// フィルタータイプ
export type TypeFilter = 'all' | 'highschool' | 'university';
export type YearFilter = number | 'all';

// フックの戻り値型
export interface UseScrapingHistoryReturn {
  historyData: ScrapingHistoryRecord[];
  loading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  totalRecords: number;
  typeFilter: TypeFilter;
  yearFilter: YearFilter;
  availableYears: number[];
  currentEnvironment: string;
  loadHistoryData: (pageNum?: number) => Promise<void>;
  handlePageChange: (_event: unknown, newPage: number) => void;
  handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleTypeFilterChange: (
    _event: React.MouseEvent<HTMLElement>,
    newFilter: TypeFilter | null
  ) => void;
  handleYearFilterChange: (event: { target: { value: YearFilter } }) => void;
}

export const useScrapingHistory = (): UseScrapingHistoryReturn => {
  const [triggerGetHistory] = useLazyGetScrapingHistoryQuery();
  const currentEnvironment = apiConfig.baseURL.includes('/prod') ? 'prod' : 'dev';
  const [historyData, setHistoryData] = React.useState<ScrapingHistoryRecord[]>([]);
  const [allHistoryData, setAllHistoryData] = React.useState<ScrapingHistoryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [totalRecords, setTotalRecords] = React.useState(0);
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const [yearFilter, setYearFilter] = React.useState<YearFilter>('all');
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);

  const loadHistoryData = React.useCallback(
    async (pageNum: number = 0) => {
      try {
        setLoading(true);
        setError(null);

        const offset = pageNum * rowsPerPage;
        const response = await triggerGetHistory({
          environment: currentEnvironment as 'dev' | 'prod',
          limit: Math.max(rowsPerPage * 3, 50),
          offset: Math.max(0, offset - rowsPerPage),
        }).unwrap();

        const groupedData = groupConcurrentRecords(response.data);
        const dataWithDifference = calculatePreviousDifference(groupedData);

        const startIndex = offset > 0 ? rowsPerPage : 0;
        const endIndex = startIndex + rowsPerPage;
        const pagedData = dataWithDifference.slice(startIndex, endIndex);

        setAllHistoryData(pagedData);
        setHistoryData(pagedData);
        setTotalRecords(response.metadata.total);

        log.info('履歴データ取得完了:', {
          environment: currentEnvironment,
          records: response.data.length,
          groupedRecords: groupedData.length,
          pagedRecords: pagedData.length,
          total: response.metadata.total,
        });
      } catch (err) {
        const error = err as Error;
        log.error('履歴データ取得エラー:', error);
        setError(`履歴データの取得に失敗しました: ${error.message}`);
        setHistoryData([]);
        setTotalRecords(0);
      } finally {
        setLoading(false);
      }
    },
    [triggerGetHistory, rowsPerPage, currentEnvironment]
  );

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    loadHistoryData(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    loadHistoryData(0);
  };

  const handleTypeFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newFilter: TypeFilter | null
  ) => {
    if (newFilter !== null) {
      setTypeFilter(newFilter);
    }
  };

  const handleYearFilterChange = (event: { target: { value: YearFilter } }) => {
    setYearFilter(event.target.value);
  };

  // 利用可能な年度を抽出
  React.useEffect(() => {
    const years = new Set<number>();
    allHistoryData.forEach(record => {
      if (record.year) {
        years.add(record.year);
      }
    });
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    setAvailableYears(sortedYears);
  }, [allHistoryData]);

  // フィルター適用
  React.useEffect(() => {
    let filtered = [...allHistoryData];

    if (yearFilter !== 'all') {
      filtered = filtered.filter(record => record.year === yearFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(record => {
        if (typeFilter === 'highschool') {
          return record.type === 'highschool' || record.type === 'both';
        } else if (typeFilter === 'university') {
          return record.type === 'university' || record.type === 'both';
        }
        return true;
      });
    }

    setHistoryData(filtered);
  }, [typeFilter, yearFilter, allHistoryData]);

  // 初回ロード
  React.useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  return {
    historyData,
    loading,
    error,
    page,
    rowsPerPage,
    totalRecords,
    typeFilter,
    yearFilter,
    availableYears,
    currentEnvironment,
    loadHistoryData,
    handlePageChange,
    handleRowsPerPageChange,
    handleTypeFilterChange,
    handleYearFilterChange,
  };
};
