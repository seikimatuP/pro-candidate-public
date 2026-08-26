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
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  ArrowUpward,
  ArrowDownward,
  Schedule,
  TrendingUp,
  School,
  LocationOn,
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
// Variant A: 情報ヒエラルキー重視
// Hero数字(72px+) → サマリー → チャート → 最新選手 → 選手一覧
// 数値の大小で視覚的な重要度を表現する
// ============================================================

const COLORS = {
  highschool: { light: '#00897b', dark: '#4db6ac' },
  university: { light: '#ef6c00', dark: '#ffb74d' },
  positive: '#2e7d32',
  negative: '#c62828',
} as const;

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });

const formatDateWeekday = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

// --- ミニ折れ線グラフ ---
const MiniTrendLine = ({ data, color, width = 64, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 3;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const lastY = height - pad - ((data[data.length - 1] - min) / range) * (height - pad * 2);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width - pad} cy={lastY} r={3} fill={color} />
    </svg>
  );
};

// --- 前年比インジケーター ---
const YoYBadge = ({ change, percent, large }: { change: number; percent: number; large?: boolean }) => {
  const pos = change > 0;
  const color = pos ? COLORS.positive : COLORS.negative;
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color, fontWeight: 700, fontSize: large ? '1rem' : '0.7rem' }}>
      {pos ? <ArrowUpward sx={{ fontSize: large ? 20 : 12 }} /> : <ArrowDownward sx={{ fontSize: large ? 20 : 12 }} />}
      {pos ? '+' : ''}{change}名 ({pos ? '+' : ''}{percent.toFixed(1)}%)
    </Box>
  );
};

