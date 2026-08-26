import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Line } from 'react-chartjs-2';
import type { SchoolStats } from './hooks/useSchoolStats';
import { generateTrendChartData, getChartOptions } from './utils/chartHelpers';

interface SchoolTrendViewProps {
  selectedSchool: string;
  schoolStats: SchoolStats[];
  chartColors: {
    primary: string;
    secondary: string;
    background: { primary: string; secondary: string };
  };
}

export const SchoolTrendView: React.FC<SchoolTrendViewProps> = ({
  selectedSchool,
  schoolStats,
  chartColors,
}) => {
  const muiTheme = useMuiTheme();

  const trendData = generateTrendChartData(selectedSchool, schoolStats, chartColors, muiTheme);

  if (!selectedSchool) return null;

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {selectedSchool} - 選手数推移
          </Typography>
          {trendData && (
            <Line
              data={trendData}
              options={{
                ...getChartOptions('line', muiTheme),
                plugins: {
                  ...getChartOptions('line', muiTheme).plugins,
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
  );
};
