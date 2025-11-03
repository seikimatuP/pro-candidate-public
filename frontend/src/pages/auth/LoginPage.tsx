import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Lock as LockIcon,
  Person as PersonIcon,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { isLocalhost, shouldShowDemoInfo } from '../../utils/environment';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // パスワード変更フロー用の状態
  const [requiresNewPassword, setRequiresNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { signIn, user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useTheme();

  const from = location.state?.from?.pathname || '/';

  // ローカル環境では自動的にダッシュボードにリダイレクト
  // または、既にログイン済みの場合もリダイレクト
  useEffect(() => {
    // ローカル環境チェック
    if (isLocalhost()) {
      console.log('🏠 ローカル環境: ログイン画面をスキップしてダッシュボードに遷移');
      navigate('/', { replace: true });
      return;
    }
    
    // 認証状態のローディング中は何もしない
    if (authLoading) {
      return;
    }
    
    // 既にログイン済みの場合はリダイレクト
    if (isAuthenticated && user) {
      console.log('✅ 既にログイン済み: トップページに遷移', user.username);
      navigate(from, { replace: true });
    }
  }, [navigate, authLoading, isAuthenticated, user, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // AWS Amplify v6のsignInを直接使用
      const { signIn: amplifySignIn } = await import('aws-amplify/auth');

      console.log('🔐 ログイン試行:', {
        username,
        passwordLength: password.length,
        timestamp: new Date().toISOString()
      });

      const result = await amplifySignIn({ username, password });

      console.log('✅ Sign in result:', result);

      // パスワード変更が必要な場合のチェック
      if (result && result.nextStep) {
        if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          console.log('Password change required for user:', username);
          setRequiresNewPassword(true);
          setLoading(false);
          return;
        }
      }

      // signInContextを使用してユーザー情報を更新
      await signIn(username, password);

      // 正常にログインできればリダイレクト
      navigate(from, { replace: true });
    } catch (err) {
      console.error('❌ Login error:', {
        error: err,
        username,
        timestamp: new Date().toISOString(),
        errorName: err && typeof err === 'object' && 'name' in err ? (err as Record<string, unknown>).name : 'Unknown',
        errorMessage: err && typeof err === 'object' && 'message' in err ? (err as Record<string, unknown>).message : 'Unknown error'
      });

      // パスワード変更が必要な場合のチェック（エラーオブジェクト内）
      if (err && typeof err === 'object' && 'nextStep' in err) {
        const nextStep = (err as { nextStep?: { signInStep?: string } }).nextStep;
        if (nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          console.log('Password change required (from error):', username);
          setRequiresNewPassword(true);
          setLoading(false);
          return;
        }
      }

      // エラーメッセージの日本語化
      let errorMessage = 'ログインに失敗しました。';

      if (err && typeof err === 'object' && 'name' in err && err.name === 'NotAuthorizedException') {
        errorMessage = 'ユーザー名またはパスワードが正しくありません。';
      } else if (err && typeof err === 'object' && 'name' in err && err.name === 'UserNotConfirmedException') {
        errorMessage = 'アカウントの確認が完了していません。メールを確認してください。';
      } else if (err && typeof err === 'object' && 'name' in err && err.name === 'UserNotFoundException') {
        errorMessage = 'ユーザーが見つかりません。';
      } else if (err && typeof err === 'object' && 'name' in err && err.name === 'TooManyRequestsException') {
        errorMessage = 'リクエストが多すぎます。しばらく時間を置いてから再試行してください。';
      } else if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // パスワード変更処理
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません。');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('パスワードは8文字以上にしてください。');
      setLoading(false);
      return;
    }

    try {
      // AWS Amplify v6のconfirmSignInを使用
      const { confirmSignIn } = await import('aws-amplify/auth');
      await confirmSignIn({ challengeResponse: newPassword });

      // 成功したらダッシュボードにリダイレクト
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Password change error:', err);
      setError('パスワードの変更に失敗しました。パスワードの要件を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  // 認証状態確認中はローディング表示
  if (authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'background.default',
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          認証状態を確認中...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'background.default',
        position: 'relative',
      }}
    >
      {/* ダークモード切り替えボタン（右上に配置） */}
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <Tooltip title={mode === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
          <IconButton onClick={toggleTheme}>
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>
      </Box>
      
      <Card sx={{ width: '100%', maxWidth: 400, m: 2 }}>
          <CardContent sx={{ p: 4 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  backgroundColor: 'primary.main',
                  borderRadius: '50%',
                  width: 56,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <LockIcon sx={{ color: 'white' }} />
              </Box>
              <Typography component="h1" variant="h4" fontWeight="bold">
                ログイン
              </Typography>
              <Typography variant="body2" color="textSecondary" textAlign="center">
                プロ野球志望届データ収集システム
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* パスワード変更フォーム */}
            {requiresNewPassword ? (
              <Box component="form" onSubmit={handlePasswordChange}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  新しいパスワードを設定してください
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  初回ログインのため、パスワードの変更が必要です。
                </Typography>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="newPassword"
                  label="新しいパスワード"
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  helperText="8文字以上で、大文字・小文字・数字・特殊文字を含む"
                  InputProps={{
                    startAdornment: <LockIcon sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="パスワード確認"
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: <LockIcon sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                  disabled={loading || !newPassword || !confirmPassword}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'パスワードを変更'
                  )}
                </Button>
              </Box>
            ) : (
              /* 通常のログインフォーム */
              <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="ユーザー名 / メールアドレス"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} />,
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="パスワード"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: <LockIcon sx={{ color: 'action.active', mr: 1 }} />,
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={loading || !username || !password}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'ログイン'
                )}
              </Button>

              <Divider sx={{ my: 2 }} />

              <Box textAlign="center">
                <Link 
                  to="/auth/forgot-password" 
                  style={{ textDecoration: 'none' }}
                >
                  <Typography variant="body2" color="primary">
                    パスワードを忘れた場合
                  </Typography>
                </Link>
              </Box>
              
              <Box textAlign="center" sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  アカウントをお持ちでない場合は{' '}
                  <Link 
                    to="/auth/signup" 
                    style={{ textDecoration: 'none' }}
                  >
                    <Typography component="span" variant="body2" color="primary">
                      新規登録
                    </Typography>
                  </Link>
                </Typography>
              </Box>
            </Box>
            )}
          </CardContent>
        </Card>

      {/* 開発用ヒント（環境変数で制御） */}
      {shouldShowDemoInfo() && (
        <Alert severity="info" sx={{ width: '100%', maxWidth: 400, m: 2 }}>
          <Typography variant="body2">
            <strong>開発用デフォルトアカウント:</strong><br />
            ユーザー名: admin<br />
            パスワード: {import.meta.env.VITE_DEMO_PASSWORD || '設定されていません'}<br />
            (初回ログイン時にパスワード変更が必要です)
          </Typography>
        </Alert>
      )}
    </Box>
  );
};