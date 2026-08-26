import React from 'react';
import {
  useLazyGetHighschoolPlayersQuery,
  useLazyGetUniversityPlayersQuery,
} from '../store/apiSlice';
import { apiConfig } from '../config/apiConfig';
import type { PlayerData } from '../types/player';
import log from '../utils/logger';

export interface FilterState {
  search: string;
  type: 'all' | 'highschool' | 'university';
}

export interface PlayerStats {
  total: number;
  highschool: number;
  university: number;
  topPrefecture: string;
  topSchool: string;
  schools: number;
}

export interface UsePlayerManagementReturn {
  players: PlayerData[];
  filteredPlayers: PlayerData[];
  paginatedPlayers: PlayerData[];
  stats: PlayerStats;
  isLoading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  filters: FilterState;
  selectedPlayer: PlayerData | null;
  dialogOpen: boolean;
  setPage: (page: number) => void;
  setFilters: (filters: FilterState) => void;
  setSelectedPlayer: (player: PlayerData | null) => void;
  setDialogOpen: (open: boolean) => void;
  handleChangePage: (_event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleFilterChange: (key: keyof FilterState, value: string) => void;
  handlePlayerClick: (player: PlayerData) => void;
  handleExport: () => void;
  refetch: () => void;
}

export const usePlayerManagement = (): UsePlayerManagementReturn => {
  const [triggerHighschool] = useLazyGetHighschoolPlayersQuery();
  const [triggerUniversity] = useLazyGetUniversityPlayersQuery();
  const [players, setPlayers] = React.useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [selectedPlayer, setSelectedPlayer] = React.useState<PlayerData | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterState>({
    search: '',
    type: 'all',
  });

  const loadAllPlayersData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (apiConfig.useProductionData) {
        log.info('AWS APIから全選手データを取得中...');
        const [highschoolPlayers, universityPlayers] = await Promise.all([
          triggerHighschool().unwrap(),
          triggerUniversity().unwrap(),
        ]);

        const allPlayers = [...highschoolPlayers.data, ...universityPlayers.data];
        setPlayers(allPlayers);
      } else {
        log.info('本番データが無効なため、空のデータセットを使用');
        setPlayers([]);
      }
    } catch (err) {
      log.error('選手管理データの取得に失敗:', err);
      setError('データの取得に失敗しました。');
      setPlayers([]);
    } finally {
      setIsLoading(false);
    }
  }, [triggerHighschool, triggerUniversity]);

  React.useEffect(() => {
    loadAllPlayersData();
  }, [loadAllPlayersData]);

  const filteredPlayers = React.useMemo(() => {
    return players.filter(player => {
      const matchesSearch =
        filters.search === '' ||
        player.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        player.school.toLowerCase().includes(filters.search.toLowerCase());

      const matchesType =
        filters.type === 'all' ||
        (filters.type === 'highschool' &&
          (player.type === 'highschool' || player.id.includes('highschool'))) ||
        (filters.type === 'university' &&
          (player.type === 'university' || player.id.includes('university')));

      return matchesSearch && matchesType;
    });
  }, [players, filters]);

  const paginatedPlayers = React.useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredPlayers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredPlayers, page, rowsPerPage]);

  const stats = React.useMemo(() => {
    const prefectureCounts: Record<string, number> = {};
    const schoolCounts: Record<string, number> = {};

    filteredPlayers.forEach(player => {
      if (player.prefecture) {
        prefectureCounts[player.prefecture] = (prefectureCounts[player.prefecture] || 0) + 1;
      }
      if (player.school) {
        schoolCounts[player.school] = (schoolCounts[player.school] || 0) + 1;
      }
    });

    const getTopEntry = (counts: Record<string, number>) => {
      const entries = Object.entries(counts);
      if (entries.length === 0) return 'データなし';
      const sorted = entries.sort(([, a], [, b]) => b - a);
      return `${sorted[0][0]} (${sorted[0][1]}名)`;
    };

    return {
      total: filteredPlayers.length,
      highschool: filteredPlayers.filter(
        p => p.type === 'highschool' || p.id.includes('highschool')
      ).length,
      university: filteredPlayers.filter(
        p => p.type === 'university' || p.id.includes('university')
      ).length,
      topPrefecture: getTopEntry(prefectureCounts),
      topSchool: getTopEntry(schoolCounts),
      schools: Object.keys(schoolCounts).length,
    };
  }, [filteredPlayers]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handlePlayerClick = (player: PlayerData) => {
    setSelectedPlayer(player);
    setDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredPlayers.length) return;

    const csv = [
      ['ID', '氏名', '学校', '区分', '都道府県・地域', '登録日'],
      ...filteredPlayers.map(player => [
        player.id,
        player.name,
        player.school,
        player.type === 'highschool' || player.id.includes('highschool') ? '高校' : '大学',
        player.prefecture || player.region || 'N/A',
        player.filingDate ? new Date(player.filingDate).toLocaleDateString('ja-JP') : 'N/A',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `players_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    players,
    filteredPlayers,
    paginatedPlayers,
    stats,
    isLoading,
    error,
    page,
    rowsPerPage,
    filters,
    selectedPlayer,
    dialogOpen,
    setPage,
    setFilters,
    setSelectedPlayer,
    setDialogOpen,
    handleChangePage,
    handleChangeRowsPerPage,
    handleFilterChange,
    handlePlayerClick,
    handleExport,
    refetch: loadAllPlayersData,
  };
};
