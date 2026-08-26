import React from 'react';
import { Box, Typography, Chip, useTheme, alpha } from '@mui/material';

interface LabShellProps {
  children: React.ReactNode;
}

export const LabShell: React.FC<LabShellProps> = ({ children }) => {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Lab Header */}
        <Box sx={{ mb: 4, pb: 3, borderBottom: `2px solid ${theme.palette.divider}` }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 1
            }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: "800",
                color: "text.primary"
              }}>
              Design Lab
            </Typography>
            <Chip label="Final Review" size="small" color="primary" />
          </Box>
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              maxWidth: 700
            }}>
            カラーパレット比較やダッシュボードバリアントの検証ページ。
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 2,
              flexWrap: "wrap"
            }}>
            {[
              { label: 'カラーパレット比較', color: '#1e88e5' },
              { label: 'D改善版（円グラフ追加）', color: '#4caf50' },
              { label: 'D: 元版（比較用）', color: '#ef6c00' },
            ].map(v => (
              <Chip
                key={v.label}
                label={v.label}
                size="small"
                sx={{
                  bgcolor: alpha(v.color, 0.1),
                  color: v.color,
                  fontWeight: 600,
                  border: `1px solid ${alpha(v.color, 0.3)}`,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Variants */}
        {children}
      </Box>
    </Box>
  );
};
