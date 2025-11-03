import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
  /** エラー発生時に表示するカスタムメッセージ */
  fallbackMessage?: string;
  /** リトライ可能かどうか */
  allowRetry?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * LazyLoadErrorBoundary - React.lazyの遅延ロードエラーをキャッチするエラー境界コンポーネント
 *
 * ネットワークエラーやチャンク読み込み失敗時に、ユーザーフレンドリーなエラーUIを表示
 *
 * @example
 * <LazyLoadErrorBoundary>
 *   <Suspense fallback={<LoadingSpinner />}>
 *     <LazyComponent />
 *   </Suspense>
 * </LazyLoadErrorBoundary>
 */
export class LazyLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // エラー発生時に状態を更新
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // エラー情報をログに記録
    console.error('LazyLoad Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // エラー監視サービスに送信（実装時に追加）
    // errorMonitoringService.logError(error, errorInfo);
  }

  handleRetry = (): void => {
    // エラー状態をリセットして再レンダリング
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // ページリロードで完全に回復
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackMessage, allowRetry = true } = this.props;
      const { error } = this.state;

      // エラータイプに応じたメッセージ
      const isChunkLoadError = error?.message.includes('ChunkLoadError') ||
                               error?.message.includes('Failed to fetch dynamically imported module') ||
                               error?.message.includes('Loading chunk');

      const errorMessage = fallbackMessage ||
        (isChunkLoadError
          ? 'ページの読み込みに失敗しました。ネットワーク接続を確認してください。'
          : 'コンポーネントの読み込み中にエラーが発生しました。');

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            padding: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              maxWidth: 600,
              textAlign: 'center',
            }}
          >
            <ErrorOutlineIcon
              sx={{
                fontSize: 64,
                color: 'error.main',
                marginBottom: 2,
              }}
            />

            <Typography variant="h5" gutterBottom color="error">
              読み込みエラー
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ marginBottom: 3 }}>
              {errorMessage}
            </Typography>

            {import.meta.env.DEV && error && (
              <Box
                sx={{
                  marginBottom: 3,
                  padding: 2,
                  backgroundColor: 'grey.100',
                  borderRadius: 1,
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}
              >
                <Typography variant="caption" component="pre" sx={{ margin: 0 }}>
                  {error.toString()}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}

            {allowRetry && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
              >
                ページを再読み込み
              </Button>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default LazyLoadErrorBoundary;
