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
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';
import type { ScrapingHistoryRecord } from '../../types/player';

// 日時フォーマット
export const formatDateTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// タイプラベル
export const getTypeLabel = (record: ScrapingHistoryRecord): string => {
  if (record.typeLabel) {
    return record.typeLabel;
  }
  
  const yearPrefix = record.year ? `${record.year}年度 ` : '';
  
  switch (record.type) {
    case 'highschool': return `${yearPrefix}高校生`;
    case 'university': return `${yearPrefix}大学生`;
    case 'both': return `${yearPrefix}高校生・大学生`;
    default: return record.type;
  }
};

// 件数表示コンポーネント
export const CountDisplay: React.FC<{ count: number }> = ({ count }) => (
  <Typography variant="body2" component="span" sx={{
    fontWeight: "bold"
  }}>
    {count}件
  </Typography>
);

// 差分表示コンポーネント
export const DifferenceChip: React.FC<{ difference: number }> = ({ difference }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
    {difference !== 0 ? (
      <Chip
        icon={
          difference > 0 ? <TrendingUp /> : 
          difference < 0 ? <TrendingDown /> : 
          <Remove />
        }
        label={difference > 0 ? `+${difference}` : difference}
        color={difference > 0 ? 'success' : difference < 0 ? 'error' : 'default'}
        size="small"
        variant="filled"
      />
    ) : (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        ±0
      </Typography>
    )}
  </Box>
);

// 詳細ダイアログProps
interface ScrapingDetailDialogProps {
  open: boolean;
  onClose: () => void;
  record: ScrapingHistoryRecord | null;
}

// 詳細ダイアログコンポーネント
export const ScrapingDetailDialog: React.FC<ScrapingDetailDialogProps> = ({
  open,
  onClose,
  record,
}) => {
  if (!record) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>スクレイピング実行詳細</DialogTitle>
      <DialogContent>
        <Box>
          <Typography variant="h6" gutterBottom>
            基本情報
          </Typography>
          <Box sx={{
            mb: 2
          }}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              実行ID: {record.id}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              実行日時: {formatDateTime(record.timestamp)}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              環境: {record.environment}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              タイプ: {getTypeLabel(record)}
            </Typography>
            {record.updatePeriod && (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                更新期間: {record.updatePeriod}
                {record.daysSinceLastUpdate !== null && (
                  <span> （前回実行から{record.daysSinceLastUpdate}日経過）</span>
                )}
              </Typography>
            )}
            {record.lastExecutionDate && (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                前回実行日: {formatDateTime(record.lastExecutionDate)}
              </Typography>
            )}
          </Box>

          <Typography variant="h6" gutterBottom>
            実行結果
          </Typography>
          {record.results.highschool && (
            <Box sx={{
              mb: 2
            }}>
              <Typography variant="subtitle1" sx={{
                color: "success.main"
              }}>
                高校生データ
              </Typography>
              <Typography variant="body2">
                現在の件数: {record.results.highschool.currentCount}件
              </Typography>
              <Typography variant="body2">
                前回の件数: {record.results.highschool.previousCount}件
              </Typography>
              <Typography variant="body2">
                差分: {record.results.highschool.difference > 0 ? '+' : ''}{record.results.highschool.difference}件
              </Typography>
              {record.results.highschool.newPlayers.length > 0 && (
                <Typography variant="body2">
                  新規追加: {record.results.highschool.newPlayers.length}名
                </Typography>
              )}
              {record.results.highschool.removedPlayers.length > 0 && (
                <Typography variant="body2">
                  削除: {record.results.highschool.removedPlayers.length}名
                </Typography>
              )}
            </Box>
          )}

          {record.results.university && (
            <Box sx={{
              mb: 2
            }}>
              <Typography variant="subtitle1" sx={{
                color: "warning.main"
              }}>
                大学生データ
              </Typography>
              <Typography variant="body2">
                現在の件数: {record.results.university.currentCount}件
              </Typography>
              <Typography variant="body2">
                前回の件数: {record.results.university.previousCount}件
              </Typography>
              <Typography variant="body2">
                差分: {record.results.university.difference > 0 ? '+' : ''}{record.results.university.difference}件
              </Typography>
              {record.results.university.newPlayers.length > 0 && (
                <Typography variant="body2">
                  新規追加: {record.results.university.newPlayers.length}名
                </Typography>
              )}
              {record.results.university.removedPlayers.length > 0 && (
                <Typography variant="body2">
                  削除: {record.results.university.removedPlayers.length}名
                </Typography>
              )}
            </Box>
          )}

          <Typography variant="h6" gutterBottom>
            総合結果
          </Typography>
          <Box>
            <Typography variant="body2">
              総数: {record.summary.totalCurrent}件
            </Typography>
            <Typography variant="body2">
              前回総数: {record.summary.totalPrevious}件
            </Typography>
            <Typography variant="body2">
              総差分: {record.summary.totalDifference > 0 ? '+' : ''}{record.summary.totalDifference}件
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};
