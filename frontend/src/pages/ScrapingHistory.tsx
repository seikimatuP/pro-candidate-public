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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  History,
  Refresh,
  Info,
  TrendingUp,
  TrendingDown,
  Remove,
} from '@mui/icons-material';
import { apiService, apiConfig } from '../services/api';
import type { ScrapingHistoryRecord } from '../types/player';

export const ScrapingHistory: React.FC = () => {
  // 環境設定（開発環境ではdevのみ、本番環境ではprodのみ表示）
  const currentEnvironment = apiConfig.baseURL.includes('/prod') ? 'prod' : 'dev';
  const [historyData, setHistoryData] = React.useState<ScrapingHistoryRecord[]>([]);
  const [allHistoryData, setAllHistoryData] = React.useState<ScrapingHistoryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [totalRecords, setTotalRecords] = React.useState(0);
  const [selectedRecord, setSelectedRecord] = React.useState<ScrapingHistoryRecord | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'highschool' | 'university'>('all');
  const [yearFilter, setYearFilter] = React.useState<number | 'all'>('all');
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);

  // 同時実行レコードをグループ化する関数
  const groupConcurrentRecords = (records: ScrapingHistoryRecord[]): ScrapingHistoryRecord[] => {
    const grouped: ScrapingHistoryRecord[] = [];
    const groupWindow = 10000; // 10秒以内の実行をグループ化
    
    for (let i = 0; i < records.length; i++) {
      const current = records[i];
      const currentTime = new Date(current.timestamp).getTime();
      
      // 'both'タイプの場合はそのまま追加
      if (current.type === 'both') {
        grouped.push(current);
        continue;
      }
      
      // 次のレコードとの時間差をチェック
      const next = records[i + 1];
      if (next && 
          Math.abs(currentTime - new Date(next.timestamp).getTime()) <= groupWindow &&
          current.type !== next.type) {
        
        // 同時実行として結合
        const mergedResults = {
          ...current.results,
          ...next.results
        };
        
        // 正しい総差分を計算（高校生・大学生それぞれの差分の合計）
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
            totalDifference: correctTotalDifference
          },
          triggeredBy: current.triggeredBy
        };
        
        grouped.push(mergedRecord);
        i++; // 次のレコードをスキップ
      } else {
        grouped.push(current);
      }
    }
    
    return grouped;
  };

  // 前回実行時との差分を計算（年度を考慮）
  const calculatePreviousDifference = (data: ScrapingHistoryRecord[]) => {
    const calculatedData = [...data];
    
    // 時系列順にソート（新しい順）
    calculatedData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // 各レコードに対して前回実行時との差分を計算
    for (let i = 0; i < calculatedData.length; i++) {
      const current = calculatedData[i];
      
      // 次のレコード（時系列的には前回の実行）を探す
      let previous: ScrapingHistoryRecord | null = null;
      for (let j = i + 1; j < calculatedData.length; j++) {
        const candidate = calculatedData[j];
        
        // 同じ年度のデータのみを対象にする
        const currentYear = current.year || new Date(current.timestamp).getFullYear();
        const candidateYear = candidate.year || new Date(candidate.timestamp).getFullYear();
        if (currentYear !== candidateYear) {
          continue;
        }
        
        // 同じタイプまたはbothタイプのレコードを探す
        if (current.type === 'both' || candidate.type === 'both' || current.type === candidate.type) {
          previous = candidate;
          break;
        }
      }
      
      // 前回との差分を計算
      if (previous) {
        // 高校生の差分
        if (current.results.highschool && previous.results.highschool) {
          current.results.highschool.difference = 
            current.results.highschool.currentCount - previous.results.highschool.currentCount;
        } else if (current.results.highschool && !previous.results.highschool) {
          // 前回高校生データがない場合は現在の件数が増加分
          current.results.highschool.difference = current.results.highschool.currentCount;
        }
        
        // 大学生の差分
        if (current.results.university && previous.results.university) {
          current.results.university.difference = 
            current.results.university.currentCount - previous.results.university.currentCount;
        } else if (current.results.university && !previous.results.university) {
          // 前回大学生データがない場合は現在の件数が増加分
          current.results.university.difference = current.results.university.currentCount;
        }
      } else {
        // 同じ年度の前回データがない場合（その年度の初回実行）
        // 現在の件数を増加分として表示
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

  // データ読み込み
  const loadHistoryData = React.useCallback(async (pageNum: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = pageNum * rowsPerPage;
      // 前回との差分計算のため、より多くのデータを取得
      const response = await apiService.getScrapingHistory(currentEnvironment, Math.max(rowsPerPage * 3, 50), Math.max(0, offset - rowsPerPage));
      
      // 同時実行レコードをグループ化
      const groupedData = groupConcurrentRecords(response.data);
      
      // 前回実行時との差分を計算
      const dataWithDifference = calculatePreviousDifference(groupedData);
      
      // ページングに合わせてデータを切り出し
      const startIndex = offset > 0 ? rowsPerPage : 0;
      const endIndex = startIndex + rowsPerPage;
      const pagedData = dataWithDifference.slice(startIndex, endIndex);
      
      setAllHistoryData(pagedData);
      setHistoryData(pagedData);
      setTotalRecords(response.metadata.total);
      
      console.log('履歴データ取得完了:', {
        environment: currentEnvironment,
        records: response.data.length,
        groupedRecords: groupedData.length,
        pagedRecords: pagedData.length,
        total: response.metadata.total
      });
      
    } catch (err) {
      const error = err as Error;
      console.error('履歴データ取得エラー:', error);
      setError(`履歴データの取得に失敗しました: ${error.message}`);
      setHistoryData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage, currentEnvironment]);

  // ページ変更時
  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    loadHistoryData(newPage);
  };

  // 行数変更時
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    loadHistoryData(0);
  };

  // 詳細表示
  const handleDetailOpen = (record: ScrapingHistoryRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
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
    
    // 年度フィルター
    if (yearFilter !== 'all') {
      filtered = filtered.filter(record => record.year === yearFilter);
    }
    
    // タイプフィルター
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

  // タイプフィルター変更ハンドラ
  const handleTypeFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'highschool' | 'university' | null) => {
    if (newFilter !== null) {
      setTypeFilter(newFilter);
    }
  };

  // 年度フィルター変更ハンドラ
  const handleYearFilterChange = (event: SelectChangeEvent<number | 'all'>) => {
    setYearFilter(event.target.value);
  };

  // 初回ロード
  React.useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  // 日時フォーマット
  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // タイプラベル
  const getTypeLabel = (record: ScrapingHistoryRecord) => {
    // typeLabelがある場合はそれを使用
    if (record.typeLabel) {
      return record.typeLabel;
    }
    
    // 年度情報がある場合は含める
    const yearPrefix = record.year ? `${record.year}年度 ` : '';
    
    switch (record.type) {
      case 'highschool': return `${yearPrefix}高校生`;
      case 'university': return `${yearPrefix}大学生`;
      case 'both': return `${yearPrefix}高校生・大学生`;
      default: return record.type;
    }
  };

  // 件数のみ表示コンポーネント
  const CountDisplay: React.FC<{
    count: number;
  }> = ({ count }) => (
    <Typography variant="body2" component="span" fontWeight="bold">
      {count}件
    </Typography>
  );

  // 差分のみ表示コンポーネント
  const DifferenceOnly: React.FC<{
    difference: number;
  }> = ({ difference }) => (
    <Box display="flex" alignItems="center" justifyContent="center">
      {difference !== 0 ? (
        <Chip
          icon={
            difference > 0 ? <TrendingUp /> : 
            difference < 0 ? <TrendingDown /> : 
            <Remove />
          }
          label={difference > 0 ? `+${difference}` : difference}
          color={difference > 0 ? 'success' : difference < 0 ? 'error' : 'default'}
          size="small"
          variant="filled"
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          ±0
        </Typography>
      )}
    </Box>
  );


  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <History color="primary" />
          <Typography variant="h4" component="h1">
            スクレイピング履歴
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
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
      <Box display="flex" justifyContent="center" alignItems="center" gap={3} mb={2}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>年度</InputLabel>
          <Select
            value={yearFilter}
            onChange={handleYearFilterChange}
            label="年度"
          >
            <MenuItem value="all">すべて</MenuItem>
            {availableYears.map(year => (
              <MenuItem key={year} value={year}>{year}年</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <ToggleButtonGroup
          value={typeFilter}
          exclusive
          onChange={handleTypeFilterChange}
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
                    <Typography color="text.secondary">
                      履歴データがありません
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                historyData.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(record.timestamp)}
                      </Typography>
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
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {record.results.university ? (
                        <CountDisplay count={record.results.university.currentCount} />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {record.results.highschool ? (
                        <DifferenceOnly difference={record.results.highschool.difference} />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {record.results.university ? (
                        <DifferenceOnly difference={record.results.university.difference} />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
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
            `${from}-${to} / ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      </Paper>

      {/* 詳細ダイアログ */}
      <Dialog 
        open={detailOpen} 
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          スクレイピング実行詳細
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Typography variant="h6" gutterBottom>
                基本情報
              </Typography>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  実行ID: {selectedRecord.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  実行日時: {formatDateTime(selectedRecord.timestamp)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  環境: {selectedRecord.environment}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  タイプ: {getTypeLabel(selectedRecord)}
                </Typography>
                {selectedRecord.updatePeriod && (
                  <Typography variant="body2" color="text.secondary">
                    更新期間: {selectedRecord.updatePeriod}
                    {selectedRecord.daysSinceLastUpdate !== null && (
                      <span> （前回実行から{selectedRecord.daysSinceLastUpdate}日経過）</span>
                    )}
                  </Typography>
                )}
                {selectedRecord.lastExecutionDate && (
                  <Typography variant="body2" color="text.secondary">
                    前回実行日: {formatDateTime(selectedRecord.lastExecutionDate)}
                  </Typography>
                )}
              </Box>

              <Typography variant="h6" gutterBottom>
                実行結果
              </Typography>
              {selectedRecord.results.highschool && (
                <Box mb={2}>
                  <Typography variant="subtitle1" color="success.main">
                    高校生データ
                  </Typography>
                  <Typography variant="body2">
                    現在の件数: {selectedRecord.results.highschool.currentCount}件
                  </Typography>
                  <Typography variant="body2">
                    前回の件数: {selectedRecord.results.highschool.previousCount}件
                  </Typography>
                  <Typography variant="body2">
                    差分: {selectedRecord.results.highschool.difference > 0 ? '+' : ''}{selectedRecord.results.highschool.difference}件
                  </Typography>
                  {selectedRecord.results.highschool.newPlayers.length > 0 && (
                    <Typography variant="body2">
                      新規追加: {selectedRecord.results.highschool.newPlayers.length}名
                    </Typography>
                  )}
                  {selectedRecord.results.highschool.removedPlayers.length > 0 && (
                    <Typography variant="body2">
                      削除: {selectedRecord.results.highschool.removedPlayers.length}名
                    </Typography>
                  )}
                </Box>
              )}

              {selectedRecord.results.university && (
                <Box mb={2}>
                  <Typography variant="subtitle1" color="warning.main">
                    大学生データ
                  </Typography>
                  <Typography variant="body2">
                    現在の件数: {selectedRecord.results.university.currentCount}件
                  </Typography>
                  <Typography variant="body2">
                    前回の件数: {selectedRecord.results.university.previousCount}件
                  </Typography>
                  <Typography variant="body2">
                    差分: {selectedRecord.results.university.difference > 0 ? '+' : ''}{selectedRecord.results.university.difference}件
                  </Typography>
                  {selectedRecord.results.university.newPlayers.length > 0 && (
                    <Typography variant="body2">
                      新規追加: {selectedRecord.results.university.newPlayers.length}名
                    </Typography>
                  )}
                  {selectedRecord.results.university.removedPlayers.length > 0 && (
                    <Typography variant="body2">
                      削除: {selectedRecord.results.university.removedPlayers.length}名
                    </Typography>
                  )}
                </Box>
              )}

              <Typography variant="h6" gutterBottom>
                総合結果
              </Typography>
              <Box>
                <Typography variant="body2">
                  総数: {selectedRecord.summary.totalCurrent}件
                </Typography>
                <Typography variant="body2">
                  前回総数: {selectedRecord.summary.totalPrevious}件
                </Typography>
                <Typography variant="body2">
                  総差分: {selectedRecord.summary.totalDifference > 0 ? '+' : ''}{selectedRecord.summary.totalDifference}件
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};