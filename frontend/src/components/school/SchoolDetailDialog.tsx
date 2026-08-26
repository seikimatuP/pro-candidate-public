import React from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import type { SchoolStats } from '../../hooks/useSchoolManagement';
import { isHighschoolPlayer } from '../../utils/playerType';

interface SchoolDetailDialogProps {
  open: boolean;
  onClose: () => void;
  school: SchoolStats | null;
}

export const SchoolDetailDialog: React.FC<SchoolDetailDialogProps> = ({
  open,
  onClose,
  school,
}) => {
  if (!school) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1
          }}>
          <SchoolIcon />
          {school.name} - 詳細情報
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box>
          {/* 選手一覧 */}
          <Typography variant="h6" gutterBottom>
            所属選手一覧
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
            <List dense>
              {school.players.map((player, index) => (
                <React.Fragment key={player.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}>
                          <Typography variant="body1">{player.name}</Typography>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1
                            }}>
                            <Chip
                              label={isHighschoolPlayer(player) ? '高校' : '大学'}
                              color={isHighschoolPlayer(player) ? 'success' : 'warning'}
                              size="small"
                            />
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{
                          color: "text.disabled"
                        }}>
                          ID: {player.id}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < school.players.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};
