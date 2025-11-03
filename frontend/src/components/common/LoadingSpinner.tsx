import { Box, CircularProgress, Typography } from '@mui/material';

export function LoadingSpinner() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="textSecondary">
        ページを読み込み中...
      </Typography>
    </Box>
  );
}
