import React, { memo, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TablePagination,
  Skeleton,
  styled,
} from '@mui/material';
import VirtualizedPlayerRow from './VirtualizedPlayerRow';
import type { PlayerData } from '../../types/player';

interface VirtualizedPlayerTableProps {
  players: PlayerData[];
  loading?: boolean;
  onPlayerClick?: (player: PlayerData) => void;
  onEditClick?: (player: PlayerData) => void;
  onDeleteClick?: (player: PlayerData) => void;
  title?: string;
  isAdmin?: boolean;
  height?: number; // テーブル全体の高さ
}

// スタイル付きテーブルヘッダー
const TableHeader = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '2fr 2fr 1fr 2fr 1.5fr 1.5fr',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[100],
  borderBottom: `1px solid ${theme.palette.divider}`,
  fontWeight: 600,
  fontSize: '0.875rem',
  position: 'sticky',
  top: 0,
  zIndex: 1,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  // レスポンシブ対応
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1.5fr 1.5fr 0.8fr 1.5fr 1fr 1fr',
    padding: theme.spacing(1.5),
    fontSize: '0.8rem',
  },
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: '1fr 1fr 0.7fr 1fr 0.8fr 0.8fr',
    padding: theme.spacing(1),
    fontSize: '0.75rem',
  },
}));

// スタイル付きテーブルセル
const HeaderCell = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
}));

/**
 * VirtualizedPlayerTable - 選手テーブルコンポーネント
 *
 * 最適化技術:
 * 1. React.memo + useCallback でメモ化
 * 2. useMemoによるページネーション処理最適化
 * 3. CSS Grid による効率的なレイアウト
 */
export const VirtualizedPlayerTable: React.FC<VirtualizedPlayerTableProps> = memo(({
  players,
  loading = false,
  onPlayerClick,
  onEditClick,
  onDeleteClick,
  title,
  isAdmin = false,
  height = 600,
}) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(100); // 仮想スクロール用に大きめの値

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

  // 行の高さ（固定）
  const ROW_HEIGHT = 72;

  // ローディングスケルトンのメモ化（レスポンシブ対応）
  const loadingRows = useMemo(() => (
    Array.from({ length: Math.min(10, rowsPerPage) }).map((_, index) => (
      <Box
        key={`skeleton-${index}`}
        sx={{
          display: 'grid',
          gridTemplateColumns: '2fr 2fr 1fr 2fr 1.5fr 1.5fr',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          // レスポンシブグリッド
          '@media (max-width: 960px)': {
            gridTemplateColumns: '1.5fr 1.5fr 0.8fr 1.5fr 1fr 1fr',
            p: 1.5,
          },
          '@media (max-width: 600px)': {
            gridTemplateColumns: '1fr 1fr 0.7fr 1fr 0.8fr 0.8fr',
            p: 1,
          },
        }}
      >
        {Array.from({ length: 6 }).map((_, cellIndex) => (
          <Box key={`skeleton-cell-${cellIndex}`} p={1}>
            <Skeleton variant="text" />
          </Box>
        ))}
      </Box>
    ))
  ), [rowsPerPage]);

  return (
    <Paper>
      {title && (
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{title}</Typography>
        </Box>
      )}

      {/* テーブルヘッダー */}
      <TableHeader>
        <HeaderCell>氏名</HeaderCell>
        <HeaderCell>学校</HeaderCell>
        <HeaderCell>区分</HeaderCell>
        <HeaderCell>都道府県・地域</HeaderCell>
        <HeaderCell>登録日</HeaderCell>
        <HeaderCell sx={{ justifyContent: 'center' }}>操作</HeaderCell>
      </TableHeader>

      {/* テーブルボディ（一時的に仮想スクロール無効化・通常レンダリング） */}
      {loading ? (
        <Box>{loadingRows}</Box>
      ) : paginatedPlayers.length > 0 ? (
        <Box sx={{ maxHeight: height, overflow: 'auto' }}>
          {paginatedPlayers.map((player, index) => (
            <VirtualizedPlayerRow
              key={player.id || `player-${index}`}
              player={player}
              isAdmin={isAdmin}
              onPlayerClick={onPlayerClick}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              style={{ height: ROW_HEIGHT }}
            />
          ))}
        </Box>
      ) : (
        <Box py={8} textAlign="center">
          <Typography variant="h6" color="textSecondary" gutterBottom>
            データが存在しません
          </Typography>
          <Typography variant="body2" color="textSecondary">
            選択した年度の選手データがまだ登録されていません
          </Typography>
        </Box>
      )}

      {/* ページネーション */}
      {players.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[50, 100, 200, 500]}
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

VirtualizedPlayerTable.displayName = 'VirtualizedPlayerTable';

export default VirtualizedPlayerTable;
