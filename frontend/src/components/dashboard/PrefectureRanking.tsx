import React from 'react';
import { Box, Typography, LinearProgress, useTheme, alpha } from '@mui/material';
import { Place } from '@mui/icons-material';
import type { PlayerData } from '../../types/player';

interface PrefectureRankingProps {
  players: PlayerData[];
}

export const PrefectureRanking: React.FC<PrefectureRankingProps> = ({ players }) => {
  const theme = useTheme();

  // 都道府県別集計
  const ranking = React.useMemo(() => {
    const counts: Record<string, number> = {};
    players.forEach(p => {
      if (p.prefecture) {
        counts[p.prefecture] = (counts[p.prefecture] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [players]);

  const maxCount = ranking.length > 0 ? ranking[0].count : 0;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3
        }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: "700",
            display: 'flex',
            alignItems: 'center'
          }}>
          <Place sx={{ mr: 1, color: 'warning.main' }} />
          都道府県別ランキング
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {ranking.length === 0 ? (
          <Typography align="center" sx={{
            color: "text.secondary"
          }}>データがありません</Typography>
        ) : (
          ranking.map((item, index) => (
            <Box key={item.name}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5
                }}>
                <Typography variant="body2" sx={{
                  fontWeight: "600"
                }}>
                  {index + 1}. {item.name}
                </Typography>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {item.count}名
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(item.count / maxCount) * 100} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: theme.palette.warning.main,
                        borderRadius: 4,
                      }
                    }}
                  />
                </Box>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};
