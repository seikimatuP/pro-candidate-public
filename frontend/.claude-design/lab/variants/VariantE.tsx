import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  SportsCricket,
  School,
  AccountBalance,
  TrendingUp,
  LocationOn,
  CalendarToday,
  ViewModule,
  ViewList,
  EmojiEvents,
  Groups,
  ArrowUpward,
  ArrowDownward,
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
// Variant E: カジュアルスポーツアプリ風
// - 丸みを帯びたUI、カラフルだが意味のある配色
// - イラスト風アイコン、遊び心のあるホバーエフェクト
// - ダッシュボード: カードベースでスワイプ感覚
// - 選手一覧: カード表示 / リスト表示の切り替え
// ============================================================

// --- セマンティックカラー ---
const COLORS = {
  highschool: '#00897b',
  university: '#ef6c00',
  highschoolDark: '#4db6ac',
  universityDark: '#ffb74d',
};

// --- ヘルパーコンポーネント ---

const StatBubble = ({
  icon,
  label,
  value,
  unit,
  change,
  color,
  bgGradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit: string;
  change?: number;
  color: string;
  bgGradient: string;
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: '20px',
        background: isDark
          ? `linear-gradient(135deg, ${alpha(color, 0.15)} 0%, ${alpha(color, 0.05)} 100%)`
          : bgGradient,
        border: `2px solid ${alpha(color, isDark ? 0.25 : 0.15)}`,
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
        cursor: 'default',
        '&:hover': {
          boxShadow: `0 6px 24px ${alpha(color, 0.2)}`,
          borderColor: alpha(color, 0.4),
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: color,
            borderRadius: '14px',
            boxShadow: `0 4px 12px ${alpha(color, 0.35)}`,
          }}
        >
          {icon}
        </Avatar>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: isDark ? alpha(color, 0.9) : color,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontSize: '0.7rem',
          }}
        >
          {label}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
        <Typography
          sx={{
            fontSize: 36,
            fontWeight: 800,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.03em',
            color: theme.palette.text.primary,
          }}
        >
          {value}
        </Typography>
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 600,
            color: theme.palette.text.secondary,
          }}
        >
          {unit}
        </Typography>
      </Box>
      {change !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <Chip
            icon={change > 0 ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />}
            label={`${change > 0 ? '+' : ''}${change}名 前年比`}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 700,
              bgcolor: change > 0
                ? alpha('#2e7d32', isDark ? 0.2 : 0.1)
                : alpha('#c62828', isDark ? 0.2 : 0.1),
              color: change > 0 ? '#43a047' : '#e53935',
              borderRadius: '12px',
              '& .MuiChip-icon': {
                color: 'inherit',
              },
            }}
          />
        </Box>
      )}
    </Paper>
  );
};

