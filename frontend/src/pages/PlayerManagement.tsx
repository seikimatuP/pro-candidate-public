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
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Skeleton,
  InputAdornment,
} from '@mui/material';
import { Search, Download, FilterList, Visibility, Refresh, School } from '@mui/icons-material';
import { apiConfig } from '../config/apiConfig';
import { usePlayerManagement } from '../hooks/usePlayerManagement';
import { PlayerDetailDialog } from '../components/player/PlayerDetailDialog';

export const PlayerManagement: React.FC = () => {
  const {
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
    setFilters,
    setDialogOpen,
    handleChangePage,
    handleChangeRowsPerPage,
    handleFilterChange,
    handlePlayerClick,
    handleExport,
    refetch,
  } = usePlayerManagement();

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3
        }}>
        <Typography variant="h4" component="h1">
          選手管理
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1
          }}>
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

      {/* データソース表示 */}
      {isLoading && (
        <Box sx={{
          mb: 2
        }}>
          <Alert severity={apiConfig.useProductionData ? 'info' : 'warning'} variant="outlined">
            {apiConfig.useProductionData
              ? `AWS API (${apiConfig.baseURL.includes('/dev') ? 'dev環境' : '本番環境'}) からデータを取得しています...`
              : 'AWS APIが無効化されています'}
          </Alert>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 統計カード */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mb: 3
        }}>
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
              <Typography variant="h6" sx={{
                color: "success.main"
              }}>
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
              <Typography variant="h6" sx={{
                color: "warning.main"
              }}>
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
              <Typography variant="h6" sx={{
                color: "info.main"
              }}>
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
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mb: 3
        }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{
                color: "warning.main"
              }}>
                最多都道府県
              </Typography>
              <Typography variant="body1">{stats.topPrefecture}</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{
                color: "info.main"
              }}>
                最多学校
              </Typography>
              <Typography variant="body1">{stats.topSchool}</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* フィルター */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center"
          }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '2 1 35%' } }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="選手名・学校名で検索"
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 48%', sm: '1 1 20%' } }}>
            <FormControl fullWidth>
              <InputLabel>区分</InputLabel>
              <Select
                value={filters.type}
                label="区分"
                onChange={e => handleFilterChange('type', e.target.value)}
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
              {isLoading
                ? Array.from({ length: rowsPerPage }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 6 }).map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton variant="text" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : paginatedPlayers.map(player => (
                    <TableRow
                      key={player.id}
                      hover
                      onClick={() => handlePlayerClick(player)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handlePlayerClick(player);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.school}</TableCell>
                      <TableCell>
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
                          icon={<School />}
                        />
                      </TableCell>
                      <TableCell>{player.prefecture || player.region || 'N/A'}</TableCell>
                      <TableCell>
                        {player.filingDate
                          ? new Date(player.filingDate).toLocaleDateString('ja-JP')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            handlePlayerClick(player);
                          }}
                          aria-label={`${player.name}の詳細を表示`}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
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
          labelDisplayedRows={({ from, to, count }) => `${count}件中 ${from}-${to}件目`}
        />
      </Paper>

      {/* 選手詳細ダイアログ */}
      <PlayerDetailDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        player={selectedPlayer}
      />
    </Box>
  );
};
