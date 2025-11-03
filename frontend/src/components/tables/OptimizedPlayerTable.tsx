import React, { memo, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Typography,
  Box,
  Skeleton,
} from '@mui/material';
import PlayerRow from './PlayerRow';
import type { PlayerData } from '../../types/player';

interface OptimizedPlayerTableProps {
  players: PlayerData[];
  loading?: boolean;
  onPlayerClick?: (player: PlayerData) => void;
  onEditClick?: (player: PlayerData) => void;
  onDeleteClick?: (player: PlayerData) => void;
  title?: string;
  isAdmin?: boolean;
}

/**
 * OptimizedPlayerTable - パフォーマンス最適化版の選手テーブルコンポーネント
 *
 * 最適化技術:
 * 1. React.memo でコンポーネント全体をメモ化
 * 2. PlayerRow を個別コンポーネントとして分離してメモ化
 * 3. useCallback でハンドラ関数をメモ化
 * 4. useMemo で計算結果をキャッシュ
 * 5. ページネーション処理を最適化
 */
export const OptimizedPlayerTable: React.FC<OptimizedPlayerTableProps> = memo(({
  players,
  loading = false,
  onPlayerClick,
  onEditClick,
  onDeleteClick,
  title,
  isAdmin = false,
}) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // ページ変更ハンドラのメモ化
  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  // 行数変更ハンドラのメモ化
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // ページネーション処理の最適化
  const paginatedPlayers = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return players.slice(startIndex, startIndex + rowsPerPage);
  }, [players, page, rowsPerPage]);

  // ローディングスケルトンのメモ化
  const loadingRows = useMemo(() => (
    Array.from({ length: rowsPerPage }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        {Array.from({ length: 6 }).map((_, cellIndex) => (
          <TableCell key={`skeleton-cell-${cellIndex}`}>
            <Skeleton variant="text" />
          </TableCell>
        ))}
      </TableRow>
    ))
  ), [rowsPerPage]);

  return (
    <Paper>
      {title && (
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{title}</Typography>
        </Box>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>氏名</TableCell>
              <TableCell>学校</TableCell>
              <TableCell>区分</TableCell>
              <TableCell>都道府県・地域</TableCell>
              <TableCell>登録日</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              loadingRows
            ) : paginatedPlayers.length > 0 ? (
              paginatedPlayers.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isAdmin={isAdmin}
                  onPlayerClick={onPlayerClick}
                  onEditClick={onEditClick}
                  onDeleteClick={onDeleteClick}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Box py={4}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      データが存在しません
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      選択した年度の選手データがまだ登録されていません
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {players.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={players.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="1ページの行数:"
          labelDisplayedRows={({ from, to, count }) =>
            `${count}件中 ${from}-${to}件目`
          }
        />
      )}
    </Paper>
  );
});

OptimizedPlayerTable.displayName = 'OptimizedPlayerTable';

export default OptimizedPlayerTable;
