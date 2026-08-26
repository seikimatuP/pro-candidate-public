import React from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  InputAdornment,
  Alert,
  Grid,
  useTheme,
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  School,
  TrendingUp,
  Place,
  Person,
} from '@mui/icons-material';
import { PlayerTable } from '../components/tables/PlayerTable';
import { TrendChart } from '../components/charts/TrendChart';
import YearSelector from '../components/selectors/YearSelector';
import { StatCard } from '../components/common/StatCard';
import { apiConfig } from '../config/apiConfig';
import { useLazyGetAvailableYearsQuery } from '../store/apiSlice';
import { debugInfo } from '../utils/debug';
import type { PlayerData, TrendData } from '../types/player';
import log from '../utils/logger';
import { resolvePrefecture, sortPrefecturesByGeo } from '../utils/prefectures';

// ページごとの設定差分
export interface PlayerListPageConfig {
  // データ取得
  fetchPlayers: (
    year: number
  ) => Promise<{ data: PlayerData[]; metadata?: { message?: string; [key: string]: unknown } }>;
  // テキスト
  title: string;
  subtitle: string;
  emptyDataLabel: string;
  schoolLabel: string;
  logLabel: string;
  // 色設定
  titleIconColor: string;
  trendIconColor: string;
  statColors: {
    total: string;
    schools: string;
    topPrefecture: string;
  };
  // StatCard背景tint
  statTints?: {
    total?: string;
    schools?: string;
    topPrefecture?: string;
  };
  // トレンドデータのフィールド割り当て
  trendField: 'highschoolCount' | 'universityCount';
}

interface FilterState {
  search: string;
  prefecture: string;
}

/**
 * 「登録推移」「フィルター」を並べる行の固定高さ（px）。
 *
 * 読み込み中は推移グラフが空状態のプレースホルダになり、この行が実表示より高くなる。
 * データ到着時に行が縮んで下の選手テーブルが引き上げられ、Cumulative Layout Shift（CLS）が
 * 悪化していたため、読み込み前後で同じ高さを確保する。
 * 値は 1280x720 で実測したデータ表示後の行の高さ。
 */
const CHART_ROW_HEIGHT = 309;

