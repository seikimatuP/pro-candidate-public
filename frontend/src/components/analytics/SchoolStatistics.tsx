import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
  Button,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Download, Refresh } from '@mui/icons-material';
import { useSemanticColors } from '../../contexts/ThemeContext';
import { useSchoolStatisticsData } from './hooks/useSchoolStatisticsData';
import { useSchoolStats } from './hooks/useSchoolStats';
import { SchoolRankingTable } from './SchoolRankingTable';
import { YearComparisonView } from './YearComparisonView';
import { SchoolTrendView } from './SchoolTrendView';

export const SchoolStatistics: React.FC = () => {
  const { playersData, loading, error } = useSchoolStatisticsData();
  const { availableYears, schoolStats, yearComparisons } = useSchoolStats(playersData);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'comparison' | 'trends'>('overview');

  const semantic = useSemanticColors();

  const chartColors = useMemo(() => ({
    primary: semantic.chart.highschool.border,
    secondary: semantic.chart.total.border,
    background: {
      primary: semantic.chart.highschool.bg,
      secondary: semantic.chart.total.bg,
    }
  }), [semantic]);

  // 選択年度の学校リスト
  const schoolsInSelectedYear = useMemo(() => {
    const yearData = yearComparisons.find(comp => comp.year === selectedYear);
    return yearData?.topSchools.map(s => s.school) || [];
  }, [yearComparisons, selectedYear]);

  const exportData = () => {
    const csvContent = schoolStats.map(stats =>
      `${stats.school},${stats.totalPlayers},${stats.highschoolCount},${stats.universityCount},${stats.prefecture},${stats.trend}`
    ).join('\n');

    const header = '学校名,総選手数,高校生,大学生,都道府県,傾向\n';
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `school_statistics_${selectedYear}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 2
            }}>
            <Typography variant="h6">学校別統計を読み込み中...</Typography>
          </Box>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={() => window.location.reload()}>
          <Refresh /> 再試行
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* コントロールパネル */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2
            }}>
            <Typography variant="h5">学校別統計・年度比較分析</Typography>
            <Box
              sx={{
                display: "flex",
                gap: 1
              }}>
              <Button
                variant={viewMode === 'overview' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('overview')}
                size="small"
              >
                概要
              </Button>
              <Button
                variant={viewMode === 'comparison' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('comparison')}
                size="small"
              >
                年度比較
              </Button>
              <Button
                variant={viewMode === 'trends' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('trends')}
                size="small"
              >
                推移分析
              </Button>
              <Tooltip title="データをCSVでエクスポート">
                <IconButton onClick={exportData} aria-label="学校統計をCSVでエクスポート">
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap"
            }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>年度</InputLabel>
              <Select
                value={selectedYear}
                label="年度"
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {availableYears.map(year => (
                  <MenuItem key={year} value={year}>{year}年</MenuItem>
                ))}
              </Select>
            </FormControl>

            {(viewMode === 'trends') && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>学校</InputLabel>
                <Select
                  value={selectedSchool}
                  label="学校"
                  onChange={(e) => setSelectedSchool(e.target.value)}
                >
                  {schoolsInSelectedYear.map(school => (
                    <MenuItem key={school} value={school}>{school}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* 概要表示 */}
      {viewMode === 'overview' && (
        <SchoolRankingTable
          selectedYear={selectedYear}
          schoolStats={schoolStats}
          playersData={playersData}
        />
      )}

      {/* 年度比較表示 */}
      {viewMode === 'comparison' && (
        <YearComparisonView
          selectedYear={selectedYear}
          yearComparisons={yearComparisons}
          chartColors={chartColors}
        />
      )}

      {/* 推移分析表示 */}
      {viewMode === 'trends' && (
        <SchoolTrendView
          selectedSchool={selectedSchool}
          schoolStats={schoolStats}
          chartColors={chartColors}
        />
      )}
    </Box>
  );
};

export default SchoolStatistics;
