import React from 'react';
import {
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
  Button,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
// Grid は Box ベースで実装する
import {
  People,
  School,
  Refresh,
  ArrowForward,
  CloudDownload,
  ArrowDropDown,
  Lock,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { TrendChart } from '../components/charts/TrendChart';
import YearSelector from '../components/selectors/YearSelector';
// import PWANotificationManager from '../components/pwa/PWANotificationManager';
import { apiService, apiConfig } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { TrendData, PlayerData } from '../types/player';


export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.groups?.includes('admin') || false;

  const [playersData, setPlayersData] = React.useState<{
    data: PlayerData[];
    metadata: {
      lastUpdated: string;
      totalCount: number;
      highschoolCount: number;
      universityCount: number;
    };
  } | null>(null);

  // スクレイピング履歴からの最新実行日時
  const [lastScrapingDate, setLastScrapingDate] = React.useState<string | null>(null);
  
  const [playersLoading, setPlayersLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [playersError, setPlayersError] = React.useState<string | null>(null);
  const [scrapingAnchorEl, setScrapingAnchorEl] = React.useState<null | HTMLElement>(null);
  const [isScrapingRunning, setIsScrapingRunning] = React.useState(false);
  
  // 年度管理状態
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);
  // const [yearData, setYearData] = React.useState<YearData | null>(null);

  // データ読み込み処理を関数として定義
  const loadAllPlayersData = React.useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setPlayersLoading(true);
      }
      setPlayersError(null);

      if (apiConfig.useProductionData) {
        // AWS APIからデータ取得
        console.log('AWS APIから全選手データを取得中...', {
          useProductionData: apiConfig.useProductionData,
          baseURL: apiConfig.baseURL,
          environment: apiConfig.baseURL.includes('/prod') ? 'prod' : 'dev',
          forceRefresh
        });
        
        // 常に最新データを取得（インターセプターでキャッシュバスティング）
        console.log('データ取得開始 - タイムスタンプ:', new Date().toISOString());
        const [highschoolResponse, universityResponse] = await Promise.all([
          apiService.getHighschoolPlayers(selectedYear),
          apiService.getUniversityPlayers(selectedYear)
        ]);
        
        const highschoolPlayers = highschoolResponse.data;
        const universityPlayers = universityResponse.data;
          
          console.log('取得したデータ:', {
            highschoolCount: highschoolPlayers.length,
            universityCount: universityPlayers.length,
            highschoolSample: highschoolPlayers.slice(0, 2),
            universitySample: universityPlayers.slice(0, 2)
          });
          
          const allPlayers = [...highschoolPlayers, ...universityPlayers];
          setPlayersData({
            data: allPlayers,
            metadata: {
              lastUpdated: new Date().toISOString(),
              totalCount: allPlayers.length,
              highschoolCount: highschoolPlayers.length,
              universityCount: universityPlayers.length,
            }
          });
        } else {
          // AWS APIが無効な場合は空データ
          console.log('AWS APIが無効なため、空のデータセットを使用');
          setPlayersData({
            data: [],
            metadata: {
              lastUpdated: new Date().toISOString(),
              totalCount: 0,
              highschoolCount: 0,
              universityCount: 0,
            }
          });
        }
      } catch (err) {
        const error = err as Error;
        console.error('ダッシュボードデータの取得に失敗:', {
          error: error,
          message: error.message,
          stack: error.stack,
          response: error && typeof error === 'object' && 'response' in error ? (error as { response?: { data?: unknown } }).response?.data : undefined
        });
        setPlayersError(`データの取得に失敗しました: ${error.message}`);
        // エラー時は空データを設定
        setPlayersData({
          data: [],
          metadata: {
            lastUpdated: new Date().toISOString(),
            totalCount: 0,
            highschoolCount: 0,
            universityCount: 0,
          }
        });
      } finally {
        setPlayersLoading(false);
        setIsRefreshing(false);
      }
    }, [selectedYear]);

  // 年度データの初期化とスクレイピング履歴取得
  React.useEffect(() => {
    const initializeYears = async () => {
      try {
        const data = await apiService.getAvailableYears();
        // setYearData(data);
        setAvailableYears(data.years);
        setSelectedYear(data.defaultYear);

        // データが存在する年度をログ出力
        if (data.existingYears) {
          console.log('データが存在する年度:', data.existingYears);
        }
      } catch (error) {
        console.error('年度データの取得に失敗:', error);
        // フォールバック: 2024年から現在年まで
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear; year >= 2024; year--) {
          years.push(year);
        }
        setAvailableYears(years);
        setSelectedYear(currentYear);
      }
    };

    const fetchScrapingHistory = async () => {
      try {
        // 環境を判定（dev/prod）
        const environment = apiConfig.baseURL.includes('/prod') ? 'prod' : 'dev';
        const historyResponse = await apiService.getScrapingHistory(environment, 1, 0);

        if (historyResponse.data && historyResponse.data.length > 0) {
          const latestHistory = historyResponse.data[0];
          // timestampフィールドを使用（executedAtではなく）
          setLastScrapingDate(latestHistory.timestamp || latestHistory.executedAt);
        }
      } catch (error) {
        console.log('スクレイピング履歴の取得をスキップ:', error);
        // 履歴取得失敗はエラーにしない
      }
    };

    initializeYears();
    fetchScrapingHistory();
  }, []);

  // 選択年度変更時にデータを再取得
  React.useEffect(() => {
    if (selectedYear && availableYears.length > 0) {
      // 常に最新データを取得
      loadAllPlayersData();
    }
  }, [selectedYear, availableYears, loadAllPlayersData]);
  
  // スクレイピング実行処理
  const handleScraping = async (type: 'highschool' | 'university' | 'both') => {
    setScrapingAnchorEl(null);
    setIsScrapingRunning(true);
    
    try {
      const result = await apiService.triggerScraping(type, selectedYear);
      
      // 既に本日実行済みのチェック
      if (result.skipped && result.error === 'ALREADY_EXECUTED_TODAY') {
        setIsScrapingRunning(false);
        alert(`本日のスクレイピングは既に実行済みです。\n\n最終実行日: ${result.lastExecutionDate || '不明'}\n\n※本番環境では1日1回の制限があります。`);
        return;
      }
      
      if (result.success && result.completed) {
        // スクレイピングが完了している場合
        setPlayersError(null);
        setIsScrapingRunning(false);
        
        // データを即座に再取得
        await loadAllPlayersData(true);

        // スクレイピング履歴を再取得
        try {
          const environment = apiConfig.baseURL.includes('/prod') ? 'prod' : 'dev';
          const historyResponse = await apiService.getScrapingHistory(environment, 1, 0);
          if (historyResponse.data && historyResponse.data.length > 0) {
            // timestampフィールドを使用（executedAtではなく）
            setLastScrapingDate(historyResponse.data[0].timestamp || historyResponse.data[0].executedAt);
          }
        } catch (error) {
          console.log('履歴再取得エラー:', error);
        }

        // 結果を集計
        const highschoolResult = result.results?.find((r: { type: string }) => r.type === 'highschool');
        const universityResult = result.results?.find((r: { type: string }) => r.type === 'university');
        
        let message = 'スクレイピングが完了しました！\n\n';
        let hasError = false;
        
        if (highschoolResult) {
          if (highschoolResult.success) {
            message += `高校生: ${highschoolResult.count || 0}件取得\n`;
          } else {
            message += `高校生: データ取得エラー（サイトにアクセスできません）\n`;
            hasError = true;
          }
        }
        
        if (universityResult) {
          if (universityResult.success) {
            const count = universityResult.count || 0;
            if (count === 0) {
              message += `大学生: 0件（まだデータが公開されていない可能性があります）\n`;
            } else {
              message += `大学生: ${count}件取得\n`;
            }
          } else {
            message += `大学生: データ取得エラー\n`;
            hasError = true;
          }
        }
        
        if (hasError) {
          message += '\n※2024年度のデータを取得しています';
        }
        
        alert(message);
        return;
      } else if (result.success) {
        setPlayersError(null);
        // 非同期実行の場合（フォールバック）
        alert(`スクレイピングを開始しました（${type === 'both' ? '高校生・大学生' : type === 'highschool' ? '高校生' : '大学生'}）。\n処理には数分かかります。`);
        
        // 定期的にデータを確認（3秒間隔で最大1分間）
        let checkCount = 0;
        const maxChecks = 20; // 1分間 = 20回 × 3秒
        const checkInterval = 3000; // 3秒
        
        // 初期データを保存
        const initialHighschoolCount = playersData?.metadata?.highschoolCount || 0;
        const initialUniversityCount = playersData?.metadata?.universityCount || 0;
        
        const checkCompletion = setInterval(async () => {
          checkCount++;
          
          try {
            // データを再取得（サイレント）
            const [highschoolResponse, universityResponse] = await Promise.all([
              apiService.getHighschoolPlayers(selectedYear),
              apiService.getUniversityPlayers(selectedYear)
            ]);
            
            const highschoolPlayers = highschoolResponse.data;
            const universityPlayers = universityResponse.data;
            const newHighschoolCount = highschoolPlayers.length;
            const newUniversityCount = universityPlayers.length;
            
            // データが更新されたかチェック
            const highschoolUpdated = type !== 'university' && newHighschoolCount !== initialHighschoolCount;
            const universityUpdated = type !== 'highschool' && newUniversityCount !== initialUniversityCount;
            
            if (
              (type === 'both' && highschoolUpdated && universityUpdated) ||
              (type === 'highschool' && highschoolUpdated) ||
              (type === 'university' && universityUpdated)
            ) {
              // スクレイピング完了
              clearInterval(checkCompletion);
              setIsScrapingRunning(false);
              
              // データを更新
              const allPlayers = [...highschoolPlayers, ...universityPlayers];
              setPlayersData({
                data: allPlayers,
                metadata: {
                  lastUpdated: new Date().toISOString(),
                  totalCount: allPlayers.length,
                  highschoolCount: newHighschoolCount,
                  universityCount: newUniversityCount,
                }
              });
              
              // 完了通知
              const message = type === 'both' 
                ? `スクレイピングが完了しました！\n\n高校生: ${initialHighschoolCount} → ${newHighschoolCount} 件\n大学生: ${initialUniversityCount} → ${newUniversityCount} 件`
                : type === 'highschool'
                ? `高校生データのスクレイピングが完了しました！\n\n${initialHighschoolCount} → ${newHighschoolCount} 件`
                : `大学生データのスクレイピングが完了しました！\n\n${initialUniversityCount} → ${newUniversityCount} 件`;
              
              alert(message);
            } else if (checkCount >= maxChecks) {
              // タイムアウト
              clearInterval(checkCompletion);
              setIsScrapingRunning(false);
              alert('スクレイピング処理がタイムアウトしました。\nデータ再取得ボタンで最新データを確認してください。');
            }
          } catch (error) {
            console.error('スクレイピング状態確認エラー:', error);
            // エラーが発生してもチェックは継続
          }
        }, checkInterval);
        
      } else {
        setPlayersError(`スクレイピングの開始に失敗しました: ${result.message}`);
      }
    } catch (error) {
      console.error('スクレイピングエラー:', error);
      
      // エラーメッセージの詳細化
      let errorMessage = 'スクレイピングエラー: ';
      if (error && typeof error === 'object' && 'response' in error && 
          (error as { response?: { status?: number } }).response?.status === 502) {
        errorMessage += 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。';
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_NETWORK') {
        errorMessage += 'ネットワークエラーが発生しました。API設定を確認中です。';
      } else {
        errorMessage += error instanceof Error ? error.message : '不明なエラー';
      }
      
      setPlayersError(errorMessage);
      setIsScrapingRunning(false);
      
      // 開発環境での詳細なエラー情報表示
      if (apiConfig.isLocalhost) {
        alert(`開発環境エラー:\n\n${errorMessage}\n\n注意: スクレイピング機能はデプロイ後に利用可能になります。`);
      }
    }
  };
  
  // 環境に応じたバケット名を取得
  const bucketName = import.meta.env.VITE_S3_BUCKET_NAME ||
    (apiConfig.baseURL.includes('prod') ? 'pro-candidate-data-prod' : 'pro-candidate-data-dev');

  const healthData = { status: 'healthy', timestamp: new Date().toISOString(), bucket: bucketName };
  const healthLoading = false;
  const healthError = null;

  // 実際のデータから推移データを生成
  const trendData = React.useMemo(() => {
    // playersDataが存在しない場合は空配列を返す
    if (!playersData?.data) {
      return [];
    }

    // データが0件の場合でも、現在の日付で0件のデータポイントを作成
    if (playersData.data.length === 0) {
      const today = new Date().toISOString();
      return [{
        date: today,
        highschoolCount: 0,
        universityCount: 0,
        totalCount: 0,
      }];
    }

    // 実際の選手データから日付別の登録推移を生成
    const players = playersData.data;
    const dateMap = new Map<string, { highschool: number; university: number }>();

    // 選手の登録日付別にカウント
    players.forEach(player => {
      const filingDate = player.filingDate ? new Date(player.filingDate) : new Date();
      const dateKey = filingDate.toISOString().split('T')[0]; // YYYY-MM-DD形式
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { highschool: 0, university: 0 });
      }
      
      const counts = dateMap.get(dateKey)!;
      if (player.type === 'highschool' || player.id.includes('highschool')) {
        counts.highschool += 1;
      } else if (player.type === 'university' || player.id.includes('university')) {
        counts.university += 1;
      }
    });

    // 日付順にソートして推移データを作成
    const sortedDates = Array.from(dateMap.keys()).sort();
    
    if (sortedDates.length === 0) {
      // 念のため、今日の日付で0件のデータを返す
      const today = new Date().toISOString();
      return [{
        date: today,
        highschoolCount: 0,
        universityCount: 0,
        totalCount: 0,
      }];
    }

    const trendData: TrendData[] = sortedDates.map(date => {
      const counts = dateMap.get(date)!;
      
      return {
        date: new Date(date).toISOString(),
        highschoolCount: counts.highschool,
        universityCount: counts.university,
        totalCount: counts.highschool + counts.university,
      };
    });

    console.log('生成された推移データ:', {
      totalDates: trendData.length,
      dateRange: trendData.length > 0 ? 
        `${trendData[0].date.split('T')[0]} - ${trendData[trendData.length - 1].date.split('T')[0]}` : 
        'なし',
      totalPlayers: players.length,
      uniqueDates: sortedDates.length
    });

    return trendData;
  }, [playersData]);

  // 通算（累積）データを生成
  const cumulativeTrendData = React.useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return [];
    }

    // 累積カウントを計算
    let cumulativeHighschool = 0;
    let cumulativeUniversity = 0;

    return trendData.map(data => {
      cumulativeHighschool += data.highschoolCount;
      cumulativeUniversity += data.universityCount;
      
      return {
        date: data.date,
        highschoolCount: cumulativeHighschool,
        universityCount: cumulativeUniversity,
        totalCount: cumulativeHighschool + cumulativeUniversity,
      };
    });
  }, [trendData]);

  // 統計データの計算
  const stats = React.useMemo(() => {
    if (!playersData?.data) return null;
    
    const players = playersData.data;
    const highschoolCount = players.filter(p => p.type === 'highschool' || p.id.includes('highschool')).length;
    const universityCount = players.filter(p => p.type === 'university' || p.id.includes('university')).length;
    
    return {
      total: players.length,
      highschool: highschoolCount,
      university: universityCount,
      lastUpdated: playersData.metadata?.lastUpdated,
    };
  }, [playersData]);

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: '50%',
              width: 60,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h4" component="h1">
            ダッシュボード
          </Typography>
          
          {/* 年度選択 */}
          <YearSelector
            selectedYear={selectedYear}
            availableYears={availableYears}
            onChange={setSelectedYear}
            disabled={isScrapingRunning || playersLoading}
            size="small"
          />
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          {/* データ再取得ボタン */}
          <Button
            startIcon={<Refresh />}
            onClick={() => loadAllPlayersData(true)}
            disabled={isRefreshing}
            variant="outlined"
            size="small"
          >
            {isRefreshing ? '再取得中...' : 'データ再取得'}
          </Button>
          
          {/* スクレイピング実行ボタン（管理者のみ） */}
          {isAdmin ? (
            <Button
              startIcon={<CloudDownload />}
              endIcon={<ArrowDropDown />}
              onClick={(event) => setScrapingAnchorEl(event.currentTarget)}
              disabled={isScrapingRunning || !apiConfig.useProductionData}
              variant="contained"
              size="small"
              color="primary"
              title={!apiConfig.useProductionData ? 'モックモードでは利用できません' : ''}
            >
              {isScrapingRunning ? 'スクレイピング中...' : 'スクレイピング実行'}
            </Button>
          ) : (
            <Tooltip title="管理者権限が必要です">
              <span>
                <Button
                  startIcon={<Lock />}
                  disabled
                  variant="outlined"
                  size="small"
                >
                  スクレイピング実行
                </Button>
              </span>
            </Tooltip>
          )}
          
          {/* スクレイピングメニュー */}
          <Menu
            anchorEl={scrapingAnchorEl}
            open={Boolean(scrapingAnchorEl)}
            onClose={() => setScrapingAnchorEl(null)}
          >
            <MenuItem onClick={() => handleScraping('both')}>
              <Box>
                <Typography variant="body1">高校生・大学生両方</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedYear}年度データを取得
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => handleScraping('highschool')}>
              <Box>
                <Typography variant="body1">高校生のみ</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedYear}年度データを取得
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => handleScraping('university')}>
              <Box>
                <Typography variant="body1">大学生のみ</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedYear}年度データを取得
                </Typography>
              </Box>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* PWA機能コントロールパネル */}
      {/* <PWANotificationManager /> */}

      {/* データソース表示 - データ読み込み中のみ表示 */}
      {(playersLoading || healthLoading) && (
        <Box mb={2}>
          <Alert 
            severity={apiConfig.useProductionData ? "info" : "warning"} 
            variant="outlined"
          >
            {apiConfig.useProductionData 
              ? `AWS API (${apiConfig.baseURL.includes('/prod') ? '本番環境' : '開発環境'}) からデータを取得しています...` 
              : 'AWS APIが無効化されています (.envのVITE_USE_PRODUCTION_DATAで切り替え)'}
          </Alert>
        </Box>
      )}

      {/* システム状態 */}
      {healthError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          システムへの接続に問題があります
        </Alert>
      )}

      {playersError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {playersError}
        </Alert>
      )}

      {/* データが存在しない場合のメッセージ */}
      {!playersLoading && !healthLoading && playersData?.data.length === 0 && !playersError && (
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body1" color="text.primary">
            {selectedYear}年度の選手データがまだ登録されていません
          </Typography>
        </Box>
      )}

      {/* 統計カード */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <StatCard
            title="総選手数"
            value={playersLoading ? '...' : (stats?.total || 0)}
            icon={<People />}
            color="#1976d2"
          />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <StatCard
            title="高校生"
            value={playersLoading ? '...' : (stats?.highschool || 0)}
            icon={<School />}
            color="#2e7d32"
          />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <StatCard
            title="大学生"
            value={playersLoading ? '...' : (stats?.university || 0)}
            icon={<School />}
            color="#ed6c02"
          />
        </Box>
        {isAdmin && (
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
            <StatCard
              title="スクレイピング実行日時"
              value={lastScrapingDate ? new Date(lastScrapingDate).toLocaleDateString('ja-JP') : '未実行'}
              icon={<Refresh />}
              color="#9c27b0"
            />
          </Box>
        )}
      </Box>

      {/* 選手登録推移グラフ（デイリー） */}
      <Box mb={3}>
        <TrendChart
          title="選手登録推移（日別）"
          trendData={trendData}
          height={350}
        />
      </Box>

      {/* 選手登録推移グラフ（通算） */}
      <Box mb={3}>
        <TrendChart
          title="選手登録推移（通算）"
          trendData={cumulativeTrendData}
          height={350}
        />
      </Box>

      {/* クイックアクセスカード */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" color="success.main">
                  <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                  高校生選手
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/highschool-players')}
                >
                  詳細表示
                </Button>
              </Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                現在登録されている高校生選手は {stats?.highschool || 0} 名です。
              </Typography>
              <Typography variant="body2" color="textSecondary">
                詳細な一覧、検索、統計情報が確認できます。
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" color="warning.main">
                  <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                  大学生選手
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/university-players')}
                >
                  詳細表示
                </Button>
              </Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                現在登録されている大学生選手は {stats?.university || 0} 名です。
              </Typography>
              <Typography variant="body2" color="textSecondary">
                詳細な一覧、検索、統計情報が確認できます。
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* データ概要とシステム情報 */}
      <Box display="flex" flexWrap="wrap" gap={3}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '2 1 65%' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              データ収集状況
            </Typography>
            {playersLoading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : playersData?.data ? (
              <Box>
                <Typography variant="body1" paragraph>
                  現在システムには {stats?.total} 名の選手データが登録されています。
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  高校生: {stats?.highschool} 名 | 大学生: {stats?.university} 名
                </Typography>
              </Box>
            ) : (
              <Typography variant="body1">
                データが見つかりません
              </Typography>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              システム情報
            </Typography>
            {healthLoading ? (
              <CircularProgress size={24} />
            ) : healthData ? (
              <Box>
                <Typography variant="body2" paragraph>
                  状態: {healthData.status}
                </Typography>
                <Typography variant="body2" paragraph>
                  最終確認: {new Date(healthData.timestamp).toLocaleString()}
                </Typography>
                {healthData.bucket && (
                  <Typography variant="body2" color="textSecondary">
                    データバケット: {healthData.bucket}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="error">
                システム状態を取得できません
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};