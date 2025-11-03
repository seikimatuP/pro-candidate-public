import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, Typography, Card, CardContent, Switch, FormControlLabel } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTheme } from '../../contexts/ThemeContext';
import type { TrendData } from '../../types/player';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TrendChartProps {
  title: string;
  data?: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension?: number;
    }>;
  };
  trendData?: TrendData[];
  height?: number;
  showTotalOnly?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({ 
  title, 
  data, 
  trendData, 
  height = 300, 
  showTotalOnly = false 
}) => {
  const [showHighschool, setShowHighschool] = React.useState(true);
  const [showUniversity, setShowUniversity] = React.useState(true);
  const [showTotal, setShowTotal] = React.useState(true);
  const { mode } = useTheme();
  const muiTheme = useMuiTheme();

  // アクセシビリティ準拠カスタム色パレット（WCAG AAA基準）
  const chartColors = React.useMemo(() => {
    if (mode === 'dark') {
      return {
        highschool: { border: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },
        university: { border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
        total: { border: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
      };
    } else {
      return {
        highschool: { border: muiTheme.palette.primary.main, bg: `${muiTheme.palette.primary.main}20` },
        university: { border: '#f57c00', bg: 'rgba(245, 124, 0, 0.1)' },
        total: { border: muiTheme.palette.secondary.main, bg: `${muiTheme.palette.secondary.main}20` },
      };
    }
  }, [mode, muiTheme]);

  const chartData = React.useMemo(() => {
    if (data) {
      return data;
    }
    
    if (!trendData || trendData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const labels = trendData.map(item => 
      new Date(item.date).toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric' 
      })
    );

    const datasets = [];

    if (!showTotalOnly) {
      if (showHighschool) {
        datasets.push({
          label: '高校生',
          data: trendData.map(item => item.highschoolCount),
          borderColor: chartColors.highschool.border,
          backgroundColor: chartColors.highschool.bg,
          tension: 0.1,
          pointBackgroundColor: chartColors.highschool.border,
          pointBorderColor: mode === 'dark' ? muiTheme.palette.background.paper : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        });
      }

      if (showUniversity) {
        datasets.push({
          label: '大学生',
          data: trendData.map(item => item.universityCount),
          borderColor: chartColors.university.border,
          backgroundColor: chartColors.university.bg,
          tension: 0.1,
          pointBackgroundColor: chartColors.university.border,
          pointBorderColor: mode === 'dark' ? muiTheme.palette.background.paper : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        });
      }
    }

    if (showTotal) {
      datasets.push({
        label: '合計',
        data: trendData.map(item => item.totalCount),
        borderColor: chartColors.total.border,
        backgroundColor: chartColors.total.bg,
        tension: 0.1,
        pointBackgroundColor: chartColors.total.border,
        pointBorderColor: mode === 'dark' ? muiTheme.palette.background.paper : '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
      });
    }

    // データが0件でも、少なくとも1つのデータセットがあればグラフを表示できる
    // labelsが存在してdatasetsが空の場合は、デフォルトで合計を表示
    if (labels.length > 0 && datasets.length === 0) {
      datasets.push({
        label: '合計',
        data: trendData.map(item => item.totalCount),
        borderColor: chartColors.total.border,
        backgroundColor: chartColors.total.bg,
        tension: 0.1,
        pointBackgroundColor: chartColors.total.border,
        pointBorderColor: mode === 'dark' ? muiTheme.palette.background.paper : '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
      });
    }

    return {
      labels,
      datasets
    };
  }, [data, trendData, showHighschool, showUniversity, showTotal, showTotalOnly, chartColors, mode, muiTheme.palette.background.paper]);

  const options: ChartOptions<'line'> = React.useMemo(() => ({
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
        mode: 'index',
        intersect: false,
        backgroundColor: mode === 'dark' ? '#374151' : '#ffffff',
        titleColor: mode === 'dark' ? '#ffffff' : '#1f2937',
        bodyColor: mode === 'dark' ? '#d1d5db' : '#374151',
        borderColor: mode === 'dark' ? '#6b7280' : '#d1d5db',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          size: 13,
          weight: 'bold',
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
        display: true,
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
        title: {
          display: true,
          text: '日付',
          color: muiTheme.palette.text.primary,
          font: {
            size: 12,
            weight: 'bold',
            family: muiTheme.typography.fontFamily,
          },
        },
        border: {
          color: mode === 'dark' ? '#4b5563' : '#d1d5db',
        },
      },
      y: {
        display: true,
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
        title: {
          display: true,
          text: '選手数',
          color: muiTheme.palette.text.primary,
          font: {
            size: 12,
            weight: 'bold',
            family: muiTheme.typography.fontFamily,
          },
        },
        border: {
          color: mode === 'dark' ? '#4b5563' : '#d1d5db',
        },
        beginAtZero: true,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    elements: {
      line: {
        borderWidth: 2,
      },
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2,
      },
    },
  }), [mode, muiTheme]);

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {title}
          </Typography>
          {trendData && !showTotalOnly && (
            <Box display="flex" gap={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showHighschool}
                    onChange={(e) => setShowHighschool(e.target.checked)}
                    size="small"
                  />
                }
                label="高校生"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showUniversity}
                    onChange={(e) => setShowUniversity(e.target.checked)}
                    size="small"
                  />
                }
                label="大学生"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showTotal}
                    onChange={(e) => setShowTotal(e.target.checked)}
                    size="small"
                  />
                }
                label="合計"
              />
            </Box>
          )}
        </Box>
        <Box height={height}>
          {chartData.labels.length > 0 && chartData.datasets.length > 0 ? (
            <Line options={options} data={chartData} />
          ) : (
            <Box 
              display="flex" 
              alignItems="center" 
              justifyContent="center" 
              height={height}
              sx={{ 
                color: 'text.secondary',
                backgroundColor: mode === 'dark' ? muiTheme.palette.background.default : '#fafafa',
                borderRadius: 1,
                border: `1px dashed ${mode === 'dark' ? '#4b5563' : '#d1d5db'}`,
              }}
            >
              <Typography variant="body2">
                {chartData.labels.length === 0 ? 'データが存在しません' : 'グラフ表示するデータセットを選択してください'}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};