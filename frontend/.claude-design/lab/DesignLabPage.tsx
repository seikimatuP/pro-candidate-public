import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import { LabShell } from './LabShell';
import VariantA from './variants/VariantA';
import VariantB from './variants/VariantB';
import VariantC from './variants/VariantC';
import VariantD from './variants/VariantD';
import VariantE from './variants/VariantE';
import VariantF from './variants/VariantF';
import ColorCompare from './variants/ColorCompare';
import DarkModeCompare from './variants/DarkModeCompare';

const variants = [
  {
    id: 'Dark',
    label: 'ダークモード比較',
    rationale: '5つのダークモード配色を比較。背景の明るさやアクセント色の違いを確認。',
    Component: DarkModeCompare,
    color: '#78909C',
  },
  {
    id: 'Color',
    label: '明るいカラーパレット比較',
    rationale: '紺・ダークを排除した4つの明るいパレット。同じレイアウトで比較して好みを選択。',
    Component: ColorCompare,
    color: '#42A5F5',
  },
  {
    id: 'D改善版',
    label: 'D改善版（円グラフ追加）★採用',
    rationale: 'Variant Dベース。最新届け出を削除し、高校/大学比率と都道府県別の円グラフを追加。Dashboardに反映済み。',
    Component: VariantF,
    color: '#4caf50',
  },
  {
    id: 'A',
    label: '情報ヒエラルキー重視',
    rationale: '総選手数をHero数字として巨大表示（72px+）。サブ数字はコンパクト。情報の優先度が明確。',
    Component: VariantA,
    color: '#2196f3',
  },
  {
    id: 'B',
    label: 'Editorial Sports（スポーツ新聞風）',
    rationale: 'MUI基盤にBebas Neue見出し。赤アクセントの速報バッジ、左ボーダーによるセクション区切り。',
    Component: VariantB,
    color: '#d32f2f',
  },
  {
    id: 'C',
    label: 'Bento Grid強化（密度バランス型）',
    rationale: 'カードサイズに変化をつけたBento Grid。重要カードは2x2、補助カードは1x1で視覚リズム。',
    Component: VariantC,
    color: '#9c27b0',
  },
  {
    id: 'D',
    label: 'データストーリーテリング（元版）',
    rationale: '数字にナラティブを付与。sparkline、変化量、テキストで「今年はこうなっている」を伝える。',
    Component: VariantD,
    color: '#ef6c00',
  },
  {
    id: 'E',
    label: 'カジュアルスポーツアプリ風',
    rationale: '丸みのあるUI、カラフルな色使い。カード/リスト切替、遊び心のあるインタラクション。',
    Component: VariantE,
    color: '#00897b',
  },
];

export default function DesignLabPage() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <LabShell>
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(8px)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 56 } }}
        >
          {variants.map((v) => (
            <Tab
              key={v.id}
              label={
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1
                  }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: v.color }} />
                  <Typography variant="body2" sx={{
                    fontWeight: "600"
                  }}>{v.id}: {v.label}</Typography>
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {variants.map((v, index) => (
        <Box key={v.id} data-variant={v.id} sx={{ display: activeTab === index ? 'block' : 'none' }}>
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 1
              }}>
              <Chip label={v.id} size="small" sx={{ bgcolor: v.color, color: '#fff', fontWeight: 700 }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "700",
                  color: "text.primary"
                }}>{v.label}</Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                maxWidth: 600
              }}>{v.rationale}</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          <Paper elevation={0} sx={{ border: `2px solid ${alpha(v.color, 0.2)}`, borderRadius: 3, overflow: 'hidden', bgcolor: 'background.default' }}>
            <v.Component />
          </Paper>
        </Box>
      ))}
    </LabShell>
  );
}
