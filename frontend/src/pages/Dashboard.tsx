import React from 'react';
import {
  Alert,
  Box,
  Button,
  Collapse,
  IconButton,
  Paper,
  Skeleton,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { ExpandLess, ExpandMore, Refresh } from '@mui/icons-material';
import { useSemanticColors } from '../contexts/ThemeContext';
import { useDashboardData } from '../hooks/useDashboardData';

/**
 * デジタル庁「ダッシュボードデザインの実践ガイドブック」準拠のレイアウト定数。
 * https://www.digital.go.jp/resources/dashboard-guidebook
 *
 * - 余白は8pxグリッドに揃え、カード間のガター（24px）とカード内padding（24px）を統一する
 * - 角丸・枠線は最小限に留める（4.5 Do's Don'ts「不要な要素は削除する」）
 */
const GUTTER = 3; // 24px
const CARD_RADIUS = 1.5; // theme.shape.borderRadius(8px) × 1.5 = 12px

/**
 * ベントグリッド（1画面構成）の各タイル高さ（px）。
 *
 * 縦一列のスクロール構成をやめ、デスクトップ（lg以上）では指標行＋分析行の
 * 2行で全体が収まるようにする。高さを固定するのは見た目の統一のためだけでなく、
 * データ到着時に下の要素が押し下げられる Cumulative Layout Shift（CLS）を防ぐため。
 * 読み込み中も同じ寸法の領域を確保する。
 */
/** 指標行（総提出者数・高校生・大学生・内訳）のタイル高さ */
const SUMMARY_TILE_HEIGHT = 148;
/** 分析行（都道府県別・推移）のグラフ本体の高さ。2枚を揃えて1画面に収める */
const PANEL_BODY_HEIGHT = 200;
/** 都道府県別 横棒グラフの1行あたりの高さ */
const PREFECTURE_ROW_HEIGHT = 20;
/** 既定で表示する都道府県の件数。11位以下は展開して表示する */
const PREFECTURE_VISIBLE_COUNT = 10;
/** 推移グラフの棒（積み上げ部分）の高さ。数値ラベルと日付ラベルの分を差し引く */
const TREND_BAR_HEIGHT = PANEL_BODY_HEIGHT - 34;
/** ヘッダーのメタ情報行（caption 1行）の確保高さ。未取得でも領域を保つ */
const HEADER_META_HEIGHT = 20;

/** 「10/3」形式 */
const formatMonthDay = (isoDate: string): string => {
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/** 「2024年10月3日」形式 */
const formatJapaneseDate = (isoDate: string): string => {
  const d = new Date(isoDate);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

// --- サブコンポーネント ---

/**
 * 系列凡例。ガイドブック 4.5「グラフと凡例を隣接させる」に従い、
 * グラフ本体と同じカード内の隣接位置に、グラフと同じ並び順で配置して使う。
 */
const SeriesLegendItem = ({ color, label }: { color: string; label: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
    <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: color, flexShrink: 0 }} />
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
  </Box>
);

/** ベントグリッドのタイル。枠線・角丸・paddingを全タイルで統一する */
const Tile = ({
  children,
  height,
  minHeight,
  sx,
}: {
  children: React.ReactNode;
  height?: number;
  minHeight?: number;
  sx?: object;
}) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        p: GUTTER,
        height,
        minHeight,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: CARD_RADIUS,
        border: `1px solid ${theme.palette.divider}`,
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
};

/** カードの見出し。4.5「タイトルにグラフの内容とデータ種別を表記する」 */
const PanelHeading = ({
  title,
  caption,
  action,
}: {
  title: string;
  caption: string;
  action?: React.ReactNode;
}) => (
  <Box sx={{ mb: 2 }}>
    {/* 幅が足りないときは操作・凡例を次の行へ折り返す（横スクロールを発生させない） */}
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: 0 }}>
        {title}
      </Typography>
      {action}
    </Box>
    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
      {caption}
    </Typography>
  </Box>
);

