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
import { useTheme, useSemanticColors } from '../../contexts/ThemeContext';
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
  height?: number | string;
  showTotalOnly?: boolean;
  variant?: 'card' | 'plain';
}

export const TrendChart: React.FC<TrendChartProps> = ({ 
  title, 
  data, 
  trendData, 
  height = 300, 
  showTotalOnly = false,
  variant = 'card'
}) => {
  const [showHighschool, setShowHighschool] = React.useState(true);
  const [showUniversity, setShowUniversity] = React.useState(true);
  const [showTotal, setShowTotal] = React.useState(true);
  const { mode } = useTheme();
  const muiTheme = useMuiTheme();

  const semantic = useSemanticColors();

  // セマンティックトークンからチャート色を参照
  const chartColors = React.useMemo(() => semantic.chart, [semantic]);

  // Chart.js用の共通カラートークン
  const chartThemeColors = React.useMemo(() => ({
    pointBorder: muiTheme.palette.background.paper,
    tooltipBg: mode === 'dark' ? muiTheme.palette.grey[800] : muiTheme.palette.background.paper,
    tooltipTitle: muiTheme.palette.text.primary,
    tooltipBody: muiTheme.palette.text.secondary,
    tooltipBorder: muiTheme.palette.divider,
    gridLine: muiTheme.palette.divider,
    axisBorder: mode === 'dark' ? muiTheme.palette.grey[600] : muiTheme.palette.grey[400],
    emptyBg: muiTheme.palette.action.hover,
    emptyBorder: muiTheme.palette.divider,
  }), [mode, muiTheme]);

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
          pointBorderColor: chartThemeColors.pointBorder,
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
          pointBorderColor: chartThemeColors.pointBorder,
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
        pointBorderColor: chartThemeColors.pointBorder,
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
        pointBorderColor: chartThemeColors.pointBorder,
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
  }, [data, trendData, showHighschool, showUniversity, showTotal, showTotalOnly, chartColors, chartThemeColors]);

  const options: ChartOptions<'line'> = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    backgroundColor: muiTheme.palette.background.paper,
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
        backgroundColor: chartThemeColors.tooltipBg,
        titleColor: chartThemeColors.tooltipTitle,
        bodyColor: chartThemeColors.tooltipBody,
        borderColor: chartThemeColors.tooltipBorder,
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
          color: chartThemeColors.gridLine,
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
          color: chartThemeColors.axisBorder,
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
          color: chartThemeColors.gridLine,
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
          color: chartThemeColors.axisBorder,
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
  }), [muiTheme, chartThemeColors]);

  const renderContent = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2
        }}>
        <Typography variant="h6">
          {title}
        </Typography>
        {trendData && !showTotalOnly && (
          <Box
            sx={{
              display: "flex",
              gap: 1
            }}>
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
      <Box sx={{ flex: 1, minHeight: 0, height: variant === 'plain' ? '100%' : height }}>
        {chartData.labels.length > 0 && chartData.datasets.length > 0 ? (
          <Line options={options} data={chartData} />
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: 'text.secondary',
              backgroundColor: chartThemeColors.emptyBg,
              borderRadius: 1,
              border: `1px dashed ${chartThemeColors.emptyBorder}`,
              minHeight: 200
            }}>
            <Typography variant="body2">
              {chartData.labels.length === 0 ? 'データが存在しません' : 'グラフ表示するデータセットを選択してください'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  if (variant === 'plain') {
    return renderContent();
  }

  return (
    <Card>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};