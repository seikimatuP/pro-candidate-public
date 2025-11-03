import React from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { apiService, apiConfig } from '../services/api';

export const TestPage: React.FC = () => {
  const [result, setResult] = React.useState<{
    config: unknown;
    health: unknown;
    highschoolCount: number;
    universityCount: number;
    highschoolSample: unknown[];
    universitySample: unknown[];
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('APIテスト開始');
      console.log('設定:', apiConfig);
      
      const healthData = await apiService.getHealth();
      console.log('ヘルスチェック結果:', healthData);
      
      const highschoolPlayers = await apiService.getHighschoolPlayers();
      console.log('高校生データ:', highschoolPlayers.data.length, '件');
      
      const universityPlayers = await apiService.getUniversityPlayers();
      console.log('大学生データ:', universityPlayers.data.length, '件');
      
      setResult({
        config: apiConfig,
        health: healthData,
        highschoolCount: highschoolPlayers.data.length,
        universityCount: universityPlayers.data.length,
        highschoolSample: highschoolPlayers.data.slice(0, 2),
        universitySample: universityPlayers.data.slice(0, 2)
      });
    } catch (err) {
      console.error('API テストエラー:', err);
      const errorMessage = err instanceof Error ? err.message : 'APIテストに失敗しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        API テストページ
      </Typography>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>環境設定</Typography>
        <Typography variant="body2">
          VITE_USE_PRODUCTION_DATA: {import.meta.env.VITE_USE_PRODUCTION_DATA}
        </Typography>
        <Typography variant="body2">
          VITE_API_BASE_URL: {import.meta.env.VITE_API_BASE_URL}
        </Typography>
        <Typography variant="body2">
          MODE: {import.meta.env.MODE}
        </Typography>
      </Paper>

      <Button 
        variant="contained" 
        onClick={testAPI} 
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? 'テスト中...' : 'API テスト実行'}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>結果</Typography>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Paper>
      )}
    </Box>
  );
};