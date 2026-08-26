import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgTint?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, bgTint }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: bgTint || undefined,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${alpha(color, 0.15)}`,
        }
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="subtitle2" sx={{
              fontWeight: "600"
            }}>
              {title}
            </Typography>
            <Typography
              variant="h4"
              component="h2"
              sx={{
                fontWeight: "700",
                color: theme.palette.text.primary
              }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: alpha(color, 0.12),
              color: color,
              borderRadius: 3,
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
