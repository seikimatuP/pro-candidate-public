import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { mockStats, mockPrefectureRanking, mockTrendData } from '../data/fixtures';

// ============================================================
// ダークモード バリエーション比較
// 4つのダークモード配色を比較する
// ============================================================

interface DarkPalette {
  id: string;
  name: string;
  description: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  highschool: string;
  university: string;
  bg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  ranking: { gold: string; silver: string; bronze: string };
}

const darkPalettes: DarkPalette[] = [
  {
    id: 'skillsmp-pro',
    name: '★ SkillsMP風プロ仕様',
    description: '深い黒、細いボーダー、グロー効果。ハイコントラストで洗練された印象。',
    primary: '#60A5FA',       // 鮮やかなスカイブルー
    primaryLight: '#93C5FD',
    secondary: '#F472B6',     // ピンク
    highschool: '#34D399',    // 鮮やかなエメラルド
    university: '#FBBF24',    // 鮮やかなアンバー
    bg: '#080808',            // 深い黒
    cardBg: '#0F0F0F',        // 少し明るい黒
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    ranking: { gold: '#FBBF24', silver: '#9CA3AF', bronze: '#D97706' },
  },
  {
    id: 'current',
    name: '現在（ネイビー）',
    description: '現在の設定。濃いネイビーブルーの背景。',
    primary: '#90CAF9',
    primaryLight: '#BBDEFB',
    secondary: '#FF8A80',
    highschool: '#4DB6AC',
    university: '#FFB74D',
    bg: '#0D1B2A',
    cardBg: '#1B2838',
    textPrimary: '#E8EAED',
    textSecondary: '#B0B8C4',
    ranking: { gold: '#FFD54F', silver: '#B0BEC5', bronze: '#D7CCC8' },
  },
  {
    id: 'lighter-navy',
    name: '1: 明るめネイビー',
    description: '背景を明るくした柔らかいダークモード。目に優しい。',
    primary: '#90CAF9',
    primaryLight: '#BBDEFB',
    secondary: '#FF8A80',
    highschool: '#4DB6AC',
    university: '#FFB74D',
    bg: '#1E2A3A',
    cardBg: '#2A3A4A',
    textPrimary: '#E8EAED',
    textSecondary: '#B0B8C4',
    ranking: { gold: '#FFD54F', silver: '#B0BEC5', bronze: '#D7CCC8' },
  },
  {
    id: 'neutral-gray',
    name: '2: ニュートラルグレー',
    description: '青みを排除した純粋なダークグレー。Material Design風。',
    primary: '#90CAF9',
    primaryLight: '#BBDEFB',
    secondary: '#FF8A80',
    highschool: '#4DB6AC',
    university: '#FFB74D',
    bg: '#121212',
    cardBg: '#1E1E1E',
    textPrimary: '#FFFFFF',
    textSecondary: '#B3B3B3',
    ranking: { gold: '#FFD54F', silver: '#B0BEC5', bronze: '#D7CCC8' },
  },
  {
    id: 'vivid-accents',
    name: '3: 鮮やかアクセント',
    description: '高校生/大学生の色を彩度高く。データが目立つ。',
    primary: '#64B5F6',
    primaryLight: '#90CAF9',
    secondary: '#FF8A80',
    highschool: '#1DE9B6',  // 鮮やかなティール
    university: '#FFAB40',  // 鮮やかなオレンジ
    bg: '#0D1B2A',
    cardBg: '#1B2838',
    textPrimary: '#E8EAED',
    textSecondary: '#B0B8C4',
    ranking: { gold: '#FFD740', silver: '#B0BEC5', bronze: '#BCAAA4' },
  },
  {
    id: 'warm-primary',
    name: '4: ウォームプライマリ',
    description: 'プライマリ色をオレンジ系に。暖かみのある印象。',
    primary: '#FFB74D',
    primaryLight: '#FFE082',
    secondary: '#FF8A80',
    highschool: '#4DB6AC',
    university: '#90CAF9',
    bg: '#1A1A2E',
    cardBg: '#25254A',
    textPrimary: '#E8EAED',
    textSecondary: '#B0B8C4',
    ranking: { gold: '#FFD54F', silver: '#B0BEC5', bronze: '#D7CCC8' },
  },
];

/** 色のalpha変換 */
const hexToAlpha = (hex: string, a: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** ミニSparkline */
const Sparkline = ({ data, color, width = 72, height = 20 }: { data: number[]; color: string; width?: number; height?: number }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2} r={2} fill={color} />
    </svg>
  );
};

