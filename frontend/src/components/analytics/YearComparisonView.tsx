import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Bar } from 'react-chartjs-2';
import type { YearComparison } from './hooks/useSchoolStats';
import { generateComparisonChartData, getChartOptions } from './utils/chartHelpers';

interface YearComparisonViewProps {
  selectedYear: number;
  yearComparisons: YearComparison[];
  chartColors: {
    primary: string;
    secondary: string;
    background: { primary: string; secondary: string };
  };
}

export const YearComparisonView: React.FC<YearComparisonViewProps> = ({
  selectedYear,
  yearComparisons,
  chartColors,
}) => {
  const muiTheme = useMuiTheme();

  const comparisonData = generateComparisonChartData(selectedYear, yearComparisons, chartColors);

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 3
      }}>
      <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              年度別比較 (上位5校)
            </Typography>
            {comparisonData && (
              <Bar
                data={comparisonData}
                options={{
                  ...getChartOptions('bar', muiTheme),
                  plugins: {
                    ...getChartOptions('bar', muiTheme).plugins,
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
            <Box
              sx={{
                display: "flex",
                gap: 2,
                mb: 2
              }}>
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
  );
};
