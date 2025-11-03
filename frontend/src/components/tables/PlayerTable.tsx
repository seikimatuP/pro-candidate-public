import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Typography,
  Box,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  School,
  Visibility,
  Edit,
  Delete,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import type { PlayerData } from '../../types/player';

interface PlayerTableProps {
  players: PlayerData[];
  loading?: boolean;
  onPlayerClick?: (player: PlayerData) => void;
  onEditClick?: (player: PlayerData) => void;
  onDeleteClick?: (player: PlayerData) => void;
  title?: string;
}

export const PlayerTable: React.FC<PlayerTableProps> = ({
  players,
  loading = false,
  onPlayerClick,
  onEditClick,
  onDeleteClick,
  title
}) => {
  const { user } = useAuth();
  const isAdmin = user?.groups?.includes('admin') || false;
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedPlayers = React.useMemo(() => {
    const startIndex = page * rowsPerPage;
    return players.slice(startIndex, startIndex + rowsPerPage);
  }, [players, page, rowsPerPage]);

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
              Array.from({ length: rowsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedPlayers.length > 0 ? (
              paginatedPlayers.map((player) => (
                <TableRow 
                  key={player.id} 
                  hover 
                  onClick={() => onPlayerClick?.(player)}
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
                      label={player.type === 'highschool' ? '高校' : player.type === 'university' ? '大学' : player.id.includes('highschool') ? '高校' : '大学'}
                      color={player.type === 'highschool' || player.id.includes('highschool') ? 'success' : 'warning'}
                      size="small"
                      icon={<School />}
                    />
                  </TableCell>
                  <TableCell>{player.prefecture || player.region || 'N/A'}</TableCell>
                  <TableCell>{player.filingDate ? new Date(player.filingDate).toLocaleDateString('ja-JP') : 'N/A'}</TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={0.5}>
                      <Tooltip title="詳細表示">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayerClick?.(player);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {isAdmin && onEditClick && (
                        <Tooltip title="編集">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditClick(player);
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteClick(player);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
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
};