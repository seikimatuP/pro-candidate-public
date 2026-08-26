import React from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import { Person, School } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { PlayerData } from '../../types/player';

interface RecentPlayersProps {
  players: PlayerData[];
  loading?: boolean;
}

export const RecentPlayers: React.FC<RecentPlayersProps> = ({ players, loading = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  // 最新5件のみ表示
  const recentPlayers = players.slice(0, 5);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2
        }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: "700",
            display: 'flex',
            alignItems: 'center'
          }}>
          <Person sx={{ mr: 1, color: 'primary.main' }} />
          最新の登録選手
        </Typography>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto' }}>
        {recentPlayers.length === 0 ? (
          <Typography
            align="center"
            sx={{
              color: "text.secondary",
              py: 4
            }}>
            データがありません
          </Typography>
        ) : (
          recentPlayers.map((player, index) => (
            <ListItem 
              key={player.id} 
              disableGutters
              sx={{ 
                py: 1.5,
                borderBottom: index < recentPlayers.length - 1 ? `1px solid ${alpha(theme.palette.divider, 0.5)}` : 'none',
                transition: 'background-color 0.2s',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  borderRadius: 2,
                  px: 1,
                  mx: -1
                }
              }}
              onClick={() => navigate(player.type === 'highschool' ? '/highschool-players' : '/university-players')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(player.type === 'highschool' ? '/highschool-players' : '/university-players');
                }
              }}
              tabIndex={0}
              role="button"
            >
              <ListItemAvatar>
                <Avatar 
                  sx={{ 
                    bgcolor: player.type === 'highschool' 
                      ? alpha(theme.palette.primary.main, 0.1) 
                      : alpha(theme.palette.secondary.main, 0.1),
                    color: player.type === 'highschool' 
                      ? theme.palette.primary.main 
                      : theme.palette.secondary.main
                  }}
                >
                  <School fontSize="small" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1
                    }}>
                    <Typography variant="subtitle2" sx={{
                      fontWeight: "600"
                    }}>
                      {player.name}
                    </Typography>
                    <Chip 
                      label={player.type === 'highschool' ? '高校' : '大学'} 
                      size="small" 
                      sx={{ 
                        height: 20, 
                        fontSize: '0.65rem',
                        bgcolor: player.type === 'highschool' 
                          ? alpha(theme.palette.primary.main, 0.1) 
                          : alpha(theme.palette.secondary.main, 0.1),
                        color: player.type === 'highschool' 
                          ? theme.palette.primary.main 
                          : theme.palette.secondary.main
                      }} 
                    />
                  </Box>
                }
                secondary={
                  <Box
                    component="span"
                    sx={{
                      display: "flex",
                      flexDirection: "column"
                    }}>
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>
                      {player.school} ({player.prefecture})
                    </Typography>
                    <Typography variant="caption" sx={{
                      color: "text.disabled"
                    }}>
                      {new Date(player.filingDate).toLocaleDateString('ja-JP')} 登録
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))
        )}
      </List>
    </Box>
  );
};
