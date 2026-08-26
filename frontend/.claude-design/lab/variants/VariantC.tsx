import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  ArrowUpward,
  ArrowDownward,
  TrendingUp,
  Place,
  School,
  SportsBaseball,
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
// Variant C: Bento Grid強化（密度バランス型）
// - CSS Grid による不均一レイアウトで視覚的リズムを生む
// - 重要カード: 2x2、補助カード: 1x1 のサイズ差
// - ダッシュボード: Bento Grid / 選手一覧: コンパクトフィルタ+ワイドテーブル
// ============================================================

// --- ミニスパークライン ---
const MiniSparkline = ({
  data,
  color,
  width = 72,
  height = 28,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 3;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const lastX = ((data.length - 1) / (data.length - 1)) * (width - padding * 2) + padding;
  const lastY =
    height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2);

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
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
};

// --- 前年比インジケータ ---
const YoYBadge = ({ value, label }: { value: number; label?: string }) => {
  const positive = value > 0;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.3,
        fontSize: '0.75rem',
        fontWeight: 600,
        color: positive ? '#2e7d32' : '#c62828',
      }}
    >
      {positive ? <ArrowUpward sx={{ fontSize: 13 }} /> : <ArrowDownward sx={{ fontSize: 13 }} />}
      {positive ? '+' : ''}
      {value}名
      {label && (
        <Typography component="span" sx={{ fontSize: '0.65rem', color: 'text.disabled', ml: 0.3 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
};

export default function VariantC() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const highschoolColor = isDark ? '#4db6ac' : '#00897b';
  const universityColor = isDark ? '#ffb74d' : '#ef6c00';
  const primaryColor = theme.palette.primary.main;

  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const cardBg = isDark ? 'rgba(255,255,255,0.02)' : theme.palette.background.paper;

  const trendHigh = mockTrendData.map((d) => d.highschool);
  const trendUni = mockTrendData.map((d) => d.university);
  const trendTotals = mockTrendData.map((d) => d.total);

  const [search, setSearch] = React.useState('');
  const [prefecture, setPrefecture] = React.useState('');

  const filteredPlayers = React.useMemo(() => {
    return mockPlayerList.filter((p) => {
      const matchSearch = !search || p.name.includes(search) || p.school.includes(search);
      const matchPref = !prefecture || p.prefecture === prefecture;
      return matchSearch && matchPref;
    });
  }, [search, prefecture]);

  // 共通カードスタイル
  const cardSx = {
    borderRadius: '16px',
    border: `1px solid ${borderColor}`,
    bgcolor: cardBg,
    overflow: 'hidden',
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* ===== Dashboard Section ===== */}

      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: primaryColor,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            display: 'block',
            mb: 0.5,
          }}
        >
          {new Date().getFullYear()}年度 プロ野球志望届
        </Typography>
        <Typography sx={{ fontSize: { xs: 20, md: 26 }, fontWeight: 700, lineHeight: 1.3 }}>
          ダッシュボード
        </Typography>
      </Box>

      {/* Bento Grid: メインレイアウト */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          gridTemplateRows: { md: 'auto auto' },
          gap: 2,
          mb: 4,
        }}
      >
        {/* ---- ヒーローカード: 総合概要 (2x2) ---- */}
        <Paper
          elevation={0}
          sx={{
            ...cardSx,
            gridColumn: { md: 'span 2' },
            gridRow: { md: 'span 2' },
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: { md: 280 },
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SportsBaseball sx={{ fontSize: 20, color: primaryColor }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                届出の全体像
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: { xs: 48, md: 56 },
                  fontWeight: 800,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.03em',
                }}
              >
                {mockStats.totalPlayers}
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 500, color: 'text.secondary' }}>
                名
              </Typography>
            </Box>
            <Box sx={{ mt: 1 }}>
              <YoYBadge value={mockStats.yearOverYear.totalChange} label="前年比" />
              <Typography
                variant="caption"
                sx={{ display: 'block', color: 'text.disabled', mt: 0.5 }}
              >
                {mockStats.totalPrefectures}都道府県 / {mockStats.totalSchools}校から提出
              </Typography>
            </Box>
          </Box>

          {/* ヒーロー内のミニ推移バー */}
          <Box sx={{ mt: 3 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}
            >
              週次推移
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-end', height: 64 }}>
              {mockTrendData.map((point, i) => {
                const max = Math.max(...trendTotals);
                const heightPct = (point.total / max) * 100;
                const isLast = i === mockTrendData.length - 1;
                return (
                  <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.6rem',
                        fontWeight: isLast ? 700 : 500,
                        color: isLast ? primaryColor : 'text.disabled',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {point.total}
                    </Typography>
                    <Box
                      sx={{
                        width: '100%',
                        height: `${heightPct}%`,
                        minHeight: 4,
                        borderRadius: '3px 3px 0 0',
                        bgcolor: isLast ? primaryColor : alpha(primaryColor, isDark ? 0.25 : 0.15),
                        transition: 'height 0.4s ease-out',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ fontSize: '0.55rem', color: 'text.disabled' }}
                    >
                      {new Date(point.date).getMonth() + 1}/{new Date(point.date).getDate()}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Paper>

        {/* ---- 高校生カード (1x1) ---- */}
        <Paper elevation={0} sx={{ ...cardSx, p: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              mb: 1.5,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: highschoolColor,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, color: highschoolColor }}>
              高校生
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
                <Typography
                  sx={{
                    fontSize: 30,
                    fontWeight: 800,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {mockStats.highschoolPlayers}
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>名</Typography>
              </Box>
              <Box sx={{ mt: 0.5 }}>
                <YoYBadge value={mockStats.yearOverYear.highschoolChange} />
              </Box>
            </Box>
            <MiniSparkline data={trendHigh} color={highschoolColor} />
          </Box>
        </Paper>

        {/* ---- 大学生カード (1x1) ---- */}
        <Paper elevation={0} sx={{ ...cardSx, p: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              mb: 1.5,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: universityColor,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, color: universityColor }}>
              大学生
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
                <Typography
                  sx={{
                    fontSize: 30,
                    fontWeight: 800,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {mockStats.universityPlayers}
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>名</Typography>
              </Box>
              <Box sx={{ mt: 0.5 }}>
                <YoYBadge value={mockStats.yearOverYear.universityChange} />
              </Box>
            </Box>
            <MiniSparkline data={trendUni} color={universityColor} />
          </Box>
        </Paper>

        {/* ---- 学校数カード (1x1) ---- */}
        <Paper elevation={0} sx={{ ...cardSx, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
            <School sx={{ fontSize: 14, color: primaryColor }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: primaryColor }}>
              対象学校
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
            <Typography
              sx={{
                fontSize: 30,
                fontWeight: 800,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {mockStats.totalSchools}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>校</Typography>
          </Box>
          {/* 高校/大学の比率バー */}
          <Box sx={{ mt: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                height: 6,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${(mockStats.highschoolPlayers / mockStats.totalPlayers) * 100}%`,
                  bgcolor: highschoolColor,
                }}
              />
              <Box
                sx={{
                  flex: 1,
                  bgcolor: universityColor,
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: highschoolColor }}>
                高校 {Math.round((mockStats.highschoolPlayers / mockStats.totalPlayers) * 100)}%
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: universityColor }}>
                大学 {Math.round((mockStats.universityPlayers / mockStats.totalPlayers) * 100)}%
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* ---- 最多都道府県カード (1x1) ---- */}
        <Paper elevation={0} sx={{ ...cardSx, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
            <Place sx={{ fontSize: 14, color: primaryColor }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: primaryColor }}>
              最多地域
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 800,
              lineHeight: 1,
              mb: 0.25,
            }}
          >
            {mockStats.topPrefecture}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {mockStats.topPrefectureCount}名が提出
          </Typography>
        </Paper>
      </Box>

      {/* Bento Grid 下段: 都道府県ランキング + 最近の届出 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 3fr' },
          gap: 2,
          mb: 5,
        }}
      >
        {/* ---- 都道府県ランキング ---- */}
        <Paper elevation={0} sx={{ ...cardSx, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <TrendingUp sx={{ fontSize: 18, color: primaryColor }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              地域別ランキング
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block',
              mb: 2
            }}>
            {mockStats.totalPrefectures}都道府県から提出
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {mockPrefectureRanking.map((item, i) => (
              <Box key={item.prefecture}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      sx={{
                        width: 18,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: i === 0 ? primaryColor : 'text.disabled',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {i + 1}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: i === 0 ? 700 : 500 }}>
                      {item.prefecture}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {item.count}名
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={item.percentage}
                  sx={{
                    height: 5,
                    borderRadius: 2.5,
                    ml: '26px',
                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 2.5,
                      bgcolor: i === 0 ? primaryColor : alpha(primaryColor, 0.4),
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </Paper>

        {/* ---- 最近の届出 ---- */}
        <Paper elevation={0} sx={{ ...cardSx, p: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            最新の届出選手
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block',
              mb: 2
            }}>
            直近に志望届を提出した選手
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', borderColor: borderColor }}>
                    選手名
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', borderColor: borderColor }}>
                    学校
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', borderColor: borderColor }}>
                    区分
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 600, fontSize: '0.75rem', borderColor: borderColor }}
                  >
                    届出日
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockRecentPlayers.map((player) => {
                  const isHS = player.type === 'highschool';
                  const typeColor = isHS ? highschoolColor : universityColor;
                  const date = new Date(player.filingDate);
                  return (
                    <TableRow
                      key={player.id}
                      sx={{
                        '&:last-child td': { borderBottom: 0 },
                        '& td': { borderColor: borderColor },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 3,
                              height: 20,
                              borderRadius: 1.5,
                              bgcolor: typeColor,
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {player.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {player.school}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={isHS ? '高校' : '大学'}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: typeColor,
                            bgcolor: isDark
                              ? alpha(typeColor, 0.15)
                              : alpha(typeColor, 0.08),
                            border: 'none',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="caption"
                          sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
                        >
                          {date.getMonth() + 1}/{date.getDate()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* ===== PlayerList Section ===== */}

      <Divider sx={{ mb: 3 }} />

      {/* コンパクトフィルタバー */}
      <Paper
        elevation={0}
        sx={{
          ...cardSx,
          p: 2,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: 'auto' }}>
          選手一覧
        </Typography>
        <Chip
          label={`${filteredPlayers.length}名`}
          size="small"
          sx={{
            fontWeight: 600,
            fontSize: '0.75rem',
            bgcolor: alpha(primaryColor, isDark ? 0.15 : 0.08),
            color: primaryColor,
          }}
        />
        <TextField
          size="small"
          placeholder="選手名・学校名"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 200 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 16, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }
          }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>都道府県</InputLabel>
          <Select
            value={prefecture}
            label="都道府県"
            onChange={(e) => setPrefecture(e.target.value)}
          >
            <MenuItem value="">すべて</MenuItem>
            {mockFilterOptions.prefectures.map((pref) => (
              <MenuItem key={pref} value={pref}>
                {pref}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* ワイドテーブル */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          ...cardSx,
          mb: 4,
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', borderColor: borderColor }}>
                選手名
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', borderColor: borderColor }}>
                学校
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', borderColor: borderColor }}>
                都道府県
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', borderColor: borderColor }}>
                ポジション
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 700, fontSize: '0.8rem', borderColor: borderColor }}
              >
                届出日
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlayers.map((player) => {
              const date = new Date(player.filingDate);
              return (
                <TableRow
                  key={player.id}
                  sx={{
                    '&:last-child td': { borderBottom: 0 },
                    '& td': { borderColor: borderColor },
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {player.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{player.school}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{player.prefecture}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={player.position}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 24,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        fontVariantNumeric: 'tabular-nums',
                        color: 'text.secondary',
                      }}
                    >
                      {date.toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                      })}
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
