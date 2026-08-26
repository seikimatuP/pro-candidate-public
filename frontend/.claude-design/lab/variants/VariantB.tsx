import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  LinearProgress,
  Grid,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  ArrowUpward,
  ArrowDownward,
  FiberManualRecord,
  TrendingUp,
} from '@mui/icons-material';
import {
  mockStats,
  mockRecentPlayers,
  mockPrefectureRanking,
  mockTrendData,
  mockPlayerList,
  mockFilterOptions,
} from '../data/fixtures';

// ============================================================
// Variant B: Editorial Sports（スポーツ新聞エッセンス統合）
// - Bebas Neue を見出しのみに使用（Google Fonts: Bebas Neue）
//   <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
//   または index.html / index.css で @import url('...')
// - 赤アクセントを速報バッジ等にセマンティックに使用
// - 左ボーダー（4px）によるセクション区切り
// - Breaking-news ヘッダー → スコアボード風 StatGrid → コンテンツ
// ============================================================

const BEBAS_FONT = "'Bebas Neue', 'Arial Narrow', sans-serif";
const EDITORIAL_RED = '#d32f2f';
const EDITORIAL_RED_DARK = '#ef5350';

/** スコアボード風の統計セル */
const ScoreboardCell = ({ label, value, unit, change, accentColor }: {
  label: string; value: number | string; unit: string; change?: number; accentColor: string;
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{ textAlign: 'center', px: 2, py: 2.5, borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, '&:last-child': { borderRight: 'none' } }}>
      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: accentColor, display: 'block', mb: 0.5, fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.25 }}>
        <Typography sx={{ fontFamily: BEBAS_FONT, fontSize: 44, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: theme.palette.text.secondary }}>{unit}</Typography>
      </Box>
      {change !== undefined && (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, mt: 0.5, color: change > 0 ? '#2e7d32' : '#c62828', fontWeight: 600, fontSize: '0.75rem' }}>
          {change > 0 ? <ArrowUpward sx={{ fontSize: 13 }} /> : <ArrowDownward sx={{ fontSize: 13 }} />}
          {change > 0 ? '+' : ''}{change}
        </Box>
      )}
    </Box>
  );
};

