import type { Theme } from '@mui/material/styles';
import type { SchoolStats, YearComparison } from '../hooks/useSchoolStats';

interface ChartColors {
  primary: string;
  secondary: string;
  background: {
    primary: string;
    secondary: string;
  };
}

export const generateTrendChartData = (
  selectedSchool: string,
  schoolStats: SchoolStats[],
  chartColors: ChartColors,
  muiTheme: Theme,
) => {
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
      pointBorderColor: muiTheme.palette.background.paper,
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 3,
    }]
  };
};

export const generateComparisonChartData = (
  selectedYear: number,
  yearComparisons: YearComparison[],
  chartColors: ChartColors,
) => {
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

export const getChartOptions = (
  chartType: 'line' | 'bar',
  muiTheme: Theme,
) => ({
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
      backgroundColor: muiTheme.palette.background.paper,
      titleColor: muiTheme.palette.text.primary,
      bodyColor: muiTheme.palette.text.secondary,
      borderColor: muiTheme.palette.divider,
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
        color: muiTheme.palette.divider,
        lineWidth: 1,
      },
      border: {
        color: muiTheme.palette.divider,
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
        color: muiTheme.palette.divider,
        lineWidth: 1,
      },
      border: {
        color: muiTheme.palette.divider,
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