export const PlayerListPage: React.FC<{ config: PlayerListPageConfig }> = ({ config }) => {
  const theme = useTheme();
  const [triggerGetYears] = useLazyGetAvailableYearsQuery();
  const [players, setPlayers] = React.useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // 年度管理状態
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear() - 1);
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);

  // 実際のデータから推移データを生成
  const trendData = React.useMemo((): TrendData[] => {
    if (!players || players.length === 0) return [];

    const dateMap = new Map<string, number>();

    players.forEach(player => {
      const filingDate = player.filingDate ? new Date(player.filingDate) : new Date();
      const dateKey = filingDate.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });

    const sortedDates = Array.from(dateMap.keys()).sort();
    if (sortedDates.length === 0) return [];

    return sortedDates.map(date => {
      const count = dateMap.get(date) || 0;
      return {
        date: new Date(date).toISOString(),
        highschoolCount: config.trendField === 'highschoolCount' ? count : 0,
        universityCount: config.trendField === 'universityCount' ? count : 0,
        totalCount: count,
      };
    });
  }, [players, config.trendField]);

  // 年度データの初期化
  React.useEffect(() => {
    const initializeYears = async () => {
      try {
        const data = await triggerGetYears().unwrap();
        setAvailableYears(data.years);
        setSelectedYear(data.defaultYear);
      } catch (err) {
        log.error(`${config.logLabel}年度データの取得に失敗:`, err);
        const lastYear = new Date().getFullYear() - 1;
        const years = [];
        for (let year = lastYear; year >= 2024; year--) {
          years.push(year);
        }
        setAvailableYears(years);
        setSelectedYear(lastYear);
      }
    };

    initializeYears();
  }, [triggerGetYears, config.logLabel]);

  // データ読み込み処理
  const loadPlayersData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (apiConfig.useProductionData) {
        log.info(`AWS APIから${config.logLabel}データを取得中...`, {
          useProductionData: apiConfig.useProductionData,
          baseURL: apiConfig.baseURL,
          year: selectedYear,
        });
        const response = await config.fetchPlayers(selectedYear);
        log.info('取得したデータ:', response);

        if (response.data.length === 0 && response.metadata?.message) {
          setError(response.metadata.message);
        } else {
          setError(null);
        }

        setPlayers(response.data);
      } else {
        log.info('AWS APIが無効なため、空のデータセットを使用');
        setPlayers([]);
      }
    } catch (err) {
      debugInfo.logError(
        `${config.logLabel}データ取得`,
        err as Error & {
          response?: { status?: number; data?: unknown; headers?: unknown };
          config?: { url?: string; method?: string; baseURL?: string; headers?: unknown };
        }
      );

      let errorMessage = 'データの取得に失敗しました。';
      if (err instanceof Error && err.message?.includes('データが見つかりません')) {
        errorMessage = err.message;
      } else if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { status?: number } }).response?.status === 404
      ) {
        errorMessage = 'APIエンドポイントが見つかりません。';
      } else if (err && typeof err === 'object' && 'code' in err && err.code === 'NETWORK_ERROR') {
        errorMessage = 'ネットワークエラー: APIサーバーに接続できません。';
      }

      setError(errorMessage);
      setPlayers([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, config]);

  // 選択年度変更時にデータを再取得
  React.useEffect(() => {
    if (selectedYear && availableYears.length > 0) {
      debugInfo.logEnvironment();
      debugInfo.logApiConfig(apiConfig);
      loadPlayersData();
    }
  }, [selectedYear, availableYears.length, loadPlayersData]);

  // 初回ロード時にデータを取得
  React.useEffect(() => {
    if (availableYears.length > 0) {
      loadPlayersData();
    }
  }, [availableYears, availableYears.length, loadPlayersData]);

  const [filters, setFilters] = React.useState<FilterState>({
    search: '',
    prefecture: '',
  });

  // フィルタリング処理
  const filteredPlayers = React.useMemo(() => {
    return players.filter(player => {
      const matchesSearch =
        filters.search === '' ||
        player.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        player.school.toLowerCase().includes(filters.search.toLowerCase());

      const matchesPrefecture =
        filters.prefecture === '' || resolvePrefecture(player) === filters.prefecture;

      return matchesSearch && matchesPrefecture;
    });
  }, [players, filters]);

  const availablePrefectures = React.useMemo(() => {
    const prefectures = new Set<string>();
    players.forEach(player => {
      const resolved = resolvePrefecture(player);
      if (resolved) prefectures.add(resolved);
    });
    return sortPrefecturesByGeo(Array.from(prefectures));
  }, [players]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePlayerClick = (player: PlayerData) => {
    log.debug('Player clicked:', player);
  };

  const handleRefresh = async () => {
    await loadPlayersData();
  };

  /*
    CSV一括エクスポートは公開ページから廃止した（#L7、2026-08-19）。
    掲載データ一式をワンクリックで持ち出せる導線は、利用規約4条が禁止する
    「複製・再配布」を実装側が用意している状態で、規約と実装が食い違っていた。
    運用で必要な書き出しは、認証必須の選手管理・学校管理ページに残している。
  */

  // 統計データ
  const stats = React.useMemo(() => {
    const prefectureCounts: Record<string, number> = {};

    filteredPlayers.forEach(player => {
      const resolved = resolvePrefecture(player);
      if (resolved) {
        prefectureCounts[resolved] = (prefectureCounts[resolved] || 0) + 1;
      }
    });

    return {
      total: filteredPlayers.length,
      schools: new Set(filteredPlayers.map(p => p.school)).size,
      prefectures: Object.keys(prefectureCounts).length,
      topPrefecture:
        Object.entries(prefectureCounts).length > 0
          ? `${Object.entries(prefectureCounts).sort(([, a], [, b]) => b - a)[0][0]} (${Object.entries(prefectureCounts).sort(([, a], [, b]) => b - a)[0][1]}名)`
          : 'データなし',
    };
  }, [filteredPlayers]);

  return (
    <Box className="fade-in">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 4,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          alignItems: { xs: 'flex-start', sm: 'center' }
        }}>
        <Box>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: "700",
              display: 'flex',
              alignItems: 'center'
            }}>
            <School sx={{ mr: 1.5, fontSize: '2.5rem', color: config.titleIconColor }} />
            {config.title}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {config.subtitle}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap"
          }}>
          <YearSelector
            selectedYear={selectedYear}
            availableYears={availableYears}
            onChange={setSelectedYear}
            disabled={isLoading}
            size="small"
          />

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={isLoading}
            sx={{ borderRadius: 2 }}
          >
            {isLoading ? '更新中...' : '更新'}
          </Button>
        </Box>
      </Box>

      {/*
        データソース表示（読み込み中のみのAlert）は、読み込み完了時に消えて
        下の要素をまとめて 74px 引き上げ、CLS を悪化させていたため廃止した。
        読み込み中であることは更新ボタンの「更新中...」表示と
        選手テーブルのスケルトン行で示している。
      */}
      {error && (
        <Alert
          severity={error.includes('データが存在しません') ? 'info' : 'error'}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            title="総選手数"
            value={stats.total}
            icon={<Person />}
            color={config.statColors.total}
            bgTint={config.statTints?.total}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            title={config.schoolLabel}
            value={stats.schools}
            icon={<School />}
            color={config.statColors.schools}
            bgTint={config.statTints?.schools}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            title="最多都道府県"
            value={stats.topPrefecture}
            icon={<Place />}
            color={config.statColors.topPrefecture}
            bgTint={config.statTints?.topPrefecture}
          />
        </Grid>
      </Grid>

      {/* データが存在しない場合のメッセージ */}
      {!isLoading && players.length === 0 && !error && (
        <Box
          sx={{
            mb: 4,
            p: 4,
            backgroundColor: 'background.paper',
            borderRadius: 3,
            textAlign: 'center',
            border: `1px dashed ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" gutterBottom sx={{
            color: "text.secondary"
          }}>
            データが見つかりません
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {selectedYear}年度の{config.emptyDataLabel}
            データがまだ登録されていないか、取得できていません。
          </Typography>
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 増分グラフ */}
        <Grid size={{ xs: 12, lg: 8 }} sx={{ height: CHART_ROW_HEIGHT }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              height: '100%',
              overflow: 'hidden',
              boxShadow: theme.shadows[2],
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2
              }}>
              <TrendingUp sx={{ mr: 1, color: config.trendIconColor }} />
              <Typography variant="h6" sx={{
                fontWeight: "600"
              }}>
                登録推移
              </Typography>
            </Box>
            <TrendChart title="" trendData={trendData} height={300} showTotalOnly={true} />
          </Paper>
        </Grid>

        {/* フィルター */}
        <Grid size={{ xs: 12, lg: 4 }} sx={{ height: CHART_ROW_HEIGHT }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              height: '100%',
              overflow: 'hidden',
              boxShadow: theme.shadows[2],
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 3
              }}>
              <FilterList sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="h6" sx={{
                fontWeight: "600"
              }}>
                フィルター
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3
              }}>
              <TextField
                fullWidth
                variant="outlined"
                label="検索"
                placeholder="選手名・学校名"
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                  }
                }}
              />

              <FormControl fullWidth>
                <InputLabel>都道府県</InputLabel>
                <Select
                  value={filters.prefecture}
                  label="都道府県"
                  onChange={e => handleFilterChange('prefecture', e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">
                    <Typography sx={{
                      color: "text.secondary"
                    }}>すべて</Typography>
                  </MenuItem>
                  {availablePrefectures.map(prefecture => (
                    <MenuItem key={prefecture} value={prefecture}>
                      {prefecture}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => setFilters({ search: '', prefecture: '' })}
                sx={{ mt: 1, borderRadius: 2 }}
              >
                条件をクリア
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 選手テーブル */}
      <Paper
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: theme.shadows[2],
        }}
      >
        <PlayerTable
          players={filteredPlayers}
          loading={isLoading}
          onPlayerClick={handlePlayerClick}
          onRefetch={handleRefresh}
          title="選手リスト"
        />
      </Paper>
    </Box>
  );
};
