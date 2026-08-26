import React from 'react';
import { useGetPlayersQuery } from '../store/apiSlice';
import type { PlayerData } from '../types/player';

export interface SchoolStats {
  name: string;
  playerCount: number;
  highschoolCount: number;
  universityCount: number;
  players: PlayerData[];
}

export interface UseSchoolManagementReturn {
  schoolStats: SchoolStats[];
  filteredSchools: SchoolStats[];
  paginatedSchools: SchoolStats[];
  isLoading: boolean;
  hasError: boolean;
  page: number;
  rowsPerPage: number;
  searchQuery: string;
  selectedSchool: SchoolStats | null;
  dialogOpen: boolean;
  tabValue: number;
  setPage: (page: number) => void;
  setRowsPerPage: (rows: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedSchool: (school: SchoolStats | null) => void;
  setDialogOpen: (open: boolean) => void;
  setTabValue: (value: number) => void;
  handleChangePage: (_event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSchoolClick: (school: SchoolStats) => void;
  handleExport: () => void;
  refetchPlayers: () => void;
}

export const useSchoolManagement = (): UseSchoolManagementReturn => {
  const { data: playersData, isLoading: playersLoading, error: playersError, refetch: refetchPlayers } = useGetPlayersQuery();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [selectedSchool, setSelectedSchool] = React.useState<SchoolStats | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [tabValue, setTabValue] = React.useState(0);

  // 学校別統計データの計算
  const schoolStats = React.useMemo(() => {
    if (!playersData?.data) return [];
    
    const schoolMap = new Map<string, SchoolStats>();
    
    playersData.data.forEach(player => {
      const schoolName = player.school;
      if (!schoolMap.has(schoolName)) {
        schoolMap.set(schoolName, {
          name: schoolName,
          playerCount: 0,
          highschoolCount: 0,
          universityCount: 0,
          players: [],
        });
      }
      
      const school = schoolMap.get(schoolName)!;
      school.playerCount++;
      school.players.push(player);
      
      if (player.type === 'highschool' || player.id.includes('highschool')) {
        school.highschoolCount++;
      } else if (player.type === 'university' || player.id.includes('university')) {
        school.universityCount++;
      }
    });
    
    return Array.from(schoolMap.values()).sort((a, b) => b.playerCount - a.playerCount);
  }, [playersData]);

  // 検索フィルタリング
  const filteredSchools = React.useMemo(() => {
    if (searchQuery === '') return schoolStats;
    return schoolStats.filter(school => 
      school.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [schoolStats, searchQuery]);

  // ページネーション処理
  const paginatedSchools = React.useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredSchools.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredSchools, page, rowsPerPage]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSchoolClick = (school: SchoolStats) => {
    setSelectedSchool(school);
    setDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredSchools.length) return;
    
    const csv = [
      ['学校名', '総選手数', '高校生', '大学生'],
      ...filteredSchools.map(school => [
        school.name,
        school.playerCount.toString(),
        school.highschoolCount.toString(),
        school.universityCount.toString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `schools_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    schoolStats,
    filteredSchools,
    paginatedSchools,
    isLoading: playersLoading,
    hasError: !!playersError,
    page,
    rowsPerPage,
    searchQuery,
    selectedSchool,
    dialogOpen,
    tabValue,
    setPage,
    setRowsPerPage,
    setSearchQuery,
    setSelectedSchool,
    setDialogOpen,
    setTabValue,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSchoolClick,
    handleExport,
    refetchPlayers,
  };
};
