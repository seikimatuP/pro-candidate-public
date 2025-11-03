import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Button,
  Tooltip,
  IconButton,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import {
  TrendingUp,
  TrendingDown,
  School,
  CompareArrows,
  Download,
  Refresh,
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import { useTheme } from '../../contexts/ThemeContext';
import { apiService } from '../../services/api';
import type { PlayerData } from '../../types/player';

interface SchoolStats {
  school: string;
  totalPlayers: number;
  highschoolCount: number;
  universityCount: number;
  yearlyData: Record<number, number>;
  prefecture: string;
  latestYear: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface YearComparison {
  year: number;
  totalPlayers: number;
  topSchools: Array<{
    school: string;
    count: number;
    percentage: number;
  }>;
  prefectureStats: Record<string, number>;
}

export const SchoolStatistics: React.FC = () => {
  const [playersData, setPlayersData] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'comparison' | 'trends'>('overview');
  const { mode } = useTheme();
  const muiTheme = useMuiTheme();

  // アクセシビリティ準拠カスタム色パレット（WCAG AAA基準）
  const chartColors = useMemo(() => {
    if (mode === 'dark') {
      return {
        primary: '#60a5fa',
        secondary: '#34d399', 
        tertiary: '#fbbf24',
        quaternary: '#f87171',
        background: {
          primary: 'rgba(96, 165, 250, 0.15)',
          secondary: 'rgba(52, 211, 153, 0.15)',
        }
      };
    } else {
      return {
        primary: muiTheme.palette.primary.main,
        secondary: muiTheme.palette.secondary.main,
        tertiary: '#f57c00',
        quaternary: '#d32f2f',
        background: {
          primary: `${muiTheme.palette.primary.main}20`,
          secondary: `${muiTheme.palette.secondary.main}20`,
        }
      };
    }
  }, [mode, muiTheme]);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [highschoolPlayers, universityPlayers] = await Promise.all([
          apiService.getHighschoolPlayers(),
          apiService.getUniversityPlayers()
        ]);

        const allPlayers = [...highschoolPlayers.data, ...universityPlayers.data];
        setPlayersData(allPlayers);
        
        console.log('School statistics data loaded:', {
          total: allPlayers.length,
          highschool: highschoolPlayers.data.length,
          university: universityPlayers.data.length
        });
      } catch (err) {
        console.error('Failed to load school statistics data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`データの取得に失敗しました: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 利用可能年度の計算
  const availableYears = useMemo(() => {
    if (playersData.length === 0) return [];
    
    const years = new Set<number>();
    playersData.forEach(player => {
      if (player.filingDate) {
        const year = new Date(player.filingDate).getFullYear();
        years.add(year);
      } else {
        years.add(new Date().getFullYear());
      }
    });
    
    return Array.from(years).sort((a, b) => b - a);
  }, [playersData]);

  // 学校別統計の計算
  const schoolStats = useMemo(() => {
    if (playersData.length === 0) return [];

    const statsMap = new Map<string, SchoolStats>();
    
    playersData.forEach(player => {
      const school = player.school || '不明';
      const year = player.filingDate ? new Date(player.filingDate).getFullYear() : new Date().getFullYear();
      const prefecture = player.prefecture || '不明';
      
      if (!statsMap.has(school)) {
        statsMap.set(school, {
          school,
          totalPlayers: 0,
          highschoolCount: 0,
          universityCount: 0,
          yearlyData: {},
          prefecture,
          latestYear: year,
          trend: 'stable' as const,
          trendPercentage: 0,
        });
      }
      
      const stats = statsMap.get(school)!;
      stats.totalPlayers++;
      
      if (player.type === 'highschool' || player.id.includes('highschool')) {
        stats.highschoolCount++;
      } else {
        stats.universityCount++;
      }
      
      stats.yearlyData[year] = (stats.yearlyData[year] || 0) + 1;
      stats.latestYear = Math.max(stats.latestYear, year);
    });

    // トレンド計算
    statsMap.forEach(stats => {
      const years = Object.keys(stats.yearlyData).map(Number).sort();
      if (years.length >= 2) {
        const lastYear = years[years.length - 1];
        const prevYear = years[years.length - 2];
        const lastCount = stats.yearlyData[lastYear] || 0;
        const prevCount = stats.yearlyData[prevYear] || 0;
        
        if (prevCount > 0) {
          const change = ((lastCount - prevCount) / prevCount) * 100;
          stats.trendPercentage = Math.abs(change);
          
          if (change > 5) stats.trend = 'up';
          else if (change < -5) stats.trend = 'down';
          else stats.trend = 'stable';
        }
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalPlayers - a.totalPlayers);
  }, [playersData]);

  // 年度別比較データ
  const yearComparisons = useMemo(() => {
    const comparisons: YearComparison[] = [];
    
    availableYears.forEach(year => {
      const yearPlayers = playersData.filter(player => {
        const playerYear = player.filingDate ? new Date(player.filingDate).getFullYear() : new Date().getFullYear();
        return playerYear === year;
      });
      
      // 学校別集計
      const schoolCounts = new Map<string, number>();
      const prefectureCounts = new Map<string, number>();
      
      yearPlayers.forEach(player => {
        const school = player.school || '不明';
        const prefecture = player.prefecture || '不明';
        
        schoolCounts.set(school, (schoolCounts.get(school) || 0) + 1);
        prefectureCounts.set(prefecture, (prefectureCounts.get(prefecture) || 0) + 1);
      });
      
      const topSchools = Array.from(schoolCounts.entries())
        .map(([school, count]) => ({
          school,
          count,
          percentage: (count / yearPlayers.length) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      comparisons.push({
        year,
        totalPlayers: yearPlayers.length,
        topSchools,
        prefectureStats: Object.fromEntries(prefectureCounts),
      });
    });
    
    return comparisons.sort((a, b) => b.year - a.year);
  }, [playersData, availableYears]);

  // 選択年度の学校リスト
  const schoolsInSelectedYear = useMemo(() => {
    const yearData = yearComparisons.find(comp => comp.year === selectedYear);
    return yearData?.topSchools.map(s => s.school) || [];
  }, [yearComparisons, selectedYear]);

  // チャートデータ生成
  const generateTrendChartData = () => {
    if (!selectedSchool) return null;
    
    const schoolData = schoolStats.find(s => s.school === selectedSchool);
    if (!schoolData) return null;
    
    const years = Object.keys(schoolData.yearlyData).map(Number).sort();
    const data = years.map(year => schoolData.yearlyData[year] || 0);
    
    return {
      labels: years,
      datasets: [{
        label: `${selectedSchool} 選手数推移`,
        data,
        borderColor: chartColors.primary,
        backgroundColor: chartColors.background.primary,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: chartColors.primary,
        pointBorderColor: mode === 'dark' ? muiTheme.palette.background.paper : '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
      }]
    };
  };

  const generateComparisonChartData = () => {
    const currentYear = yearComparisons.find(comp => comp.year === selectedYear);
    const prevYear = yearComparisons.find(comp => comp.year === selectedYear - 1);
    
    if (!currentYear || !prevYear) return null;
    
    const schools = currentYear.topSchools.slice(0, 5).map(s => s.school);
    const currentData = schools.map(school => 
      currentYear.topSchools.find(s => s.school === school)?.count || 0
    );
    const prevData = schools.map(school => 
      prevYear.topSchools.find(s => s.school === school)?.count || 0
    );
    
    return {
      labels: schools,
      datasets: [
        {
          label: `${selectedYear}年`,
          data: currentData,
          backgroundColor: chartColors.primary,
          borderColor: chartColors.primary,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: `${selectedYear - 1}年`,
          data: prevData,
          backgroundColor: chartColors.secondary,
          borderColor: chartColors.secondary,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    };
  };

  // チャートオプションの共通設定
  const getChartOptions = (chartType: 'line' | 'bar') => ({
    responsive: true,
    maintainAspectRatio: false,
    backgroundColor: mode === 'dark' ? muiTheme.palette.background.default : '#ffffff',
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: muiTheme.palette.text.primary,
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: muiTheme.typography.fontFamily,
            weight: 'normal' as const,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: mode === 'dark' ? '#374151' : '#ffffff',
        titleColor: mode === 'dark' ? '#ffffff' : '#1f2937',
        bodyColor: mode === 'dark' ? '#d1d5db' : '#374151',
        borderColor: mode === 'dark' ? '#6b7280' : '#d1d5db',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          size: 13,
          weight: 'bold' as const,
          family: muiTheme.typography.fontFamily,
        },
        bodyFont: {
          size: 12,
          family: muiTheme.typography.fontFamily,
        },
        padding: 12,
      },
    },
    scales: {
      x: {
        ticks: {
          color: muiTheme.palette.text.secondary,
          font: {
            size: 11,
            family: muiTheme.typography.fontFamily,
          },
        },
        grid: {
          color: mode === 'dark' ? '#374151' : '#e5e7eb',
          lineWidth: 1,
        },
        border: {
          color: mode === 'dark' ? '#4b5563' : '#d1d5db',
        },
      },
      y: {
        ticks: {
          color: muiTheme.palette.text.secondary,
          font: {
            size: 11,
            family: muiTheme.typography.fontFamily,
          },
        },
        grid: {
          color: mode === 'dark' ? '#374151' : '#e5e7eb',
          lineWidth: 1,
        },
        border: {
          color: mode === 'dark' ? '#4b5563' : '#d1d5db',
        },
        beginAtZero: true,
      },
    },
    ...(chartType === 'line' && {
      elements: {
        line: {
          borderWidth: 3,
        },
        point: {
          radius: 4,
          hoverRadius: 6,
          borderWidth: 2,
        },
      },
    }),
  });

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" />;
      case 'down': return <TrendingDown color="error" />;
      default: return <CompareArrows color="action" />;
    }
  };

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
          <Box display="flex" alignItems="center" gap={2} mb={2}>
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
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">学校別統計・年度比較分析</Typography>
            <Box display="flex" gap={1}>
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
                <IconButton onClick={exportData}>
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Box display="flex" gap={2} flexWrap="wrap">
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
        <Box display="flex" flexWrap="wrap" gap={3}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '2 1 65%' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedYear}年度 学校別ランキング
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>順位</TableCell>
                        <TableCell>学校名</TableCell>
                        <TableCell align="right">総選手数</TableCell>
                        <TableCell align="right">高校生</TableCell>
                        <TableCell align="right">大学生</TableCell>
                        <TableCell>都道府県</TableCell>
                        <TableCell>傾向</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schoolStats.slice(0, 20).map((stats, index) => (
                        <TableRow key={stats.school} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{stats.school}</TableCell>
                          <TableCell align="right">
                            <Chip label={stats.totalPlayers} color="primary" size="small" />
                          </TableCell>
                          <TableCell align="right">{stats.highschoolCount}</TableCell>
                          <TableCell align="right">{stats.universityCount}</TableCell>
                          <TableCell>{stats.prefecture}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getTrendIcon(stats.trend)}
                              {stats.trendPercentage > 0 && (
                                <Typography variant="caption">
                                  {stats.trendPercentage.toFixed(1)}%
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                  統計サマリー
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">総学校数</Typography>
                  <Typography variant="h4">{schoolStats.length}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">総選手数</Typography>
                  <Typography variant="h4">{playersData.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">平均選手数/校</Typography>
                  <Typography variant="h4">
                    {schoolStats.length > 0 ? (playersData.length / schoolStats.length).toFixed(1) : 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* 年度比較表示 */}
      {viewMode === 'comparison' && (
        <Box display="flex" flexWrap="wrap" gap={3}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  年度別比較 (上位5校)
                </Typography>
                {generateComparisonChartData() && (
                  <Bar 
                    data={generateComparisonChartData()!} 
                    options={{
                      ...getChartOptions('bar'),
                      plugins: {
                        ...getChartOptions('bar').plugins,
                        title: { 
                          display: true, 
                          text: `${selectedYear} vs ${selectedYear - 1}`,
                          color: muiTheme.palette.text.primary,
                          font: {
                            size: 14,
                            weight: 'bold' as const,
                            family: muiTheme.typography.fontFamily,
                          },
                        }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  年度推移
                </Typography>
                <Box display="flex" gap={2} mb={2}>
                  {yearComparisons.slice(0, 5).map(comp => (
                    <Card key={comp.year} sx={{ minWidth: 100 }}>
                      <CardContent sx={{ textAlign: 'center', py: 1 }}>
                        <Typography variant="h6">{comp.year}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {comp.totalPlayers}名
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* 推移分析表示 */}
      {viewMode === 'trends' && selectedSchool && (
        <Box>
          <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedSchool} - 選手数推移
                </Typography>
                {generateTrendChartData() && (
                  <Line 
                    data={generateTrendChartData()!}
                    options={{
                      ...getChartOptions('line'),
                      plugins: {
                        ...getChartOptions('line').plugins,
                        title: { 
                          display: true, 
                          text: '年度別選手数推移',
                          color: muiTheme.palette.text.primary,
                          font: {
                            size: 14,
                            weight: 'bold' as const,
                            family: muiTheme.typography.fontFamily,
                          },
                        }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
        </Box>
      )}
    </Box>
  );
};

export default SchoolStatistics;