/**
 * 最重要指標（総提出者数）のタイル。
 * ベントグリッド内で唯一の塗りつぶし面にして、視線の起点を1か所に定める（4.4 強弱の付け方）。
 */
const HeroTile = ({
  total,
  recentDelta,
  loading,
}: {
  total: number;
  recentDelta: number;
  loading?: boolean;
}) => {
  const semantic = useSemanticColors();
  return (
    <Paper
      elevation={0}
      sx={{
        p: GUTTER,
        height: SUMMARY_TILE_HEIGHT,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderRadius: CARD_RADIUS,
        border: `1px solid ${semantic.hero.bg}`,
        bgcolor: semantic.hero.bg,
        color: semantic.hero.text,
      }}
    >
      <Typography variant="caption" sx={{ color: semantic.hero.label, fontWeight: 600 }}>
        総提出者数
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, my: 0.5 }}>
        {loading ? (
          // 実数値の描画高さ（fontSize × lineHeight 1）と一致させる
          <Skeleton
            variant="rectangular"
            width={140}
            sx={{ height: { xs: 48, lg: 64 }, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.18)' }}
          />
        ) : (
          <Typography
            sx={{
              fontSize: { xs: 48, lg: 64 },
              fontWeight: 800,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.03em',
            }}
          >
            {total}
          </Typography>
        )}
        <Typography sx={{ fontSize: 18, fontWeight: 500, color: semantic.hero.label }}>
          名
        </Typography>
      </Box>
      {/* 「直近」の基準は今日ではなく最新届出日。ラベルと注記で基準を明示する */}
      <Typography
        variant="caption"
        sx={{ color: semantic.hero.label, minHeight: HEADER_META_HEIGHT }}
        title="最新届出日を末日とするカレンダー7日間の届出数"
      >
        <Box component="span">最新7日間</Box>
        {!loading && ` ${recentDelta > 0 ? '+' : ''}${recentDelta}名`}
      </Typography>
    </Paper>
  );
};

/** 高校生／大学生の指標タイル。実数と全体に占める割合を併記する */
const StatTile = ({
  label,
  value,
  percent,
  accentColor,
  loading,
}: {
  label: string;
  value: number;
  percent: number | null;
  accentColor: string;
  loading?: boolean;
}) => (
  <Tile height={SUMMARY_TILE_HEIGHT} sx={{ justifyContent: 'center' }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, my: 0.5 }}>
      {loading ? (
        <Skeleton variant="rectangular" width={70} height={36} sx={{ borderRadius: 1 }} />
      ) : (
        <Typography
          sx={{
            fontSize: 36,
            fontWeight: 800,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            color: accentColor,
          }}
        >
          {value}
        </Typography>
      )}
      <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>名</Typography>
    </Box>
    <Typography variant="caption" sx={{ color: 'text.secondary', minHeight: HEADER_META_HEIGHT }}>
      {loading || percent === null ? '' : `全体の${percent}%`}
    </Typography>
  </Tile>
);

/**
 * 都道府県1件分の横棒。原点0で最大値にスケールを固定し、
 * 棒の長さの比が実数の比と一致するようにする（4.5「グラフの原点は0にする」）。
 */
