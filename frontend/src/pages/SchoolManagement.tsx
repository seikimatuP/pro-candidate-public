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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  Download,
  School as SchoolIcon,
  Refresh,
  Analytics,
} from '@mui/icons-material';
import { useGetPlayersQuery } from '../store/apiSlice';
import SchoolStatistics from '../components/analytics/SchoolStatistics';
import type { PlayerData } from '../types/player';

interface SchoolStats {
  name: string;
  playerCount: number;
  highschoolCount: number;
  universityCount: number;
  players: PlayerData[];
}

export const SchoolManagement: React.FC = () => {
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
      
      // type または id ベースで分類
      if (player.type === 'highschool' || player.id.includes('highschool')) {
        school.highschoolCount++;
      } else if (player.type === 'university' || player.id.includes('university')) {
        school.universityCount++;
      }
      
    });
    
    return Array.from(schoolMap.values()).sort((a, b) => b.playerCount - a.playerCount);
  }, [playersData?.data]);

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

  // 全体統計 - 一時的にコメントアウト
  // const overallStats = React.useMemo(() => {
  //   return {
  //     totalSchools: schoolStats.length,
  //     totalPlayers: schoolStats.reduce((sum, school) => sum + school.playerCount, 0),
  //     totalHighschool: schoolStats.reduce((sum, school) => sum + school.highschoolCount, 0),
  //     totalUniversity: schoolStats.reduce((sum, school) => sum + school.universityCount, 0),
  //     averagePlayersPerSchool: schoolStats.length > 0 ? 
  //       Math.round(schoolStats.reduce((sum, school) => sum + school.playerCount, 0) / schoolStats.length * 10) / 10 : 0,
  //     topSchool: schoolStats.length > 0 ? schoolStats[0] : null,
  //   };
  // }, [schoolStats]);

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

  const isLoading = playersLoading;
  const hasError = playersError;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          学校管理・レポート
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              refetchPlayers();
            }}
          >
            更新
          </Button>
          {tabValue === 0 && (
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExport}
              disabled={!filteredSchools.length}
            >
              CSV出力
            </Button>
          )}
        </Box>
      </Box>

      {/* タブナビゲーション */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            icon={<SchoolIcon />}
            iconPosition="start"
            label="学校一覧"
          />
          <Tab
            icon={<Analytics />}
            iconPosition="start"
            label="統計分析"
          />
        </Tabs>
      </Paper>

      {hasError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          選手データの取得に失敗しました: {playersError ? String(playersError) : '不明なエラー'}
        </Alert>
      )}

      {/* タブコンテンツ */}
      {tabValue === 0 && (
        <>
          {/* 学校一覧タブ */}
          {/* 統計サマリー - 一時的にコメントアウト */}
      {/* <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SchoolIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color="primary">
                {isLoading ? '...' : overallStats.totalSchools}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                総学校数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {isLoading ? '...' : overallStats.totalPlayers}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                総選手数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {isLoading ? '...' : overallStats.averagePlayersPerSchool}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                学校平均選手数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <LocationOn sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6" color="info.main" noWrap>
                {isLoading ? '...' : (overallStats.topSchool?.name || '---')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                最多選手校
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {isLoading ? '' : `(${overallStats.topSchool?.playerCount || 0}名)`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid> */}

          {/* 検索フィルター */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="学校名で検索"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>

          {/* 学校一覧テーブル */}
          <Paper>
            <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>学校名</TableCell>
                <TableCell align="center">総選手数</TableCell>
                <TableCell align="center">高校生</TableCell>
                <TableCell align="center">大学生</TableCell>
                <TableCell align="center">詳細</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: rowsPerPage }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 5 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                paginatedSchools.map((school) => (
                  <TableRow 
                    key={school.name} 
                    hover 
                    onClick={() => handleSchoolClick(school)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{school.name}</TableCell>
                    <TableCell align="center">
                      <Typography variant="h6" color="primary">
                        {school.playerCount}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {school.highschoolCount > 0 && (
                        <Chip
                          label={school.highschoolCount}
                          color="success"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {school.universityCount > 0 && (
                        <Chip
                          label={school.universityCount}
                          color="warning"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSchoolClick(school);
                        }}
                      >
                        詳細
                      </Button>
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
          count={filteredSchools.length}
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
        </>
      )}

      {/* 統計分析タブ */}
      {tabValue === 1 && (
        <SchoolStatistics />
      )}

      {/* 学校詳細ダイアログ */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SchoolIcon />
            {selectedSchool?.name} - 詳細情報
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSchool && (
            <Box>
              {/* 統計情報 - 一時的にコメントアウト */}
              {/* <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                      <Typography variant="h5" color="primary">
                        {selectedSchool.playerCount}
                      </Typography>
                      <Typography variant="body2">総選手数</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                      <Typography variant="h5" color="success.main">
                        {selectedSchool.highschoolCount}
                      </Typography>
                      <Typography variant="body2">高校生</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                      <Typography variant="h5" color="warning.main">
                        {selectedSchool.universityCount}
                      </Typography>
                      <Typography variant="body2">大学生</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid> */}


              {/* 選手一覧 */}
              <Typography variant="h6" gutterBottom>
                所属選手一覧
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                <List dense>
                  {selectedSchool.players.map((player, index) => (
                    <React.Fragment key={player.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body1">
                                {player.name}
                              </Typography>
                              <Box display="flex" gap={1}>
                                <Chip
                                  label={
                                    player.type === 'highschool' || player.id.includes('highschool') 
                                      ? '高校' 
                                      : '大学'
                                  }
                                  color={
                                    player.type === 'highschool' || player.id.includes('highschool') 
                                      ? 'success' 
                                      : 'warning'
                                  }
                                  size="small"
                                />
                              </Box>
                            </Box>
                          }
                          secondary={`ID: ${player.id}`}
                        />
                      </ListItem>
                      {index < selectedSchool.players.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
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