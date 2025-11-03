import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  InputAdornment,
  Alert,
} from '@mui/material';
// Grid は Box ベースで実装する
import {
  Search,
  FilterList,
  Download,
  Refresh,
  School,
} from '@mui/icons-material';
import { PlayerTable } from '../components/tables/PlayerTable';
import { TrendChart } from '../components/charts/TrendChart';
import YearSelector from '../components/selectors/YearSelector';
import { apiService, apiConfig } from '../services/api';
import type { PlayerData, TrendData } from '../types/player';

interface FilterState {
  search: string;
  prefecture: string;
}

// 実際の選手データから増分チャート用データを生成
const generateTrendDataFromPlayers = (players: PlayerData[]): TrendData[] => {
  if (!players.length) return [];
  
  // 登録日でグループ化
  const dateGroups: Record<string, number> = {};
  
  players.forEach(player => {
    if (player.filingDate) {
      const date = new Date(player.filingDate).toISOString().split('T')[0];
      dateGroups[date] = (dateGroups[date] || 0) + 1;
    }
  });
  
  // 日付順にソートしてデータを生成
  const sortedDates = Object.keys(dateGroups).sort();
  
  return sortedDates.map(date => {
    return {
      date: new Date(date).toISOString(),
      highschoolCount: 0, // 大学生ページなので高校生は0
      universityCount: dateGroups[date],
      totalCount: dateGroups[date],
    };
  });
};

