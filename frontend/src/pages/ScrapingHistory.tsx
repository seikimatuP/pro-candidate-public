import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Alert,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { History, Refresh, Info } from '@mui/icons-material';
import { apiConfig } from '../config/apiConfig';
import { useScrapingHistory, type TypeFilter } from '../hooks/useScrapingHistory';
import {
  formatDateTime,
  getTypeLabel,
  CountDisplay,
  DifferenceChip,
  ScrapingDetailDialog,
} from '../components/scraping/ScrapingHistoryComponents';
import type { ScrapingHistoryRecord } from '../types/player';

export const ScrapingHistory: React.FC = () => {
  const {
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
  } = useScrapingHistory();

  const [selectedRecord, setSelectedRecord] = React.useState<ScrapingHistoryRecord | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const handleDetailOpen = (record: ScrapingHistoryRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };

  return (
    <Box>
      {/* ヘッダー */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3
        }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1
          }}>
          <History color="primary" />
          <Typography variant="h4" component="h1">
            スクレイピング履歴
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2
          }}>
          <Chip
            label={`${currentEnvironment.toUpperCase()}環境`}
            color={currentEnvironment === 'prod' ? 'error' : 'info'}
            variant="outlined"
          />
          <Button
            startIcon={<Refresh />}
            onClick={() => loadHistoryData(page)}
            disabled={loading}
            variant="outlined"
            size="small"
          >
            更新
          </Button>
        </Box>
      </Box>

      {/* フィルター */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 3,
          mb: 2
        }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>年度</InputLabel>
          <Select
            value={yearFilter}
            onChange={handleYearFilterChange as (event: SelectChangeEvent<number | 'all'>) => void}
            label="年度"
          >
            <MenuItem value="all">すべて</MenuItem>
            {availableYears.map(year => (
              <MenuItem key={year} value={year}>
                {year}年
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          value={typeFilter}
          exclusive
          onChange={
            handleTypeFilterChange as (
              event: React.MouseEvent<HTMLElement>,
              value: TypeFilter | null
            ) => void
          }
          aria-label="type filter"
          size="small"
        >
          <ToggleButton value="all" aria-label="all">
            すべて
          </ToggleButton>
          <ToggleButton value="highschool" aria-label="highschool">
            高校生
          </ToggleButton>
          <ToggleButton value="university" aria-label="university">
            大学生
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* 注意事項 */}
      {!apiConfig.useProductionData && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          モックモードでは履歴データは表示されません。
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 履歴テーブル */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>実行日時</TableCell>
                <TableCell>タイプ</TableCell>
                <TableCell align="center">高校生件数</TableCell>
                <TableCell align="center">大学生件数</TableCell>
                <TableCell align="center">高校生差分</TableCell>
                <TableCell align="center">大学生差分</TableCell>
                <TableCell align="center">アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : historyData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography sx={{
                      color: "text.secondary"
                    }}>履歴データがありません</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                historyData.map(record => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      <Typography variant="body2">{formatDateTime(record.timestamp)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeLabel(record)}
                        size="small"
                        color={record.type === 'both' ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {record.results.highschool ? (
                        <CountDisplay count={record.results.highschool.currentCount} />
                      ) : (
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {record.results.university ? (
                        <CountDisplay count={record.results.university.currentCount} />
                      ) : (
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {record.results.highschool ? (
                        <DifferenceChip difference={record.results.highschool.difference} />
                      ) : (
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {record.results.university ? (
                        <DifferenceChip difference={record.results.university.difference} />
                      ) : (
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        startIcon={<Info />}
                        onClick={() => handleDetailOpen(record)}
                        size="small"
                        variant="outlined"
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

        {/* ページネーション */}
        <TablePagination
          component="div"
          count={totalRecords}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="表示件数:"
          labelDisplayedRows={({ from, to, count }) =>
            `${count !== -1 ? `${count}件中` : `${to}件以上`} ${from}-${to}件目`
          }
        />
      </Paper>

      {/* 詳細ダイアログ */}
      <ScrapingDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        record={selectedRecord}
      />
    </Box>
  );
};