const MiniBarChart = ({
  data,
  primaryColor,
}: {
  data: { date: string; highschool: number; university: number; total: number }[];
  primaryColor: string;
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const maxTotal = Math.max(...data.map((d) => d.total));
  const hsColor = isDark ? COLORS.highschoolDark : COLORS.highschool;
  const uniColor = isDark ? COLORS.universityDark : COLORS.university;

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 120 }}>
      {data.map((point, i) => {
        const date = new Date(point.date);
        const isLast = i === data.length - 1;
        const heightPercent = (point.total / maxTotal) * 100;
        const hsRatio = point.highschool / point.total;

        return (
          <Box
            key={i}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: isLast ? 800 : 600,
                fontSize: isLast ? '0.8rem' : '0.65rem',
                color: isLast ? primaryColor : theme.palette.text.secondary,
              }}
            >
              {point.total}
            </Typography>
            <Box
              sx={{
                width: '100%',
                maxWidth: 32,
                height: `${heightPercent}%`,
                minHeight: 6,
                borderRadius: '10px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'height 0.4s ease-out',
              }}
            >
              <Box
                sx={{
                  flex: hsRatio,
                  bgcolor: hsColor,
                  borderRadius: '10px 10px 0 0',
                }}
              />
              <Box
                sx={{
                  flex: 1 - hsRatio,
                  bgcolor: uniColor,
                  borderRadius: '0 0 10px 10px',
                }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                color: theme.palette.text.disabled,
              }}
            >
              {date.getMonth() + 1}/{date.getDate()}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

const PlayerCard = ({
  player,
  highschoolColor,
  universityColor,
}: {
  player: (typeof mockPlayerList)[0];
  highschoolColor: string;
  universityColor: string;
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isHighschool = player.school.includes('高校');
  const typeColor = isHighschool ? highschoolColor : universityColor;
  const typeLabel = isHighschool ? '高校生' : '大学生';

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '16px',
        border: `1.5px solid ${alpha(typeColor, isDark ? 0.2 : 0.12)}`,
        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: `0 4px 20px ${alpha(typeColor, 0.15)}`,
          borderColor: alpha(typeColor, 0.4),
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: alpha(typeColor, isDark ? 0.2 : 0.1),
              color: typeColor,
              fontWeight: 800,
              fontSize: '1rem',
              borderRadius: '14px',
            }}
          >
            {player.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, lineHeight: 1.3 }}
              noWrap
            >
              {player.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: '0.7rem',
                display: 'block',
              }}
              noWrap
            >
              {player.school}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip
            label={typeLabel}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.65rem',
              fontWeight: 700,
              bgcolor: alpha(typeColor, isDark ? 0.18 : 0.1),
              color: typeColor,
              borderRadius: '8px',
            }}
          />
          <Chip
            icon={<LocationOn sx={{ fontSize: 12 }} />}
            label={player.prefecture}
            size="small"
            variant="outlined"
            sx={{
              height: 22,
              fontSize: '0.65rem',
              borderRadius: '8px',
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
              '& .MuiChip-icon': {
                color: theme.palette.text.secondary,
              },
            }}
          />
          <Chip
            label={player.position}
            size="small"
            variant="outlined"
            sx={{
              height: 22,
              fontSize: '0.65rem',
              borderRadius: '8px',
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
          <CalendarToday sx={{ fontSize: 12, color: theme.palette.text.disabled }} />
          <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontSize: '0.65rem' }}>
            {new Date(player.filingDate).toLocaleDateString('ja-JP', {
              month: 'short',
              day: 'numeric',
            })}
            提出
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// --- メインコンポーネント ---

