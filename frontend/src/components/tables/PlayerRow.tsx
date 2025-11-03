import React, { memo, useCallback } from 'react';
import {
  TableCell,
  TableRow,
  Chip,
  IconButton,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import {
  School,
  Visibility,
  Edit,
  Delete,
} from '@mui/icons-material';
import type { PlayerData } from '../../types/player';

interface PlayerRowProps {
  player: PlayerData;
  isAdmin: boolean;
  onPlayerClick?: (player: PlayerData) => void;
  onEditClick?: (player: PlayerData) => void;
  onDeleteClick?: (player: PlayerData) => void;
}

/**
 * PlayerRow - メモ化された選手テーブル行コンポーネント
 *
 * 最適化技術:
 * 1. React.memo で不要な再レンダリングを防止
 * 2. useCallback でイベントハンドラをメモ化
 * 3. 浅い比較で props の変更を検出
 *
 * メモ化の効果:
 * - 選手リストの一部のみが変更された場合、他の行は再レンダリングされない
 * - ページネーション時のパフォーマンス向上
 * - フィルタリング時の不要な再レンダリング削減
 */
const PlayerRow: React.FC<PlayerRowProps> = memo(({
  player,
  isAdmin,
  onPlayerClick,
  onEditClick,
  onDeleteClick,
}) => {
  // クリックハンドラのメモ化
  const handleRowClick = useCallback(() => {
    onPlayerClick?.(player);
  }, [onPlayerClick, player]);

  const handleViewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayerClick?.(player);
  }, [onPlayerClick, player]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick?.(player);
  }, [onEditClick, player]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick?.(player);
  }, [onDeleteClick, player]);

  // 選手タイプの判定（メモ化）
  const playerType = player.type === 'highschool' || player.id.includes('highschool') ? 'highschool' : 'university';
  const isHighschool = playerType === 'highschool';

  return (
    <TableRow
      hover
      onClick={handleRowClick}
      sx={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
    >
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {player.name}
        </Typography>
      </TableCell>
      <TableCell>{player.school}</TableCell>
      <TableCell>
        <Chip
          label={isHighschool ? '高校' : '大学'}
          color={isHighschool ? 'success' : 'warning'}
          size="small"
          icon={<School />}
        />
      </TableCell>
      <TableCell>{player.prefecture || player.region || 'N/A'}</TableCell>
      <TableCell>
        {player.filingDate
          ? new Date(player.filingDate).toLocaleDateString('ja-JP')
          : 'N/A'}
      </TableCell>
      <TableCell align="center">
        <Box display="flex" justifyContent="center" gap={0.5}>
          <Tooltip title="詳細表示">
            <IconButton size="small" onClick={handleViewClick}>
              <Visibility />
            </IconButton>
          </Tooltip>
          {isAdmin && onEditClick && (
            <Tooltip title="編集">
              <IconButton
                size="small"
                color="primary"
                onClick={handleEditClick}
              >
                <Edit />
              </IconButton>
            </Tooltip>
          )}
          {isAdmin && onDeleteClick && (
            <Tooltip title="削除">
              <IconButton
                size="small"
                color="error"
                onClick={handleDeleteClick}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
});

PlayerRow.displayName = 'PlayerRow';

export default PlayerRow;
