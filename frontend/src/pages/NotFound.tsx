import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { HomeRounded, SearchOffRounded } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        gap: 2,
        px: 2,
      }}
    >
      <SearchOffRounded sx={{ fontSize: 64, color: 'text.disabled' }} aria-hidden />
      <Typography
        variant="h2"
        component="h1"
        sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1 }}
      >
        404
      </Typography>
      <Typography variant="h6" component="p" sx={{ fontWeight: 600 }}>
        ページが見つかりません
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          wordBreak: 'break-all'
        }}>
        {location.pathname} は存在しないか、移動した可能性があります。
      </Typography>
      <Button
        variant="contained"
        startIcon={<HomeRounded />}
        onClick={() => navigate('/', { replace: true })}
        sx={{ mt: 2, borderRadius: 2 }}
      >
        ダッシュボードへ戻る
      </Button>
    </Box>
  );
};