export const UniversityPlayers: React.FC = () => {
  const [players, setPlayers] = React.useState<PlayerData[]>([]);
  const [trendData, setTrendData] = React.useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // 年度管理状態
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);

  // 年度データの初期化
  React.useEffect(() => {
    const initializeYears = async () => {
      try {
        const data = await apiService.getAvailableYears();
        setAvailableYears(data.years);
        setSelectedYear(data.defaultYear);
      } catch (error) {
        console.error('年度データの取得に失敗:', error);
        // フォールバック: 2024年から現在年まで
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear; year >= 2024; year--) {
          years.push(year);
        }
        setAvailableYears(years);
        setSelectedYear(currentYear);
      }
    };
    
    initializeYears();
  }, []);

  // データ読み込み処理
  const loadPlayersData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (apiConfig.useProductionData) {
        // AWS APIからデータ取得
        console.log('AWS APIから大学生データを取得中...', {
          useProductionData: apiConfig.useProductionData,
          baseURL: apiConfig.baseURL,
          year: selectedYear
        });
        const response = await apiService.getUniversityPlayers(selectedYear);
        console.log('取得したデータ:', response);
        
        // データが存在しない場合のメッセージ表示
        if (response.data.length === 0 && response.metadata?.message) {
          setError(response.metadata.message);
        } else {
          setError(null);
        }
        
        setPlayers(response.data);
        
        // 実際のデータから増分チャート用データを生成
        const trendDataFromPlayers = generateTrendDataFromPlayers(response.data);
        setTrendData(trendDataFromPlayers);
      } else {
        // AWS APIが無効化されています
        console.log('AWS APIが無効化されています');
        setPlayers([]);
        setTrendData([]);
      }
    } catch (err) {
      console.error('大学生データの取得に失敗:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        response: err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: unknown } }).response?.data : undefined,
        status: err && typeof err === 'object' && 'response' in err ? (err as { response?: { status?: number } }).response?.status : undefined,
        config: {
          url: err && typeof err === 'object' && 'config' in err ? (err as { config?: { url?: string } }).config?.url : undefined,
          method: err && typeof err === 'object' && 'config' in err ? (err as { config?: { method?: string } }).config?.method : undefined,
          baseURL: err && typeof err === 'object' && 'config' in err ? (err as { config?: { baseURL?: string } }).config?.baseURL : undefined
        }
      });
      
      let errorMessage = 'データの取得に失敗しました。';
      if (err instanceof Error && err.message?.includes('データが見つかりません')) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object' && 'response' in err && (err as { response?: { status?: number } }).response?.status === 404) {
        errorMessage = 'APIエンドポイントが見つかりません。';
      } else if (err && typeof err === 'object' && 'code' in err && err.code === 'NETWORK_ERROR') {
        errorMessage = 'ネットワークエラー: APIサーバーに接続できません。';
      }
      
      setError(errorMessage);
      // エラー時は空のデータを使用
      setPlayers([]);
      setTrendData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  // 選択年度変更時にデータを再取得
  React.useEffect(() => {
    if (selectedYear && availableYears.length > 0) {
      loadPlayersData();
    }
  }, [selectedYear, loadPlayersData]);

  // 初回ロード時にデータを取得
  React.useEffect(() => {
    if (availableYears.length > 0) {
      loadPlayersData();
    }
  }, [availableYears, loadPlayersData]);
  
  const [filters, setFilters] = React.useState<FilterState>({
    search: '',
    prefecture: '',
  });

  // フィルタリング処理
  const filteredPlayers = React.useMemo(() => {
    return players.filter((player) => {
      const matchesSearch = filters.search === '' || 
        player.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        player.school.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesPrefecture = filters.prefecture === '' ||
        player.prefecture === filters.prefecture;
      
      return matchesSearch && matchesPrefecture;
    });
  }, [players, filters]);


  const availablePrefectures = React.useMemo(() => {
    const prefectures = new Set<string>();
    players.forEach(player => {
      if (player.prefecture) prefectures.add(player.prefecture);
    });
    return Array.from(prefectures).sort();
  }, [players]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePlayerClick = (player: PlayerData) => {
    console.log('Player clicked:', player);
    // 詳細表示やモーダル表示のロジックをここに追加
  };

  const handleRefresh = async () => {
    await loadPlayersData();
  };

  const handleExport = () => {
    if (!filteredPlayers.length) return;
    
    const csv = [
      ['ID', '氏名', '学校', '都道府県', '登録日'],
      ...filteredPlayers.map(player => [
        player.id,
        player.name,
        player.school,
        player.prefecture || 'N/A',
        player.filingDate ? new Date(player.filingDate).toLocaleDateString('ja-JP') : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `university_players_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 統計データ
  const stats = React.useMemo(() => {
    const prefectureCounts: Record<string, number> = {};
    
    filteredPlayers.forEach(player => {
      if (player.prefecture) {
        prefectureCounts[player.prefecture] = (prefectureCounts[player.prefecture] || 0) + 1;
      }
    });

    return {
      total: filteredPlayers.length,
      schools: new Set(filteredPlayers.map(p => p.school)).size,
      prefectures: Object.keys(prefectureCounts).length,
      topPrefecture: Object.entries(prefectureCounts).length > 0 
        ? `${Object.entries(prefectureCounts).sort(([,a], [,b]) => b - a)[0][0]} (${Object.entries(prefectureCounts).sort(([,a], [,b]) => b - a)[0][1]}名)`
        : 'データなし',
    };
  }, [filteredPlayers]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h4" component="h1">
            <School sx={{ mr: 1, verticalAlign: 'middle' }} />
            大学生選手一覧
          </Typography>
          
          {/* 年度選択 */}
          <YearSelector
            selectedYear={selectedYear}
            availableYears={availableYears}
            onChange={setSelectedYear}
            disabled={isLoading}
            size="small"
          />
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? '更新中...' : '更新'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={!filteredPlayers.length}
          >
            CSV出力
          </Button>
        </Box>
      </Box>

      {/* データソース表示 - データ読み込み中のみ表示 */}
      {isLoading && (
        <Box mb={2}>
          <Alert 
            severity={apiConfig.useProductionData ? "info" : "warning"} 
            variant="outlined"
          >
            {apiConfig.useProductionData 
              ? `AWS API (${apiConfig.baseURL.includes('/prod') ? '本番環境' : '開発環境'}) からデータを取得しています...` 
              : 'AWS APIが無効化されています (.envのVITE_USE_PRODUCTION_DATAで切り替え)'}
          </Alert>
        </Box>
      )}

      {error && (
        <Alert 
          severity={error.includes('データが存在しません') ? "info" : "error"} 
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* 統計カード */}
      <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 48%', sm: '1 1 23%' } }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color={stats.total === 0 ? "textSecondary" : "warning.main"}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                総選手数
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 48%', sm: '1 1 23%' } }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color={stats.schools === 0 ? "textSecondary" : "primary"}>
                {stats.schools}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                大学数
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 48%', sm: '1 1 23%' } }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color={stats.topPrefecture === 'データなし' ? "textSecondary" : "success.main"}>
                {stats.topPrefecture}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                最多都道府県
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* データが存在しない場合のメッセージ */}
      {!isLoading && players.length === 0 && !error && (
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body1" color="text.primary">
            {selectedYear}年度の大学生選手データがまだ登録されていません
          </Typography>
        </Box>
      )}

      {/* 増分グラフ */}
      <Box mb={3}>
        <TrendChart
          title="大学生選手登録推移"
          trendData={trendData}
          height={300}
          showTotalOnly={true}
        />
      </Box>

      {/* フィルター */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
          <Box sx={{ flex: { xs: '1 1 100%', sm: '2 1 40%' } }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="選手名・学校名で検索"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }
              }}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 48%', sm: '1 1 30%' } }}>
            <FormControl fullWidth>
              <InputLabel>都道府県</InputLabel>
              <Select
                value={filters.prefecture}
                label="都道府県"
                onChange={(e) => handleFilterChange('prefecture', e.target.value)}
              >
                <MenuItem value="">すべて</MenuItem>
                {availablePrefectures.map(prefecture => (
                  <MenuItem key={prefecture} value={prefecture}>
                    {prefecture}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 30%' } }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setFilters({ search: '', prefecture: '' })}
            >
              クリア
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 選手テーブル */}
      <PlayerTable
        players={filteredPlayers}
        loading={isLoading}
        onPlayerClick={handlePlayerClick}
        title="大学生選手一覧"
      />
    </Box>
  );
};