export default function VariantE() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const highschoolColor = isDark ? COLORS.highschoolDark : COLORS.highschool;
  const universityColor = isDark ? COLORS.universityDark : COLORS.university;
  const primaryColor = theme.palette.primary.main;

  const [viewMode, setViewMode] = React.useState<'card' | 'list'>('card');
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

  const highschoolPercent = Math.round(
    (mockStats.highschoolPlayers / mockStats.totalPlayers) * 100
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* ===== Dashboard Section ===== */}

      {/* ヘッダー */}
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SportsCricket
            sx={{ fontSize: 28, color: primaryColor }}
          />
          <Typography
            sx={{
              fontSize: { xs: 20, md: 24 },
              fontWeight: 800,
              letterSpacing: '-0.01em',
            }}
          >
            {new Date().getFullYear()}年度 プロ志望届トラッカー
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.secondary, pl: 0.5 }}
        >
          高校生・大学生のプロ野球志望届提出状況をリアルタイムでチェック
        </Typography>
      </Box>

      {/* 統計カード群 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatBubble
          icon={<Groups sx={{ fontSize: 20, color: '#fff' }} />}
          label="総提出者数"
          value={mockStats.totalPlayers}
          unit="名"
          change={mockStats.yearOverYear.totalChange}
          color={primaryColor}
          bgGradient={`linear-gradient(135deg, ${alpha(primaryColor, 0.08)} 0%, ${alpha(primaryColor, 0.02)} 100%)`}
        />
        <StatBubble
          icon={<School sx={{ fontSize: 20, color: '#fff' }} />}
          label="高校生"
          value={mockStats.highschoolPlayers}
          unit="名"
          change={mockStats.yearOverYear.highschoolChange}
          color={highschoolColor}
          bgGradient={`linear-gradient(135deg, ${alpha(highschoolColor, 0.08)} 0%, ${alpha(highschoolColor, 0.02)} 100%)`}
        />
        <StatBubble
          icon={<AccountBalance sx={{ fontSize: 20, color: '#fff' }} />}
          label="大学生"
          value={mockStats.universityPlayers}
          unit="名"
          change={mockStats.yearOverYear.universityChange}
          color={universityColor}
          bgGradient={`linear-gradient(135deg, ${alpha(universityColor, 0.08)} 0%, ${alpha(universityColor, 0.02)} 100%)`}
        />
        <StatBubble
          icon={<EmojiEvents sx={{ fontSize: 20, color: '#fff' }} />}
          label="対象学校数"
          value={mockStats.totalSchools}
          unit="校"
          color={isDark ? '#ce93d8' : '#7b1fa2'}
          bgGradient={`linear-gradient(135deg, rgba(123,31,162,0.08) 0%, rgba(123,31,162,0.02) 100%)`}
        />
      </Box>

      {/* 高校生 / 大学生の比率バー */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: '20px',
          mb: 3,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          高校生・大学生の内訳
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                height: 14,
                borderRadius: '7px',
                overflow: 'hidden',
                display: 'flex',
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              }}
            >
              <Box
                sx={{
                  width: `${highschoolPercent}%`,
                  bgcolor: highschoolColor,
                  borderRadius: '7px 0 0 7px',
                  transition: 'width 0.6s ease-out',
                }}
              />
              <Box
                sx={{
                  flex: 1,
                  bgcolor: universityColor,
                  borderRadius: '0 7px 7px 0',
                }}
              />
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '4px',
                bgcolor: highschoolColor,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              高校生 {mockStats.highschoolPlayers}名 ({highschoolPercent}%)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '4px',
                bgcolor: universityColor,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              大学生 {mockStats.universityPlayers}名 ({100 - highschoolPercent}%)
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* 推移チャート + 都道府県ランキング */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2.5,
          mb: 3,
        }}
      >
        {/* 推移チャート */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: '20px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <TrendingUp sx={{ fontSize: 18, color: primaryColor }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              週間推移
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, display: 'block', mb: 2 }}
          >
            志望届提出の週ごとの累計推移
          </Typography>
          <MiniBarChart data={mockTrendData} primaryColor={primaryColor} />
          <Box sx={{ display: 'flex', gap: 2, mt: 1.5, justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: highschoolColor }} />
              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: theme.palette.text.secondary }}>
                高校生
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: universityColor }} />
              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: theme.palette.text.secondary }}>
                大学生
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* 都道府県ランキング */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: '20px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <LocationOn sx={{ fontSize: 18, color: primaryColor }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              都道府県ランキング
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, display: 'block', mb: 2 }}
          >
            {mockStats.topPrefecture}が{mockStats.topPrefectureCount}名でトップ
          </Typography>
          {mockPrefectureRanking.map((item, i) => (
            <Box
              key={item.prefecture}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1,
                px: 1,
                borderRadius: '12px',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  bgcolor: i === 0 ? primaryColor : 'transparent',
                  color: i === 0 ? '#fff' : theme.palette.text.disabled,
                  border: i === 0 ? 'none' : `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                }}
              >
                {i + 1}
              </Avatar>
              <Typography
                variant="body2"
                sx={{ fontWeight: i === 0 ? 700 : 500, flex: 1 }}
              >
                {item.prefecture}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: i === 0 ? primaryColor : theme.palette.text.primary,
                }}
              >
                {item.count}名
              </Typography>
              <Box sx={{ width: 50 }}>
                <LinearProgress
                  variant="determinate"
                  value={item.percentage}
                  sx={{
                    height: 6,
                    borderRadius: '3px',
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: '3px',
                      bgcolor: i === 0 ? primaryColor : alpha(primaryColor, 0.45),
                    },
                  }}
                />
              </Box>
            </Box>
          ))}
        </Paper>
      </Box>

      {/* 最新の届出 */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: '20px',
          mb: 4,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
          最新の届出
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            scrollSnapType: 'x mandatory',
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
            },
          }}
        >
          {mockRecentPlayers.map((player) => {
            const typeColor =
              player.type === 'highschool' ? highschoolColor : universityColor;
            return (
              <Paper
                key={player.id}
                elevation={0}
                sx={{
                  p: 2,
                  minWidth: 200,
                  borderRadius: '16px',
                  scrollSnapAlign: 'start',
                  border: `1.5px solid ${alpha(typeColor, isDark ? 0.2 : 0.12)}`,
                  bgcolor: alpha(typeColor, isDark ? 0.06 : 0.03),
                  flexShrink: 0,
                  transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                  '&:hover': {
                    borderColor: alpha(typeColor, 0.4),
                    boxShadow: `0 4px 16px ${alpha(typeColor, 0.12)}`,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: typeColor,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderRadius: '12px',
                    }}
                  >
                    {player.name.charAt(0)}
                  </Avatar>
                  <Chip
                    label={player.type === 'highschool' ? '高校' : '大学'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      bgcolor: alpha(typeColor, isDark ? 0.2 : 0.12),
                      color: typeColor,
                      borderRadius: '8px',
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                  {player.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: '0.7rem',
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  {player.school}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.text.disabled, fontSize: '0.6rem' }}
                >
                  {player.prefecture} ・ {new Date(player.filingDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                </Typography>
              </Paper>
            );
          })}
        </Box>
      </Paper>

      {/* ===== PlayerList Section ===== */}

      <Divider sx={{ mb: 3 }} />

      {/* ヘッダー + フィルター */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 2.5,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, fontSize: '1.1rem' }}
        >
          選手一覧
        </Typography>
        <Chip
          label={`${filteredPlayers.length}名`}
          size="small"
          sx={{
            height: 24,
            fontSize: '0.7rem',
            fontWeight: 700,
            bgcolor: alpha(primaryColor, isDark ? 0.15 : 0.08),
            color: primaryColor,
            borderRadius: '8px',
          }}
        />
        <Box sx={{ flex: 1 }} />

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, val) => val && setViewMode(val)}
          size="small"
          aria-label="表示切替"
          sx={{
            '& .MuiToggleButton-root': {
              borderRadius: '10px',
              border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
              px: 1.5,
              py: 0.5,
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              '&.Mui-selected': {
                bgcolor: alpha(primaryColor, isDark ? 0.2 : 0.1),
                color: primaryColor,
                borderColor: alpha(primaryColor, 0.4),
              },
            },
          }}
        >
          <ToggleButton value="card" aria-label="カード表示">
            <ViewModule sx={{ fontSize: 16, mr: 0.5 }} />
            カード
          </ToggleButton>
          <ToggleButton value="list" aria-label="リスト表示">
            <ViewList sx={{ fontSize: 16, mr: 0.5 }} />
            リスト
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* 検索・フィルター */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="選手名・学校名で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            width: { xs: '100%', sm: 260 },
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                </InputAdornment>
              ),
            }
          }}
        />
        <FormControl
          size="small"
          sx={{
            minWidth: 140,
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
            },
          }}
        >
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
      </Box>

      {/* カード表示 */}
      {viewMode === 'card' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              highschoolColor={highschoolColor}
              universityColor={universityColor}
            />
          ))}
        </Box>
      )}

      {/* リスト表示 */}
      {viewMode === 'list' && (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  選手名
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  学校
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  都道府県
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  ポジション
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  提出日
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPlayers.map((player) => {
                const isHighschool = player.school.includes('高校');
                const typeColor = isHighschool
                  ? highschoolColor
                  : universityColor;

                return (
                  <TableRow
                    key={player.id}
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        bgcolor: isDark
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(0,0,0,0.02)',
                      },
                      '&:last-child td': { borderBottom: 0 },
                    }}
                  >
                    <TableCell>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: alpha(typeColor, isDark ? 0.2 : 0.1),
                            color: typeColor,
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            borderRadius: '10px',
                          }}
                        >
                          {player.name.charAt(0)}
                        </Avatar>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600 }}
                        >
                          {player.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography variant="body2">
                          {player.school}
                        </Typography>
                        <Chip
                          label={isHighschool ? '高校' : '大学'}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            bgcolor: alpha(typeColor, isDark ? 0.18 : 0.1),
                            color: typeColor,
                            borderRadius: '6px',
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {player.prefecture}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={player.position}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 24,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          borderRadius: '8px',
                          borderColor: isDark
                            ? 'rgba(255,255,255,0.15)'
                            : 'rgba(0,0,0,0.12)',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        {new Date(player.filingDate).toLocaleDateString(
                          'ja-JP',
                          { month: 'short', day: 'numeric' }
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 該当なし */}
      {filteredPlayers.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            textAlign: 'center',
            py: 8,
            borderRadius: '20px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
          }}
        >
          <SportsCricket
            sx={{
              fontSize: 48,
              color: theme.palette.text.disabled,
              mb: 1,
            }}
          />
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            該当する選手が見つかりませんでした
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.disabled, mt: 0.5, display: 'block' }}
          >
            検索条件を変更してみてください
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
