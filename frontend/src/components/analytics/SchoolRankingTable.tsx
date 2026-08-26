import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CompareArrows,
  School,
} from '@mui/icons-material';
import type { SchoolStats } from './hooks/useSchoolStats';
import type { PlayerData } from '../../types/player';

interface SchoolRankingTableProps {
  selectedYear: number;
  schoolStats: SchoolStats[];
  playersData: PlayerData[];
}

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return <TrendingUp color="success" />;
    case 'down': return <TrendingDown color="error" />;
    default: return <CompareArrows color="action" />;
  }
};

export const SchoolRankingTable: React.FC<SchoolRankingTableProps> = ({
  selectedYear,
  schoolStats,
  playersData,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 3
      }}>
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
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1
                          }}>
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
            <Box sx={{
              mb: 2
            }}>
              <Typography variant="body2" color="textSecondary">総学校数</Typography>
              <Typography variant="h4">{schoolStats.length}</Typography>
            </Box>
            <Box sx={{
              mb: 2
            }}>
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
  );
};