export default function VariantB() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const highschoolColor = isDark ? '#4db6ac' : '#00897b';
  const universityColor = isDark ? '#ffb74d' : '#ef6c00';
  const editorialRed = isDark ? EDITORIAL_RED_DARK : EDITORIAL_RED;
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const subtleBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)';

  const maxTotal = Math.max(...mockTrendData.map((d) => d.total));

  // 共通テーブルヘッダースタイル
  const thSx = {
    fontWeight: 700,
    fontSize: '0.7rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'text.secondary',
    borderBottom: `2px solid ${borderColor}`,
  };

  const [search, setSearch] = React.useState('');
  const [prefecture, setPrefecture] = React.useState('');

  const filteredPlayers = React.useMemo(() => {
    return mockPlayerList.filter((p) => {
      const matchSearch =
        !search || p.name.includes(search) || p.school.includes(search);
      const matchPref = !prefecture || p.prefecture === prefecture;
      return matchSearch && matchPref;
    });
  }, [search, prefecture]);

  const lastUpdated = new Date(mockStats.lastUpdated);
  const formattedUpdate = lastUpdated.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* ===== Dashboard Section ===== */}

      {/* --- Breaking News ヘッダー --- */}
      <Box sx={{ mb: 3 }}>
        {/* 速報バッジ + 更新日 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Chip
            icon={<FiberManualRecord sx={{ fontSize: '8px !important', color: '#fff !important', animation: 'pulse 2s infinite' }} />}
            label="速報"
            size="small"
            sx={{ bgcolor: editorialRed, color: '#fff', fontWeight: 800, fontSize: '0.7rem', height: 24, letterSpacing: '0.05em', '& .MuiChip-icon': { ml: 0.5 }, '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {formattedUpdate} 更新
          </Typography>
        </Box>

        {/* メイン見出し: Bebas Neue */}
        <Typography sx={{ fontFamily: BEBAS_FONT, fontSize: { xs: 36, md: 52 }, lineHeight: 1.05, letterSpacing: '0.02em', mb: 0.5 }}>
          {new Date().getFullYear()} PRO BASEBALL FILING
        </Typography>

        {/* サブ見出し（日本語） */}
        <Typography sx={{ fontSize: { xs: 16, md: 20 }, fontWeight: 700, lineHeight: 1.4, borderLeft: `4px solid ${editorialRed}`, pl: 1.5 }}>
          志望届提出者は{mockStats.totalPlayers}名に到達{'　'}
          <Typography component="span" sx={{ color: editorialRed, fontWeight: 800, fontSize: 'inherit' }}>
            前年比+{mockStats.yearOverYear.totalChange}名
          </Typography>
          の増加傾向
        </Typography>
      </Box>

      {/* --- スコアボード風 StatGrid --- */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${borderColor}`, mb: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 0.75, bgcolor: subtleBg, borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.6rem' }}>
            SCOREBOARD
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>{new Date().getFullYear()}年度</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
          <ScoreboardCell
            label="総提出者"
            value={mockStats.totalPlayers}
            unit="名"
            change={mockStats.yearOverYear.totalChange}
            accentColor={theme.palette.primary.main}
          />
          <ScoreboardCell
            label="高校生"
            value={mockStats.highschoolPlayers}
            unit="名"
            change={mockStats.yearOverYear.highschoolChange}
            accentColor={highschoolColor}
          />
          <ScoreboardCell
            label="大学生"
            value={mockStats.universityPlayers}
            unit="名"
            change={mockStats.yearOverYear.universityChange}
            accentColor={universityColor}
          />
          <ScoreboardCell
            label="参加校"
            value={mockStats.totalSchools}
            unit="校"
            accentColor={theme.palette.text.secondary}
          />
        </Box>
      </Paper>

      {/* --- 前年比サマリーバー --- */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${borderColor}`,
          mb: 3,
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          flexWrap: 'wrap',
          borderLeft: `4px solid ${editorialRed}`,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
          前年比
        </Typography>
        <Divider orientation="vertical" flexItem sx={{ opacity: 0.3 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>全体</Typography>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: '#2e7d32', fontWeight: 700, fontSize: '0.8rem' }}>
            <ArrowUpward sx={{ fontSize: 14 }} />+{mockStats.yearOverYear.totalChangePercent}%
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: highschoolColor }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>高校生</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32', fontSize: '0.75rem' }}>+{mockStats.yearOverYear.highschoolChange}名</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: universityColor }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>大学生</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32', fontSize: '0.75rem' }}>+{mockStats.yearOverYear.universityChange}名</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
          {mockStats.topPrefecture}が最多（{mockStats.topPrefectureCount}名）
        </Typography>
      </Paper>

      {/* --- コンテンツエリア: 推移 + 速報 --- */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* 推移チャート（バー） */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${borderColor}`, overflow: 'hidden', height: '100%' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>提出推移</Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
              {mockTrendData.map((point, i) => {
                const isLast = i === mockTrendData.length - 1;
                const d = new Date(point.date);
                return (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, borderLeft: isLast ? `4px solid ${editorialRed}` : '4px solid transparent', pl: 1.5, bgcolor: isLast ? (isDark ? 'rgba(211,47,47,0.06)' : 'rgba(211,47,47,0.03)') : 'transparent', borderRadius: isLast ? '0 4px 4px 0' : 0 }}>
                    <Typography variant="caption" sx={{ minWidth: 48, fontVariantNumeric: 'tabular-nums', fontWeight: isLast ? 700 : 500, color: isLast ? 'text.primary' : 'text.secondary', fontSize: '0.7rem' }}>
                      {d.getMonth() + 1}/{d.getDate()}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', height: 18, borderRadius: 1, overflow: 'hidden', width: `${(point.total / maxTotal) * 100}%`, minWidth: 20 }}>
                        <Box sx={{ width: `${(point.highschool / point.total) * 100}%`, bgcolor: highschoolColor }} />
                        <Box sx={{ width: `${(point.university / point.total) * 100}%`, bgcolor: universityColor }} />
                      </Box>
                    </Box>
                    <Typography sx={{ minWidth: 36, textAlign: 'right', fontWeight: isLast ? 800 : 600, fontSize: isLast ? '0.85rem' : '0.75rem', fontVariantNumeric: 'tabular-nums', color: isLast ? editorialRed : 'text.primary' }}>
                      {point.total}
                    </Typography>
                  </Box>
                );
              })}
              {/* 凡例 */}
              <Box sx={{ display: 'flex', gap: 2, mt: 2, pl: 7 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: highschoolColor }} />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                    高校生
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: universityColor }} />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                    大学生
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* 最新速報リスト */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${borderColor}`, overflow: 'hidden', height: '100%' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>最新の届出</Typography>
              <Box sx={{ flex: 1 }} />
              <Chip label="NEW" size="small" sx={{ height: 18, fontSize: '0.55rem', fontWeight: 800, bgcolor: editorialRed, color: '#fff', letterSpacing: '0.05em' }} />
            </Box>
            <Box sx={{ px: 0 }}>
              {mockRecentPlayers.map((player, i) => {
                const typeColor = player.type === 'highschool' ? highschoolColor : universityColor;
                const isFirst = i === 0;
                return (
                  <React.Fragment key={player.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.25, borderLeft: isFirst ? `4px solid ${editorialRed}` : '4px solid transparent', bgcolor: isFirst ? (isDark ? 'rgba(211,47,47,0.06)' : 'rgba(211,47,47,0.03)') : 'transparent' }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', fontWeight: 700, bgcolor: alpha(typeColor, isDark ? 0.2 : 0.1), color: typeColor }}>
                        {player.name.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{player.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>{player.school}</Typography>
                      </Box>
                      <Chip label={player.type === 'highschool' ? '高校' : '大学'} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, color: typeColor, bgcolor: 'transparent', border: `1.5px solid ${typeColor}` }} />
                    </Box>
                    {i < mockRecentPlayers.length - 1 && <Divider sx={{ ml: 6, opacity: 0.4 }} />}
                  </React.Fragment>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* --- 都道府県ランキング --- */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${borderColor}`, overflow: 'hidden', mb: 5 }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${borderColor}` }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>都道府県別ランキング</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
            {mockStats.totalPrefectures}都道府県から{mockStats.totalPlayers}名が提出
          </Typography>
        </Box>
        <Box sx={{ px: 2.5, py: 2 }}>
          {mockPrefectureRanking.map((item, i) => {
            const isTop = i === 0;
            return (
              <Box key={item.prefecture} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderLeft: isTop ? `4px solid ${editorialRed}` : '4px solid transparent', pl: 1.5, bgcolor: isTop ? (isDark ? 'rgba(211,47,47,0.05)' : 'rgba(211,47,47,0.02)') : 'transparent', borderRadius: isTop ? '0 4px 4px 0' : 0 }}>
                <Typography sx={{ fontFamily: BEBAS_FONT, fontSize: isTop ? 28 : 22, lineHeight: 1, width: 28, textAlign: 'center', color: isTop ? editorialRed : 'text.disabled' }}>
                  {i + 1}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: isTop ? 800 : 600, mb: 0.25 }}>{item.prefecture}</Typography>
                  <LinearProgress variant="determinate" value={item.percentage} sx={{ height: 4, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: isTop ? editorialRed : theme.palette.primary.main } }} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: isTop ? '1rem' : '0.875rem', minWidth: 40, textAlign: 'right' }}>
                  {item.count}<Typography component="span" sx={{ fontSize: '0.7rem', fontWeight: 500, color: 'text.secondary', ml: 0.25 }}>名</Typography>
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ===== PlayerList Section ===== */}

      {/* --- 新聞風見出し --- */}
      <Box sx={{ mb: 3 }}>
        <Divider sx={{ mb: 3, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} />
        <Typography sx={{ fontFamily: BEBAS_FONT, fontSize: { xs: 28, md: 36 }, lineHeight: 1.1, letterSpacing: '0.02em', mb: 0.5 }}>
          PLAYER LIST
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, borderLeft: `4px solid ${editorialRed}`, pl: 1.5, color: 'text.secondary' }}>
          {new Date().getFullYear()}年度 プロ志望届提出選手一覧（{mockPlayerList.length}名）
        </Typography>
      </Box>

      {/* --- フィルターバー --- */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="選手名・学校名で検索" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 260 }} slotProps={{
          input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }
        }} />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>都道府県</InputLabel>
          <Select value={prefecture} label="都道府県" onChange={(e) => setPrefecture(e.target.value)}>
            <MenuItem value="">すべて</MenuItem>
            {mockFilterOptions.prefectures.map((pref) => <MenuItem key={pref} value={pref}>{pref}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {filteredPlayers.length}件表示
        </Typography>
      </Box>

      {/* --- 選手テーブル --- */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: subtleBg }}>
              <TableCell sx={thSx}>選手名</TableCell>
              <TableCell sx={thSx}>学校</TableCell>
              <TableCell sx={thSx}>都道府県</TableCell>
              <TableCell sx={thSx}>ポジション</TableCell>
              <TableCell sx={thSx}>届出日</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlayers.map((player, i) => {
              const isRecent = player.filingDate === mockPlayerList[0]?.filingDate;
              return (
                <TableRow key={player.id} sx={{ borderLeft: isRecent ? `4px solid ${editorialRed}` : '4px solid transparent', '&:hover': { bgcolor: subtleBg }, cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{player.name}</Typography>
                      {isRecent && i === 0 && (
                        <Chip label="NEW" size="small" sx={{ height: 16, fontSize: '0.5rem', fontWeight: 800, bgcolor: editorialRed, color: '#fff' }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{player.school}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{player.prefecture}</Typography></TableCell>
                  <TableCell>
                    <Chip label={player.position} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, borderColor }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                      {new Date(player.filingDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredPlayers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            該当する選手が見つかりません
          </Typography>
        </Box>
      )}
    </Box>
  );
}
