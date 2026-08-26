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
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  ArrowUpward,
  ArrowDownward,
  Schedule,
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
// Variant D: データストーリーテリング（元版）
// ============================================================

const Sparkline = ({
  data,
  color,
  width = 80,
  height = 24,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.length > 0 && (
        <circle
          cx={((data.length - 1) / (data.length - 1)) * width}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
          r={2.5}
          fill={color}
        />
      )}
    </svg>
  );
};

const ChangeIndicator = ({
  value,
  suffix = '名',
}: {
  value: number;
  suffix?: string;
}) => {
  const isPositive = value > 0;
  const color = isPositive ? '#2e7d32' : '#c62828';

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        color,
        fontWeight: 600,
        fontSize: '0.8rem',
      }}
    >
      {isPositive ? (
        <ArrowUpward sx={{ fontSize: 14 }} />
      ) : (
        <ArrowDownward sx={{ fontSize: 14 }} />
      )}
      {isPositive ? '+' : ''}
      {value}
      {suffix}
    </Box>
  );
};

const NarrativeCard = ({
  headline,
  value,
  unit,
  change,
  changeLabel,
  sparkData,
  sparkColor,
  accentColor,
}: {
  headline: string;
  value: number | string;
  unit: string;
  change?: number;
  changeLabel?: string;
  sparkData?: number[];
  sparkColor?: string;
  accentColor: string;
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        position: 'relative',
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, color: accentColor, display: 'block', mb: 1 }}
      >
        {headline}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
            <Typography
              sx={{
                fontSize: 32,
                fontWeight: 800,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {value}
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: theme.palette.text.secondary }}>
              {unit}
            </Typography>
          </Box>
          {change !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <ChangeIndicator value={change} />
              {changeLabel && (
                <Typography variant="caption" sx={{
                  color: "text.disabled"
                }}>
                  {changeLabel}
                </Typography>
              )}
            </Box>
          )}
        </Box>
        {sparkData && sparkColor && <Sparkline data={sparkData} color={sparkColor} />}
      </Box>
    </Paper>
  );
};