/** 各パレットのプレビューカード */
const DarkPalettePreview: React.FC<{ palette: DarkPalette }> = ({ palette }) => {
  const p = palette;
  const trendTotals = mockTrendData.map(d => d.total);
  const trendHs = mockTrendData.map(d => d.highschool);
  const trendUni = mockTrendData.map(d => d.university);
  const isPro = p.id === 'skillsmp-pro';

  return (
    <Box sx={{
      bgcolor: p.bg,
      borderRadius: 3,
      p: 2.5,
      border: isPro ? `1px solid ${hexToAlpha(p.primary, 0.2)}` : `2px solid ${hexToAlpha(p.primary, 0.3)}`,
      boxShadow: isPro ? `0 0 40px ${hexToAlpha(p.primary, 0.1)}, inset 0 1px 0 ${hexToAlpha('#FFFFFF', 0.03)}` : 'none',
    }}>
      {/* ヘッダー: パレット名 + スウォッチ */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2
        }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: p.textPrimary, flex: 1 }}>{p.name}</Typography>
        <Box
          sx={{
            display: "flex",
            gap: 0.5
          }}>
          {[p.bg, p.cardBg, p.primary, p.highschool, p.university].map((c, i) => (
            <Box key={i} sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: c, border: '1px solid rgba(255,255,255,0.2)' }} />
          ))}
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: p.textSecondary, display: 'block', mb: 2 }}>{p.description}</Typography>

      {/* NarrativeCards（3枚） */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
        {[
          { label: '高校生', value: mockStats.highschoolPlayers, color: p.highschool, tint: hexToAlpha(p.highschool, 0.12), spark: trendHs },
          { label: '大学生', value: mockStats.universityPlayers, color: p.university, tint: hexToAlpha(p.university, 0.12), spark: trendUni },
          { label: '合計', value: mockStats.totalPlayers, color: p.primary, tint: hexToAlpha(p.primary, 0.12), spark: trendTotals },
        ].map(card => (
          <Paper key={card.label} elevation={0} sx={{
            p: 1.5, borderRadius: 2, bgcolor: p.cardBg,
            border: isPro ? `1px solid ${hexToAlpha(card.color, 0.15)}` : `1px solid ${hexToAlpha(card.color, 0.2)}`,
            borderLeft: `3px solid ${card.color}`,
            boxShadow: isPro ? `0 0 20px ${hexToAlpha(card.color, 0.15)}` : 'none',
            transition: 'box-shadow 0.2s, border-color 0.2s',
            '&:hover': isPro ? {
              boxShadow: `0 0 30px ${hexToAlpha(card.color, 0.25)}`,
              borderColor: hexToAlpha(card.color, 0.3),
            } : {},
          }}>
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: card.color, mb: 0.5, textShadow: isPro ? `0 0 10px ${hexToAlpha(card.color, 0.5)}` : 'none' }}>{card.label}</Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end"
              }}>
              <Typography sx={{
                fontSize: 22, fontWeight: 800, color: card.color, lineHeight: 1,
                textShadow: isPro ? `0 0 20px ${hexToAlpha(card.color, 0.4)}` : 'none',
              }}>{card.value}</Typography>
              <Sparkline data={card.spark} color={card.color} width={48} height={16} />
            </Box>
          </Paper>
        ))}
      </Box>

      {/* バーチャート風（高校・大学色分け） */}
      <Paper elevation={0} sx={{
        p: 1.5, borderRadius: 2, mb: 2, bgcolor: p.cardBg,
        border: isPro ? `1px solid ${hexToAlpha(p.primary, 0.1)}` : `1px solid ${hexToAlpha(p.primary, 0.1)}`,
        boxShadow: isPro ? `0 0 15px ${hexToAlpha(p.primary, 0.08)}` : 'none',
      }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1
          }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: p.textPrimary }}>登録推移</Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1.5
            }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5
              }}>
              <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: p.highschool }} />
              <Typography sx={{ fontSize: 9, color: p.textSecondary }}>高校</Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5
              }}>
              <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: p.university }} />
              <Typography sx={{ fontSize: 9, color: p.textSecondary }}>大学</Typography>
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "flex-end",
            height: 60
          }}>
          {mockTrendData.slice(-8).map((point, i, arr) => {
            const max = Math.max(...arr.map(d => d.total));
            const isLast = i === arr.length - 1;
            const hsHeight = max > 0 ? (point.highschool / max) * 100 : 0;
            const uniHeight = max > 0 ? (point.university / max) * 100 : 0;
            const barAlpha = isLast ? 1 : 0.4 + (i / Math.max(arr.length - 1, 1)) * 0.5;
            return (
              <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
                <Typography sx={{
                  fontSize: 8, fontWeight: isLast ? 800 : 500,
                  color: isLast ? p.textPrimary : p.textSecondary,
                  textShadow: isPro && isLast ? `0 0 8px ${hexToAlpha(p.primary, 0.5)}` : 'none',
                }}>{point.total}</Typography>
                <Box sx={{ height: 40, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '1px' }}>
                  {/* 大学生バー（上） */}
                  <Box sx={{
                    height: `${uniHeight}%`,
                    bgcolor: isLast ? p.university : hexToAlpha(p.university, barAlpha),
                    borderRadius: '2px 2px 0 0', minHeight: uniHeight > 0 ? 2 : 0,
                    boxShadow: isPro && isLast ? `0 0 10px ${hexToAlpha(p.university, 0.4)}` : 'none',
                  }} />
                  {/* 高校生バー（下） */}
                  <Box sx={{
                    height: `${hsHeight}%`,
                    bgcolor: isLast ? p.highschool : hexToAlpha(p.highschool, barAlpha),
                    borderRadius: '0 0 2px 2px', minHeight: hsHeight > 0 ? 2 : 0,
                    boxShadow: isPro && isLast ? `0 0 10px ${hexToAlpha(p.highschool, 0.4)}` : 'none',
                  }} />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ランキング */}
      <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, mb: 2, bgcolor: p.cardBg, border: `1px solid ${hexToAlpha(p.primary, 0.1)}` }}>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: p.textPrimary, mb: 1 }}>地域別ランキング</Typography>
        {mockPrefectureRanking.slice(0, 3).map((item, i) => {
          const rankColor = i === 0 ? p.ranking.gold : i === 1 ? p.ranking.silver : p.ranking.bronze;
          return (
            <Box
              key={item.prefecture}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                py: 0.3
              }}>
              <Typography sx={{ width: 16, fontWeight: 700, fontSize: 11, color: rankColor, textAlign: 'right' }}>{i + 1}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: i === 0 ? 700 : 500, flex: 1, color: p.textPrimary }}>{item.prefecture}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: p.textPrimary }}>{item.count}</Typography>
              <Box sx={{ width: 40 }}>
                <Box sx={{ height: 3, borderRadius: 2, bgcolor: hexToAlpha(p.primary, 0.15) }}>
                  <Box sx={{ height: '100%', width: `${item.percentage}%`, borderRadius: 2, bgcolor: rankColor }} />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Paper>

      {/* クイックアクセス */}
      <Box
        sx={{
          display: "flex",
          gap: 1
        }}>
        {[
          { label: '高校生一覧', color: p.highschool, tint: hexToAlpha(p.highschool, 0.1) },
          { label: '大学生一覧', color: p.university, tint: hexToAlpha(p.university, 0.1) },
        ].map(btn => (
          <Paper key={btn.label} elevation={0} sx={{
            p: 1.5, flex: 1, borderRadius: 2, cursor: 'default',
            bgcolor: btn.tint, border: `1px solid ${hexToAlpha(btn.color, 0.15)}`,
          }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: p.textPrimary }}>{btn.label}</Typography>
                <Typography sx={{ fontSize: 9, color: p.textSecondary }}>詳細データへ</Typography>
              </Box>
              <ArrowForward sx={{ fontSize: 14, color: btn.color }} />
            </Box>
          </Paper>
        ))}
      </Box>

      {/* カラースウォッチ詳細 */}
      <Divider sx={{ my: 2, borderColor: hexToAlpha(p.textSecondary, 0.2) }} />
      <Box
        sx={{
          display: "flex",
          gap: 1,
          flexWrap: "wrap"
        }}>
        {[
          { label: 'BG', color: p.bg },
          { label: 'Card', color: p.cardBg },
          { label: 'Primary', color: p.primary },
          { label: '高校', color: p.highschool },
          { label: '大学', color: p.university },
        ].map(s => (
          <Chip key={s.label} size="small" label={`${s.label}: ${s.color}`} sx={{
            bgcolor: hexToAlpha(s.color, 0.2), color: s.color,
            fontWeight: 600, fontSize: 9, height: 20,
            border: `1px solid ${hexToAlpha(s.color, 0.3)}`,
          }} />
        ))}
      </Box>
    </Box>
  );
};

export default function DarkModeCompare() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
      <Typography
        variant="h5"
        sx={{
          fontWeight: "800",
          mb: 1
        }}>ダークモード比較</Typography>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 3
        }}>
        5つのダークモードバリエーションを並べて比較。好みの配色を選んでください。
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
        {darkPalettes.map(p => (
          <DarkPalettePreview key={p.id} palette={p} />
        ))}
      </Box>
    </Box>
  );
}
