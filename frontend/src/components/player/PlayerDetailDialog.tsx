import React from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
} from '@mui/material';
import { Sports, School } from '@mui/icons-material';
import type { PlayerData } from '../../types/player';
import { isHighschoolPlayer } from '../../utils/playerType';

interface PlayerDetailDialogProps {
  open: boolean;
  onClose: () => void;
  player: PlayerData | null;
}

export const PlayerDetailDialog: React.FC<PlayerDetailDialogProps> = ({
  open,
  onClose,
  player,
}) => {
  if (!player) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1
          }}>
          <Sports />
          選手詳細
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{
          p: 2
        }}>
          <Typography variant="h6" gutterBottom>
            {player.name}
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            {player.school}
          </Typography>
          <Chip
            label={isHighschoolPlayer(player) ? '高校' : '大学'}
            color={isHighschoolPlayer(player) ? 'success' : 'warning'}
            size="small"
            icon={<School />}
            sx={{ mb: 1 }}
          />
          <Typography
            variant="caption"
            sx={{
              color: "text.disabled",
              display: "block"
            }}>
            ID: {player.id}
          </Typography>
          {player.prefecture && (
            <Typography variant="body2">都道府県: {player.prefecture}</Typography>
          )}
          {player.region && <Typography variant="body2">地域: {player.region}</Typography>}
          {player.filingDate && (
            <Typography variant="body2">
              登録日: {new Date(player.filingDate).toLocaleDateString('ja-JP')}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};