const PrefectureBar = ({
  prefecture,
  count,
  maxCount,
  total,
  color,
}: {
  prefecture: string;
  count: number;
  maxCount: number;
  total: number;
  color: string;
}) => {
  const theme = useTheme();
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        height: PREFECTURE_ROW_HEIGHT,
      }}
    >
      <Typography
        variant="caption"
        sx={{ width: 56, flexShrink: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden' }}
      >
        {prefecture}
      </Typography>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          height: 13,
          borderRadius: 0.5,
          bgcolor: theme.palette.action.hover,
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${(count / maxCount) * 100}%`,
            borderRadius: 0.5,
            bgcolor: color,
          }}
        />
      </Box>
      {/* 色のコントラストだけに頼らず、実数と構成比を併記する（4.3 / 4.5） */}
      <Typography
        variant="caption"
        sx={{
          width: 76,
          flexShrink: 0,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          color: 'text.secondary',
        }}
      >
        {count}名 {pct}%
      </Typography>
    </Box>
  );
};

// --- メインコンポーネント ---

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const semantic = useSemanticColors();
  const isDark = theme.palette.mode === 'dark';
  const primaryColor = theme.palette.primary.main;

  const [prefectureExpanded, setPrefectureExpanded] = React.useState(false);

  const {
    loading,
    isError,
    fetchData,
    dataYear,
    dataUpdatedAt,
    stats,
    prefectureStats,
    recentTrendData,
    heroMeta,
  } = useDashboardData();

  const highschoolPct = stats.total > 0 ? Math.round((stats.highschool / stats.total) * 100) : null;
  const universityPct = highschoolPct === null ? null : 100 - highschoolPct;

  /** 都道府県が判明した人数。県別集計の母数はこちらで、総提出者数とは一致しない */
  const resolvedTotal = React.useMemo(
    () => prefectureStats.list.reduce((sum, p) => sum + p.count, 0),
    [prefectureStats]
  );
  const resolvedPct = stats.total > 0 ? Math.round((resolvedTotal / stats.total) * 100) : 0;

  /** 下部メタ情報の集計対象年度。未取得の理由（読み込み中／取得失敗）で表記を分ける */
  let targetYearLabel = '取得中';
  if (dataYear !== null) {
    targetYearLabel = `${dataYear}年度`;
  } else if (isError) {
    targetYearLabel = '—';
  }

  const hiddenPrefectureCount = Math.max(prefectureStats.list.length - PREFECTURE_VISIBLE_COUNT, 0);

  /**
   * 都道府県の順位に応じた棒の色。
   * 金銀銅のような数値と無関係な装飾色は使わず、Blue の濃淡3段だけで強弱をつける（4.4）。
   */
  const rankColor = (index: number): string => {
    if (index === 0) return semantic.emphasis.strong;
    if (index < 5) return semantic.emphasis.base;
    return semantic.emphasis.soft;
  };

  /** ヘッダー1行目に「／」区切りで並べるメタ情報。取得できた項目だけを詰める */
  const headerMetaItems: { key: string; node: React.ReactNode }[] = [];
  if (dataYear !== null) {
    headerMetaItems.push({
      key: 'year',
      node: (
        <Box component="span" sx={{ fontWeight: 600, color: primaryColor }}>
          {`${dataYear}年度`}
        </Box>
      ),
    });
  }
  if (dataUpdatedAt) {
    headerMetaItems.push({
      key: 'updated',
      node: `データ更新 ${formatJapaneseDate(dataUpdatedAt)}`,
    });
  }
  if (heroMeta?.latestDate) {
    headerMetaItems.push({
      key: 'latest',
      node: (
        <>
          <Box component="span">最新届出日</Box>
          {` ${formatJapaneseDate(heroMeta.latestDate)}`}
        </>
      ),
    });
  }

  const maxPrefectureCount = prefectureStats.list[0]?.count || 1;
  const maxTrendTotal = React.useMemo(
    () => Math.max(...recentTrendData.map(d => d.total), 0),
    [recentTrendData]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 0 }, maxWidth: 1440, mx: 'auto' }}>
      {/* ヘッダー。年度・データ更新・最新届出日を1行にまとめ、本文の高さを稼ぐ */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 2,
          mb: GUTTER,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              // 年度・更新時刻は API のレスポンス到着後に確定する。未取得でも行の高さは保つ
              minHeight: HEADER_META_HEIGHT,
            }}
          >
            {/* 未取得の項目は区切り文字ごと出さない（「／」だけが残るのを防ぐ） */}
            {headerMetaItems.map((item, i) => (
              <React.Fragment key={item.key}>
                {i > 0 && ' ／ '}
                {item.node}
              </React.Fragment>
            ))}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: 22, md: 26 },
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
            }}
          >
            プロ野球志望届
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            ドラフト候補選手の届出状況
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {/* 県別集計の母数が総提出者数と違うことを、グラフを見る前に明示する（4.4 データを定義する） */}
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textAlign: 'right',
              display: { xs: 'none', md: 'block' },
              maxWidth: 320,
              minHeight: HEADER_META_HEIGHT,
            }}
          >
            {!loading && !isError && prefectureStats.unresolvedCount > 0
              ? `地域別集計は${stats.total}名中${resolvedTotal}名（${resolvedPct}%）。地域不明${prefectureStats.unresolvedCount}名を除く`
              : ''}
          </Typography>
          <Tooltip title="データを更新">
            <span>
              <IconButton onClick={fetchData} disabled={loading} aria-label="データを更新">
                <Refresh fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* 取得失敗時は数値を出さない（0名は「0名の届出があった」と誤読されるため） */}
      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchData}>
              再試行
            </Button>
          }
        >
          データを取得できませんでした。集計値は表示していません。時間をおいて再試行してください。
        </Alert>
      )}

      {!isError && (
        <>
          {/* 指標行: 総提出者数 / 高校生 / 大学生 / 内訳 */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(6, minmax(0, 1fr))',
              },
              gap: GUTTER,
              mb: GUTTER,
            }}
          >
            <Box sx={{ gridColumn: { xs: 'auto', sm: 'span 2' } }}>
              <HeroTile
                total={stats.total}
                recentDelta={heroMeta?.recentDelta ?? 0}
                loading={loading}
              />
            </Box>
            <StatTile
              label="高校生"
              value={stats.highschool}
              percent={highschoolPct}
              accentColor={semantic.highschool}
              loading={loading}
            />
            <StatTile
              label="大学生"
              value={stats.university}
              percent={universityPct}
              accentColor={semantic.university}
              loading={loading}
            />
            <Box sx={{ gridColumn: { xs: 'auto', sm: 'span 2' } }}>
              <Tile height={SUMMARY_TILE_HEIGHT} sx={{ justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1 }}>
                  高校生・大学生の内訳
                </Typography>
                {/* 色面の中に構成比を併記し、色のみに依存せず判別できるようにする（4.3 / 4.5） */}
                <Box
                  sx={{
                    display: 'flex',
                    height: 28,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: theme.palette.action.hover,
                  }}
                  role="img"
                  aria-label={
                    loading || highschoolPct === null
                      ? '高校生・大学生の内訳（読み込み中）'
                      : `高校生${stats.highschool}名（${highschoolPct}%）、大学生${stats.university}名（${universityPct}%）`
                  }
                >
                  {!loading && stats.highschool > 0 && (
                    <Box
                      sx={{
                        flex: stats.highschool,
                        bgcolor: semantic.highschool,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        transition: 'flex 0.4s ease-out',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          // ダークでは面の色が Blue400 に明るくなるため、白のままだと 2.8:1 まで落ちる
                          color: isDark ? '#000000' : '#FFFFFF',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {highschoolPct}%
                      </Typography>
                    </Box>
                  )}
                  {!loading && stats.university > 0 && (
                    <Box
                      sx={{
                        flex: stats.university,
                        bgcolor: semantic.university,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        transition: 'flex 0.4s ease-out',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: isDark ? '#000000' : '#FFFFFF',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {universityPct}%
                      </Typography>
                    </Box>
                  )}
                </Box>
                {/* 凡例はグラフに隣接させ、順序もグラフと対応させる（4.5） */}
                <Box sx={{ display: 'flex', gap: 2, mt: 1, minHeight: HEADER_META_HEIGHT }}>
                  {!loading && (
                    <>
                      <SeriesLegendItem
                        color={semantic.highschool}
                        label={`高校生 ${stats.highschool}名`}
                      />
                      <SeriesLegendItem
                        color={semantic.university}
                        label={`大学生 ${stats.university}名`}
                      />
                    </>
                  )}
                </Box>
              </Tile>
            </Box>
          </Box>

          {/* 分析行: 都道府県別（横棒） / 提出者数の推移 */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(12, minmax(0, 1fr))' },
              gap: GUTTER,
              alignItems: 'stretch',
            }}
          >
            {/* 都道府県別。従来のドーナツとランキングの二重掲載を横棒1枚に統合した */}
            <Box sx={{ gridColumn: { xs: 'auto', lg: 'span 5' } }}>
              <Tile sx={{ height: '100%' }} minHeight={PANEL_BODY_HEIGHT + 130}>
                <PanelHeading
                  title="都道府県・地区別の提出者数"
                  caption={`多い順・上位${PREFECTURE_VISIBLE_COUNT}件／個人を識別できない集計（単位: 名）`}
                />
                {loading && (
                  <Box sx={{ height: PANEL_BODY_HEIGHT }}>
                    {Array.from({ length: PREFECTURE_VISIBLE_COUNT }).map((_, i) => (
                      <Box
                        key={i}
                        sx={{
                          height: PREFECTURE_ROW_HEIGHT,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Skeleton variant="rectangular" width="100%" height={13} />
                      </Box>
                    ))}
                  </Box>
                )}
                {!loading && prefectureStats.list.length === 0 && (
                  <Box sx={{ height: PANEL_BODY_HEIGHT }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      都道府県を判別できるデータがありません。
                    </Typography>
                  </Box>
                )}
                {!loading && prefectureStats.list.length > 0 && (
                  <>
                    <Box sx={{ minHeight: PANEL_BODY_HEIGHT }}>
                      {prefectureStats.list.slice(0, PREFECTURE_VISIBLE_COUNT).map((item, i) => (
                        <PrefectureBar
                          key={item.prefecture}
                          prefecture={item.prefecture}
                          count={item.count}
                          maxCount={maxPrefectureCount}
                          total={resolvedTotal}
                          color={rankColor(i)}
                        />
                      ))}
                    </Box>
                    <Collapse in={prefectureExpanded} unmountOnExit>
                      <Box>
                        {prefectureStats.list.slice(PREFECTURE_VISIBLE_COUNT).map((item, i) => (
                          <PrefectureBar
                            key={item.prefecture}
                            prefecture={item.prefecture}
                            count={item.count}
                            maxCount={maxPrefectureCount}
                            total={resolvedTotal}
                            color={rankColor(i + PREFECTURE_VISIBLE_COUNT)}
                          />
                        ))}
                      </Box>
                    </Collapse>
                    <Box
                      sx={{
                        mt: 'auto',
                        pt: 1,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 0 }}>
                        全{prefectureStats.list.length}都道府県
                        {hiddenPrefectureCount > 0 &&
                          ` ／ ${PREFECTURE_VISIBLE_COUNT + 1}位以下は展開して表示`}
                      </Typography>
                      {hiddenPrefectureCount > 0 && (
                        <Button
                          size="small"
                          onClick={() => setPrefectureExpanded(prev => !prev)}
                          endIcon={prefectureExpanded ? <ExpandLess /> : <ExpandMore />}
                          sx={{ flexShrink: 0 }}
                        >
                          {prefectureExpanded ? '閉じる' : `残り${hiddenPrefectureCount}件を表示`}
                        </Button>
                      )}
                    </Box>
                  </>
                )}
              </Tile>
            </Box>

            {/* 推移。凡例は見出し行に置き、グラフと隣接させる（4.5） */}
            <Box sx={{ gridColumn: { xs: 'auto', lg: 'span 7' } }}>
              <Tile sx={{ height: '100%' }} minHeight={PANEL_BODY_HEIGHT + 130}>
                <PanelHeading
                  title="提出者数の推移（日次・積み上げ／単位: 名）"
                  caption={
                    loading || recentTrendData.length === 0
                      ? '最新届出日までの日次推移'
                      : `最新届出日までの${recentTrendData.length}日間（届出の無い日は0本）`
                  }
                  action={
                    // 並び順は積み上げの上から下（大学生→高校生）に対応させる
                    <Box sx={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <SeriesLegendItem color={semantic.university} label="大学生" />
                      <SeriesLegendItem color={semantic.highschool} label="高校生" />
                    </Box>
                  }
                />
                {loading && (
                  <Skeleton
                    variant="rectangular"
                    height={PANEL_BODY_HEIGHT}
                    sx={{ borderRadius: 1 }}
                  />
                )}
                {!loading && recentTrendData.length === 0 && (
                  <Box sx={{ height: PANEL_BODY_HEIGHT }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      推移を表示できるデータがありません。
                    </Typography>
                  </Box>
                )}
                {!loading && recentTrendData.length > 0 && (
                  /* 原点0の積み上げ棒。系列色は一定にし、意味を持たない濃淡変化は使わない（4.5） */
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1.25,
                      alignItems: 'flex-end',
                      height: PANEL_BODY_HEIGHT,
                    }}
                  >
                    {recentTrendData.map((point, i) => {
                      const isLast = i === recentTrendData.length - 1;
                      const hsHeight =
                        maxTrendTotal > 0 ? (point.highschool / maxTrendTotal) * 100 : 0;
                      const uniHeight =
                        maxTrendTotal > 0 ? (point.university / maxTrendTotal) * 100 : 0;
                      const barLabel = `${formatMonthDay(point.date)} 合計${point.total}名（高校生${point.highschool}名・大学生${point.university}名）`;
                      return (
                        <Box key={point.date} sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                          {/* ホバーしないと値が読めない状態を避けるため実数を併記する（4.5） */}
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: isLast ? 700 : 600,
                              fontSize: isLast ? '0.85rem' : '0.7rem',
                              color: isLast ? 'text.primary' : 'text.secondary',
                              display: 'block',
                              lineHeight: '18px',
                            }}
                          >
                            {point.total}
                          </Typography>
                          {/*
                            セグメント間の余白と最小高さは、棒の高さと実数の比を崩すため設けない。
                            区切りは背景色の1pxボーダーで表現する（面積が値に比例する状態を保つ）。
                          */}
                          <Box
                            sx={{
                              height: TREND_BAR_HEIGHT,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                            }}
                            role="img"
                            aria-label={barLabel}
                            title={barLabel}
                          >
                            <Box
                              sx={{
                                height: `${uniHeight}%`,
                                bgcolor: semantic.university,
                                borderRadius: '2px 2px 0 0',
                                borderBottom:
                                  uniHeight > 0 && hsHeight > 0
                                    ? `1px solid ${theme.palette.background.paper}`
                                    : 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                            <Box
                              sx={{
                                height: `${hsHeight}%`,
                                bgcolor: semantic.highschool,
                                borderRadius: uniHeight > 0 ? '0 0 2px 2px' : '2px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </Box>
                          {/* 狭い画面では日付が重なって読めないため、下の範囲表記に切り替える */}
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.disabled',
                              fontSize: '0.65rem',
                              display: { xs: 'none', sm: 'block' },
                              lineHeight: '16px',
                            }}
                          >
                            {formatMonthDay(point.date)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                {/* 日付ラベルを省いた狭い画面向けに、期間の両端だけを示す */}
                {!loading && recentTrendData.length > 0 && (
                  <Box
                    sx={{
                      display: { xs: 'flex', sm: 'none' },
                      justifyContent: 'space-between',
                      mt: 0.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {formatMonthDay(recentTrendData[0].date)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {formatMonthDay(recentTrendData[recentTrendData.length - 1].date)}
                    </Typography>
                  </Box>
                )}
              </Tile>
            </Box>
          </Box>
        </>
      )}

      {/* メタ情報。4.4「メタ情報を記載する」「データを定義する」 */}
      <Box sx={{ mt: GUTTER, pb: 2 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          データ定義:
          各年度に提出されたプロ野球志望届の届出者数。高校生・大学生の区分は在籍区分による。
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          出典:
          日本高等学校野球連盟・全日本大学野球連盟が公式サイトで公示したプロ志望届提出者情報（フッターのリンク先が一次情報）。
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          集計対象: {targetYearLabel}
        </Typography>
      </Box>
    </Box>
  );
};