export default function VariantA() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primary = theme.palette.primary.main;
  const hs = isDark ? COLORS.highschool.dark : COLORS.highschool.light;
  const uni = isDark ? COLORS.university.dark : COLORS.university.light;
  const border = `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`;

  const trendTotals = mockTrendData.map((d) => d.total);
  const trendHigh = mockTrendData.map((d) => d.highschool);
  const trendUni = mockTrendData.map((d) => d.university);

  const [search, setSearch] = React.useState('');
  const [prefecture, setPrefecture] = React.useState('');

  const filteredPlayers = React.useMemo(() => {
    return mockPlayerList.filter((p) => {
      const matchSearch = !search || p.name.includes(search) || p.school.includes(search);
      const matchPref = !prefecture || p.prefecture === prefecture;
      return matchSearch && matchPref;
    });
  }, [search, prefecture]);

  const dateGroups = React.useMemo(() => {
    const groups: Record<string, typeof mockPlayerList> = {};
    filteredPlayers.forEach((p) => {
      if (!groups[p.filingDate]) groups[p.filingDate] = [];
      groups[p.filingDate].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredPlayers]);

  const hsPercent = Math.round((mockStats.highschoolPlayers / mockStats.totalPlayers) * 100);
  const uniPercent = 100 - hsPercent;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>

      {/* ===== Dashboard Section ===== */}

      {/* Hero: 合計人数を圧倒的に大きく表示 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.08em', fontSize: '0.75rem', display: 'block', mb: 1 }}>
          {new Date().getFullYear()}年度 プロ野球志望届
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography component="span" sx={{ fontSize: { xs: 64, md: 80 }, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {mockStats.totalPlayers}
          </Typography>
          <Typography component="span" sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 600, color: 'text.secondary' }}>
            名が届出
          </Typography>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <YoYBadge change={mockStats.yearOverYear.totalChange} percent={mockStats.yearOverYear.totalChangePercent} large />
          <Typography component="span" sx={{ ml: 1, color: 'text.disabled', fontSize: '0.85rem' }}>前年同期比</Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
          最終更新: {formatDate(mockStats.lastUpdated)}
        </Typography>
      </Box>

      {/* サマリーカード 4列 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        {/* 高校生 */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border, borderLeft: `3px solid ${hs}` }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: hs, display: 'block', mb: 0.5 }}>高校生</Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{mockStats.highschoolPlayers}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary' }}>名</Typography>
            </Box>
            <MiniTrendLine data={trendHigh} color={hs} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: COLORS.positive, fontWeight: 600, fontSize: '0.7rem' }}>
              <ArrowUpward sx={{ fontSize: 12 }} />+{mockStats.yearOverYear.highschoolChange}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>前年比</Typography>
          </Box>
        </Paper>

        {/* 大学生 */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border, borderLeft: `3px solid ${uni}` }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: uni, display: 'block', mb: 0.5 }}>大学生</Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{mockStats.universityPlayers}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary' }}>名</Typography>
            </Box>
            <MiniTrendLine data={trendUni} color={uni} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: COLORS.positive, fontWeight: 600, fontSize: '0.7rem' }}>
              <ArrowUpward sx={{ fontSize: 12 }} />+{mockStats.yearOverYear.universityChange}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>前年比</Typography>
          </Box>
        </Paper>

        {/* 対象学校 */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <School sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>対象学校</Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {mockStats.totalSchools}<Typography component="span" sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary', ml: 0.5 }}>校</Typography>
          </Typography>
        </Paper>

        {/* 都道府県 */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>都道府県</Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {mockStats.totalPrefectures}<Typography component="span" sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary', ml: 0.5 }}>都道府県</Typography>
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            最多: {mockStats.topPrefecture} ({mockStats.topPrefectureCount}名)
          </Typography>
        </Paper>
      </Box>

      {/* 高校/大学 比率バー */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: hs }}>高校 {hsPercent}%</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, color: uni }}>大学 {uniPercent}%</Typography>
        </Box>
        <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
          <Box sx={{ width: `${hsPercent}%`, bgcolor: hs, borderRadius: '4px 0 0 4px' }} />
          <Box sx={{ width: `${uniPercent}%`, bgcolor: uni, borderRadius: '0 4px 4px 0' }} />
        </Box>
      </Paper>

      {/* 推移チャート（スタック棒グラフ） */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <TrendingUp sx={{ fontSize: 18, color: primary }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>提出推移</Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: 'block',
            mb: 2.5
          }}>
          週次の累計提出者数。直近週で{mockTrendData.length >= 2 ? ` +${mockTrendData[mockTrendData.length - 1].total - mockTrendData[mockTrendData.length - 2].total}名` : ''}の増加。
        </Typography>

        <Box sx={{ display: 'flex', gap: { xs: 1.5, md: 3 }, alignItems: 'flex-end' }}>
          {mockTrendData.map((point, i) => {
            const max = Math.max(...trendTotals);
            const barH = (point.total / max) * 120;
            const hsH = (point.highschool / point.total) * barH;
            const uniH = barH - hsH;
            const date = new Date(point.date);
            const isLast = i === mockTrendData.length - 1;
            return (
              <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: isLast ? 800 : 600, fontSize: isLast ? '0.85rem' : '0.7rem', color: isLast ? primary : 'text.primary', display: 'block', mb: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                  {point.total}
                </Typography>
                <Box sx={{ height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', borderRadius: '4px 4px 0 0', overflow: 'hidden', opacity: isLast ? 1 : 0.6 }}>
                    <Box sx={{ height: uniH, bgcolor: uni, minHeight: uniH > 0 ? 2 : 0 }} />
                    <Box sx={{ height: hsH, bgcolor: hs, minHeight: hsH > 0 ? 2 : 0 }} />
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem', display: 'block', mt: 0.5 }}>
                  {date.getMonth() + 1}/{date.getDate()}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* 凡例 */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: hs }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>高校生</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: uni }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>大学生</Typography>
          </Box>
        </Box>
      </Paper>

      {/* 最近の届出 & 都道府県ランキング */}
      <Box sx={{ display: 'flex', gap: 3, mb: 5, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* 最近の届出 */}
        <Paper elevation={0} sx={{ p: 3, flex: 1.2, borderRadius: 3, border }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>最近の届出</Typography>
          {mockRecentPlayers.map((player, i) => {
            const c = player.type === 'highschool' ? hs : uni;
            const label = player.type === 'highschool' ? '高校' : '大学';
            return (
              <React.Fragment key={player.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 3, height: 28, borderRadius: 1.5, bgcolor: c, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{player.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1.3 }}>{player.school} / {player.prefecture}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>{formatDate(player.filingDate)}</Typography>
                    <Chip label={label} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, color: c, bgcolor: alpha(c, isDark ? 0.18 : 0.1), borderRadius: 1 }} />
                  </Box>
                </Box>
                {i < mockRecentPlayers.length - 1 && <Divider sx={{ opacity: 0.4 }} />}
              </React.Fragment>
            );
          })}
        </Paper>

        {/* 都道府県ランキング */}
        <Paper elevation={0} sx={{ p: 3, flex: 0.8, borderRadius: 3, border }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>都道府県ランキング</Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block',
              mb: 2,
              fontSize: '0.7rem'
            }}>
            {mockStats.totalPrefectures}都道府県から提出
          </Typography>
          {mockPrefectureRanking.map((item, i) => (
            <Box key={item.prefecture} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}>
              <Typography sx={{ width: 18, fontWeight: 700, fontSize: '0.75rem', color: i === 0 ? primary : 'text.disabled', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</Typography>
              <Typography variant="body2" sx={{ fontWeight: i === 0 ? 700 : 500, flex: 1, fontSize: '0.85rem' }}>{item.prefecture}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right', fontSize: '0.85rem' }}>{item.count}</Typography>
              <Box sx={{ width: 56 }}>
                <LinearProgress variant="determinate" value={item.percentage} sx={{ height: 4, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: i === 0 ? primary : alpha(primary, 0.35) } }} />
              </Box>
            </Box>
          ))}
        </Paper>
      </Box>

      {/* ===== PlayerList Section ===== */}

      <Divider sx={{ mb: 4 }} />

      {/* インラインStatBar(横一列) + 検索フィルタ */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>選手一覧</Typography>
        <Chip label={`${mockStats.totalPlayers}名`} size="small" sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: alpha(primary, isDark ? 0.15 : 0.08), color: primary }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: hs }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>高校 {mockStats.highschoolPlayers}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: uni }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>大学 {mockStats.universityPlayers}</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <TextField size="small" placeholder="選手名・学校名で検索" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 220 }} slotProps={{
          input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }
        }} />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>都道府県</InputLabel>
          <Select value={prefecture} label="都道府県" onChange={(e) => setPrefecture(e.target.value)}>
            <MenuItem value="">すべて</MenuItem>
            {mockFilterOptions.prefectures.map((pref) => (<MenuItem key={pref} value={pref}>{pref}</MenuItem>))}
          </Select>
        </FormControl>
      </Box>

      {/* テーブル (日付グループ) */}
      {dateGroups.map(([date, players]) => (
        <Box key={date} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Schedule sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: primary, fontSize: '0.8rem' }}>{formatDateWeekday(date)}</Typography>
            <Chip label={`${players.length}名`} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha(primary, isDark ? 0.12 : 0.06), color: primary }} />
          </Box>
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border, ml: 2.5, borderLeft: `2px solid ${alpha(primary, 0.25)}` }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>選手名</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>学校</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>都道府県</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>ポジション</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id} sx={{ '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }, '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{player.name}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{player.school}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{player.prefecture}</Typography></TableCell>
                    <TableCell><Chip label={player.position} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}

      {filteredPlayers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>該当する選手が見つかりません</Typography>
        </Box>
      )}
    </Box>
  );
}