export default function VariantD() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const highschoolColor = isDark ? '#4db6ac' : '#00897b';
  const universityColor = isDark ? '#ffb74d' : '#ef6c00';
  const primaryColor = theme.palette.primary.main;

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
      const key = p.filingDate;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredPlayers]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* ストーリーの導入 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: primaryColor, letterSpacing: '0.05em', display: 'block', mb: 0.5 }}>
          {new Date().getFullYear()}年度 プロ野球志望届
        </Typography>
        <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700, lineHeight: 1.3 }}>
          今年の志望届提出は
          <Typography component="span" sx={{ color: primaryColor, fontWeight: 800, fontSize: 'inherit' }}>
            {mockStats.totalPlayers}名
          </Typography>
          。前年から
          <ChangeIndicator value={mockStats.yearOverYear.totalChange} />
          の{mockStats.yearOverYear.totalChange > 0 ? '増加' : '減少'}傾向。
        </Typography>
      </Box>

      {/* ナラティブStatCards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <NarrativeCard headline="高校生の提出状況" value={mockStats.highschoolPlayers} unit="名" change={mockStats.yearOverYear.highschoolChange} changeLabel="前年比" sparkData={trendHigh} sparkColor={highschoolColor} accentColor={highschoolColor} />
        <NarrativeCard headline="大学生の提出状況" value={mockStats.universityPlayers} unit="名" change={mockStats.yearOverYear.universityChange} changeLabel="前年比" sparkData={trendUni} sparkColor={universityColor} accentColor={universityColor} />
        <NarrativeCard headline="対象学校" value={mockStats.totalSchools} unit="校" accentColor={primaryColor} />
      </Box>

      {/* 推移チャート */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>届出は着実に増加中</Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: 'block',
            mb: 2
          }}>直近の推移。最新の週で大きな伸びを記録。</Typography>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
          {mockTrendData.map((point, i) => {
            const max = Math.max(...trendTotals);
            const date = new Date(point.date);
            const isLast = i === mockTrendData.length - 1;
            const prevTotal = i > 0 ? mockTrendData[i - 1].total : 0;
            const diff = point.total - prevTotal;
            return (
              <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
                {i > 0 && <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#2e7d32', display: 'block', mb: 0.25 }}>+{diff}</Typography>}
                <Typography variant="caption" sx={{ fontWeight: isLast ? 800 : 600, fontSize: isLast ? '0.85rem' : '0.7rem', color: isLast ? primaryColor : 'text.primary' }}>{point.total}</Typography>
                <Box sx={{ height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <Box sx={{ height: `${(point.total / max) * 100}%`, bgcolor: isLast ? primaryColor : alpha(primaryColor, 0.2), borderRadius: '4px 4px 0 0', minHeight: 4, position: 'relative' }}>
                    {isLast && <Box sx={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', bgcolor: primaryColor, border: `2px solid ${theme.palette.background.paper}` }} />}
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem', display: 'block', mt: 0.5 }}>{date.getMonth() + 1}/{date.getDate()}</Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* 都道府県と最新提出者 */}
      <Box sx={{ display: 'flex', gap: 3, mb: 5, flexDirection: { xs: 'column', md: 'row' } }}>
        <Paper elevation={0} sx={{ p: 3, flex: 1, borderRadius: 3, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>地域別の提出状況</Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block',
              mb: 2
            }}>{mockStats.topPrefecture}が{mockStats.topPrefectureCount}名でリード。{mockStats.totalPrefectures}都道府県から提出。</Typography>
          {mockPrefectureRanking.map((item, i) => (
            <Box key={item.prefecture} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
              <Typography sx={{ width: 20, fontWeight: 700, fontSize: '0.8rem', color: i === 0 ? primaryColor : 'text.disabled', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</Typography>
              <Typography variant="body2" sx={{ fontWeight: i === 0 ? 700 : 500, flex: 1 }}>{item.prefecture}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>{item.count}</Typography>
              <Box sx={{ width: 60 }}>
                <Box sx={{ height: 4, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                  <Box sx={{ height: '100%', width: `${item.percentage}%`, borderRadius: 2, bgcolor: i === 0 ? primaryColor : alpha(primaryColor, 0.3) }} />
                </Box>
              </Box>
            </Box>
          ))}
        </Paper>

        <Paper elevation={0} sx={{ p: 3, flex: 1, borderRadius: 3, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>最近の届出</Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block',
              mb: 2
            }}>直近に提出された選手たち</Typography>
          {mockRecentPlayers.map((player, i) => (
            <React.Fragment key={player.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 3, height: 24, borderRadius: 1.5, bgcolor: player.type === 'highschool' ? highschoolColor : universityColor }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{player.name}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontSize: '0.7rem'
                      }}>{player.school}</Typography>
                  </Box>
                </Box>
                <Chip label={player.type === 'highschool' ? '高校' : '大学'} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, color: player.type === 'highschool' ? highschoolColor : universityColor, bgcolor: alpha(player.type === 'highschool' ? highschoolColor : universityColor, isDark ? 0.15 : 0.08) }} />
              </Box>
              {i < mockRecentPlayers.length - 1 && <Divider sx={{ opacity: 0.3 }} />}
            </React.Fragment>
          ))}
        </Paper>
      </Box>

      {/* PlayerList Section */}
      <Divider sx={{ mb: 4 }} />
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>選手一覧</Typography>
        <Box sx={{ flex: 1 }} />
        <TextField size="small" placeholder="選手名・学校名で検索" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 240 }} slotProps={{
          input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }
        }} />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>都道府県</InputLabel>
          <Select value={prefecture} label="都道府県" onChange={(e) => setPrefecture(e.target.value)}>
            <MenuItem value="">すべて</MenuItem>
            {mockFilterOptions.prefectures.map((pref) => (<MenuItem key={pref} value={pref}>{pref}</MenuItem>))}
          </Select>
        </FormControl>
      </Box>

      {dateGroups.map(([date, players]) => (
        <Box key={date} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: primaryColor }}>
              {new Date(date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
            </Typography>
            <Chip label={`${players.length}名`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: alpha(primaryColor, isDark ? 0.15 : 0.08), color: primaryColor }} />
          </Box>
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`, ml: 3, borderLeft: `2px solid ${alpha(primaryColor, 0.2)}` }}>
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
                  <TableRow key={player.id} sx={{ '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }, cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}>
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
