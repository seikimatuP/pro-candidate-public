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
  Tabs,
  Tab,
  Skeleton,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  Download,
  School as SchoolIcon,
  Refresh,
  Analytics,
} from '@mui/icons-material';
import { useSchoolManagement } from '../hooks/useSchoolManagement';
import { SchoolDetailDialog } from '../components/school/SchoolDetailDialog';
import SchoolStatistics from '../components/analytics/SchoolStatistics';

export const SchoolManagement: React.FC = () => {
  const {
    filteredSchools,
    paginatedSchools,
    isLoading,
    hasError,
    page,
    rowsPerPage,
    searchQuery,
    selectedSchool,
    dialogOpen,
    tabValue,
    setSearchQuery,
    setPage,
    setDialogOpen,
    setTabValue,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSchoolClick,
    handleExport,
    refetchPlayers,
  } = useSchoolManagement();

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
          学校管理・レポート
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1
          }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetchPlayers()}
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
          選手データの取得に失敗しました
        </Alert>
      )}

      {/* タブコンテンツ */}
      {tabValue === 0 && (
        <>
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSchoolClick(school);
                          }
                        }}
                        tabIndex={0}
                        role="button"
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
      <SchoolDetailDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        school={selectedSchool}
      />
    </Box>
  );
};