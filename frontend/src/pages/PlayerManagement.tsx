import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Card,
  CardContent,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  Edit,
  Refresh,
  School,
  Sports,
} from '@mui/icons-material';
// Grid は Box ベースで実装する
import { apiService, apiConfig } from '../services/api';
import type { PlayerData } from '../types/player';

interface FilterState {
  search: string;
  type: 'all' | 'highschool' | 'university';
}

export const PlayerManagement: React.FC = () => {
  const [players, setPlayers] = React.useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // データ読み込み処理
  React.useEffect(() => {
    loadAllPlayersData();
  }, []);

  const loadAllPlayersData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (apiConfig.useProductionData) {
        // AWS APIからデータ取得
        console.log('AWS APIから全選手データを取得中...');
        const [highschoolPlayers, universityPlayers] = await Promise.all([
          apiService.getHighschoolPlayers(),
          apiService.getUniversityPlayers()
        ]);
        
        const allPlayers = [...highschoolPlayers.data, ...universityPlayers.data];
        setPlayers(allPlayers);
      } else {
        // 本番データが無効な場合は空データ
        console.log('本番データが無効なため、空のデータセットを使用');
        setPlayers([]);
      }
    } catch (err) {
      console.error('選手管理データの取得に失敗:', err);
      setError('データの取得に失敗しました。');
      setPlayers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const data = { data: players, metadata: { lastUpdated: new Date().toISOString() } };
  const refetch = loadAllPlayersData;
  
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [selectedPlayer, setSelectedPlayer] = React.useState<PlayerData | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterState>({
    search: '',
    type: 'all',
  });

  // フィルタリング処理
  const filteredPlayers = React.useMemo(() => {
    if (!data?.data) return [];
    
    return data.data.filter((player) => {
      const matchesSearch = filters.search === '' || 
        player.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        player.school.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesType = filters.type === 'all' || 
        (filters.type === 'highschool' && (player.type === 'highschool' || player.id.includes('highschool'))) ||
        (filters.type === 'university' && (player.type === 'university' || player.id.includes('university')));
      
      return matchesSearch && matchesType;
    });
  }, [data?.data, filters]);

  // ページネーション処理
  const paginatedPlayers = React.useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredPlayers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredPlayers, page, rowsPerPage]);


  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // フィルタ変更時はページをリセット
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
        (player.type === 'highschool' || player.id.includes('highschool')) ? '高校' : '大学',
        player.prefecture || player.region || 'N/A',
        player.filingDate ? new Date(player.filingDate).toLocaleDateString('ja-JP') : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `players_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 統計データ
  const stats = React.useMemo(() => {
    const prefectureCounts: Record<string, number> = {};
    const schoolCounts: Record<string, number> = {};
    
    filteredPlayers.forEach(player => {
      // 都道府県集計
      if (player.prefecture) {
        prefectureCounts[player.prefecture] = (prefectureCounts[player.prefecture] || 0) + 1;
      }
      
      // 学校集計
      if (player.school) {
        schoolCounts[player.school] = (schoolCounts[player.school] || 0) + 1;
      }
    });

    // 最多項目を取得（データが存在する場合のみ）
    const getTopEntry = (counts: Record<string, number>) => {
      const entries = Object.entries(counts);
      if (entries.length === 0) return 'データなし';
      const sorted = entries.sort(([,a], [,b]) => b - a);
      return `${sorted[0][0]} (${sorted[0][1]}名)`;
    };

    return {
      total: filteredPlayers.length,
      highschool: filteredPlayers.filter(p => p.type === 'highschool' || p.id.includes('highschool')).length,
      university: filteredPlayers.filter(p => p.type === 'university' || p.id.includes('university')).length,
      topPrefecture: getTopEntry(prefectureCounts),
      topSchool: getTopEntry(schoolCounts),
      schools: Object.keys(schoolCounts).length,
    };
  }, [filteredPlayers]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          選手管理
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetch()}
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
              ? `AWS API (${apiConfig.baseURL.includes('/prod') ? '本番環境' : 'dev環境'}) からデータを取得しています...` 
              : 'AWS APIが無効化されています (.envのVITE_USE_PRODUCTION_DATAで切り替え)'}
          </Alert>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 統計カード */}
      <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 48%', sm: '1 1 23%' } }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
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
              <Typography variant="h6" color="success.main">
                {stats.highschool}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                高校生
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 48%', sm: '1 1 23%' } }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main">
                {stats.university}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                大学生
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 48%', sm: '1 1 23%' } }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="info.main">
                {stats.schools}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                参加校数
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* 詳細統計カード */}
      <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="warning.main">
                最多都道府県
              </Typography>
              <Typography variant="body1">
                {stats.topPrefecture}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="info.main">
                最多学校
              </Typography>
              <Typography variant="body1">
                {stats.topSchool}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* フィルター */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
          <Box sx={{ flex: { xs: '1 1 100%', sm: '2 1 35%' } }}>
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
          <Box sx={{ flex: { xs: '1 1 48%', sm: '1 1 20%' } }}>
            <FormControl fullWidth>
              <InputLabel>区分</InputLabel>
              <Select
                value={filters.type}
                label="区分"
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="highschool">高校生</MenuItem>
                <MenuItem value="university">大学生</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 20%' } }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setFilters({ search: '', type: 'all' })}
            >
              クリア
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 選手テーブル */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>氏名</TableCell>
                <TableCell>学校</TableCell>
                <TableCell>区分</TableCell>
                <TableCell>都道府県・地域</TableCell>
                <TableCell>登録日</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: rowsPerPage }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 6 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                paginatedPlayers.map((player) => (
                  <TableRow 
                    key={player.id} 
                    hover 
                    onClick={() => handlePlayerClick(player)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{player.name}</TableCell>
                    <TableCell>{player.school}</TableCell>
                    <TableCell>
                      <Chip
                        label={(player.type === 'highschool' || player.id.includes('highschool')) ? '高校' : '大学'}
                        color={(player.type === 'highschool' || player.id.includes('highschool')) ? 'success' : 'warning'}
                        size="small"
                        icon={<School />}
                      />
                    </TableCell>
                    <TableCell>{player.prefecture || player.region || 'N/A'}</TableCell>
                    <TableCell>{player.filingDate ? new Date(player.filingDate).toLocaleDateString('ja-JP') : 'N/A'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        handlePlayerClick(player);
                      }}>
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredPlayers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="1ページの行数:"
          labelDisplayedRows={({ from, to, count }) => 
            `${count}件中 ${from}-${to}件目`
          }
        />
      </Paper>

      {/* 選手詳細ダイアログ */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Sports />
            選手詳細
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPlayer && (
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                {selectedPlayer.name}
              </Typography>
              <Typography variant="body1" color="textSecondary" gutterBottom>
                {selectedPlayer.school}
              </Typography>
              <Typography variant="body2">
                ID: {selectedPlayer.id}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};