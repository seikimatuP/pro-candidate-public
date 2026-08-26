import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import { ArrowForward, CheckCircle } from '@mui/icons-material';
import { mockStats, mockPrefectureRanking, mockTrendData } from '../data/fixtures';

// ============================================================
// カラーパレット比較バリアント
// 紺・ダークを排除し、明るくきれいな4パレットを比較
// ============================================================

/** パレット定義 */
interface Palette {
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

const palettes: Palette[] = [
  {
    id: 'sky-coral',
    name: 'A: スカイ & コーラル',
    description: '爽やかなスカイブルーとコーラルピンク。清潔感がありつつ親しみやすい。',
    primary: '#42A5F5',
    primaryLight: '#90CAF9',
    secondary: '#FF6B6B',
    highschool: '#26A69A',
    university: '#FFA726',
    bg: '#F5F8FF',
    cardBg: '#FFFFFF',
    textPrimary: '#1A2027',
    textSecondary: '#637381',
    ranking: { gold: '#FFB300', silver: '#90A4AE', bronze: '#BCAAA4' },
  },
  {
    id: 'emerald-warm',
    name: 'B: エメラルド & ウォーム',
    description: 'スポーツらしいグリーンに暖色アクセント。活力と自然な明るさ。',
    primary: '#26A69A',
    primaryLight: '#80CBC4',
    secondary: '#FF8A65',
    highschool: '#42A5F5',
    university: '#FFA726',
    bg: '#F3FAF9',
    cardBg: '#FFFFFF',
    textPrimary: '#1A2027',
    textSecondary: '#637381',
    ranking: { gold: '#FFB300', silver: '#90A4AE', bronze: '#BCAAA4' },
  },
  {
    id: 'sakura-sky',
    name: 'C: さくら & スカイ',
    description: '桜ピンクとスカイブルーの組み合わせ。やわらかく華やかな印象。',
    primary: '#EC407A',
    primaryLight: '#F48FB1',
    secondary: '#42A5F5',
    highschool: '#26A69A',
    university: '#FFA726',
    bg: '#FFF5F8',
    cardBg: '#FFFFFF',
    textPrimary: '#1A2027',
    textSecondary: '#637381',
    ranking: { gold: '#FFB300', silver: '#90A4AE', bronze: '#BCAAA4' },
  },
  {
    id: 'sunny-teal',
    name: 'D: サニー & ティール',
    description: 'あたたかいオレンジとティールの補色関係。エネルギッシュで楽しい。',
    primary: '#FF9800',
    primaryLight: '#FFB74D',
    secondary: '#26A69A',
    highschool: '#42A5F5',
    university: '#EC407A',
    bg: '#FFFAF3',
    cardBg: '#FFFFFF',
    textPrimary: '#1A2027',
    textSecondary: '#637381',
    ranking: { gold: '#FFB300', silver: '#90A4AE', bronze: '#BCAAA4' },
  },
];

/** 色のalpha変換 */
const hexToAlpha = (hex: string, a: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
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
const PalettePreview: React.FC<{ palette: Palette }> = ({ palette }) => {
  const p = palette;
  const trendTotals = mockTrendData.map(d => d.total);
  const trendHs = mockTrendData.map(d => d.highschool);
  const trendUni = mockTrendData.map(d => d.university);

  return (
    <Box sx={{ bgcolor: p.bg, borderRadius: 4, p: 3, border: `2px solid ${hexToAlpha(p.primary, 0.2)}`, transition: 'box-shadow 0.3s', '&:hover': { boxShadow: `0 8px 32px ${hexToAlpha(p.primary, 0.15)}` } }}>
      {/* ヘッダー */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 1
        }}>
        <Typography sx={{ fontWeight: 800, fontSize: 16, color: p.primary, flex: 1 }}>{p.name}</Typography>
        <Box
          sx={{
            display: "flex",
            gap: 0.5
          }}>
          {[p.primary, p.primaryLight, p.secondary, p.highschool, p.university].map((c, i) => (
            <Box key={i} sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: c, border: '2px solid white', boxShadow: `0 1px 3px ${hexToAlpha(c, 0.3)}` }} />
          ))}
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: p.textSecondary, display: 'block', mb: 2.5, lineHeight: 1.6 }}>{p.description}</Typography>

      {/* ミニAppBarプレビュー */}
      <Box sx={{ bgcolor: p.cardBg, borderRadius: 2, mb: 2, p: 1.5, display: 'flex', alignItems: 'center', gap: 1, boxShadow: `0 1px 4px ${hexToAlpha(p.primary, 0.08)}` }}>
        <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: p.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>P</Typography>
        </Box>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: p.primary }}>プロ野球志望届</Typography>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: hexToAlpha(p.primary, 0.1) }} />
      </Box>

      {/* NarrativeCards（3枚） */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
        {[
          { label: '高校生', value: mockStats.highschoolPlayers, color: p.highschool, spark: trendHs },
          { label: '大学生', value: mockStats.universityPlayers, color: p.university, spark: trendUni },
          { label: '合計', value: mockStats.totalPlayers, color: p.primary, spark: trendTotals },
        ].map(card => (
          <Paper key={card.label} elevation={0} sx={{
            p: 1.5, borderRadius: 2,
            bgcolor: hexToAlpha(card.color, 0.06),
            borderLeft: `3px solid ${card.color}`,
            border: `1px solid ${hexToAlpha(card.color, 0.12)}`,
            borderLeftWidth: 3, borderLeftColor: card.color,
          }}>
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: card.color, mb: 0.5, letterSpacing: '0.02em' }}>{card.label}</Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end"
              }}>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</Typography>
              <Sparkline data={card.spark} color={card.color} width={48} height={16} />
            </Box>
          </Paper>
        ))}
      </Box>

      {/* バーチャート風 */}
      <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, mb: 2, bgcolor: p.cardBg, border: `1px solid ${hexToAlpha(p.primary, 0.08)}` }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: p.textPrimary, mb: 1 }}>登録推移</Typography>
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "flex-end",
            height: 60
          }}>
          {mockTrendData.map((point, i) => {
            const max = Math.max(...mockTrendData.map(d => d.total));
            const isLast = i === mockTrendData.length - 1;
            const barAlpha = isLast ? 1 : 0.15 + (i / Math.max(mockTrendData.length - 1, 1)) * 0.45;
            return (
              <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 8, fontWeight: isLast ? 800 : 500, color: isLast ? p.primary : p.textSecondary }}>{point.total}</Typography>
                <Box sx={{ height: 40, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <Box sx={{
                    height: max > 0 ? `${(point.total / max) * 100}%` : '4px',
                    bgcolor: isLast ? p.primary : hexToAlpha(p.primary, barAlpha),
                    borderRadius: '3px 3px 0 0', minHeight: 3,
                  }} />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ランキング */}
      <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, mb: 2, bgcolor: p.cardBg, border: `1px solid ${hexToAlpha(p.primary, 0.08)}` }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: p.textPrimary, mb: 1 }}>地域別ランキング</Typography>
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
              <Typography sx={{ width: 16, fontWeight: 800, fontSize: 11, color: rankColor, textAlign: 'right' }}>{i + 1}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: i === 0 ? 700 : 500, flex: 1, color: p.textPrimary }}>{item.prefecture}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: p.textPrimary }}>{item.count}</Typography>
              <Box sx={{ width: 40 }}>
                <Box sx={{ height: 3, borderRadius: 2, bgcolor: hexToAlpha(p.primary, 0.08) }}>
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
          gap: 1,
          mb: 2
        }}>
        {[
          { label: '高校生一覧', color: p.highschool },
          { label: '大学生一覧', color: p.university },
        ].map(btn => (
          <Paper key={btn.label} elevation={0} sx={{
            p: 1.5, flex: 1, borderRadius: 2, cursor: 'default',
            bgcolor: hexToAlpha(btn.color, 0.06),
            border: `1px solid ${hexToAlpha(btn.color, 0.12)}`,
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

      {/* カラースウォッチ */}
      <Divider sx={{ mb: 2, borderColor: hexToAlpha(p.primary, 0.1) }} />
      <Box
        sx={{
          display: "flex",
          gap: 0.75,
          flexWrap: "wrap"
        }}>
        {[
          { label: 'Primary', color: p.primary },
          { label: 'Light', color: p.primaryLight },
          { label: 'Accent', color: p.secondary },
          { label: '高校', color: p.highschool },
          { label: '大学', color: p.university },
          { label: 'BG', color: p.bg },
        ].map(s => (
          <Chip key={s.label} size="small" label={`${s.label}: ${s.color}`} sx={{
            bgcolor: hexToAlpha(s.color === p.bg ? '#888888' : s.color, 0.1),
            color: s.color === p.bg ? p.textPrimary : s.color,
            fontWeight: 600, fontSize: 9, height: 22,
            border: `1px solid ${hexToAlpha(s.color === p.bg ? '#888888' : s.color, 0.2)}`,
          }} />
        ))}
      </Box>
    </Box>
  );
};

export default function ColorCompare() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          mb: 1
        }}>
        <CheckCircle sx={{ color: '#4CAF50', fontSize: 28 }} />
        <Typography variant="h5" sx={{
          fontWeight: "800"
        }}>明るいカラーパレット比較</Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 1
        }}>
        紺・ダークを排除した4つの明るいパレット候補。同じダッシュボードレイアウトで比較できます。
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          mb: 3,
          display: 'block'
        }}>
        好みのパレットを選んだら教えてください。そのまま全ページに適用します。
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {palettes.map(p => (
          <PalettePreview key={p.id} palette={p} />
        ))}
      </Box>
    </Box>
  );
}
