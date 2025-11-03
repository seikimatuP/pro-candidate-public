import React, { useEffect, useState } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Sync as SyncIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  InstallMobile as InstallMobileIcon
} from '@mui/icons-material';
import { pwaManager, getPWAInstallStatus } from '../../utils/pwa';

interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  action?: React.ReactNode;
}

export const PWANotificationManager: React.FC = () => {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pwaInstallStatus, setPwaInstallStatus] = useState(() => {
    try {
      return getPWAInstallStatus();
    } catch (error) {
      console.warn('PWA status check failed:', error);
      return { canInstall: false, isInstalled: false, platform: 'unknown' };
    }
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    // 通知権限の状態を取得
    setNotificationPermission(Notification.permission);

    // ネットワーク状態の監視
    const handleOnline = () => {
      setIsOnline(true);
      showNotification('オンラインに復帰しました', 'success');
      // オンライン復帰時にバックグラウンド同期を実行
      handleBackgroundSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showNotification('オフラインモードに切り替わりました', 'warning');
    };

    // PWAインストール可能状態の監視
    const handlePWAInstallAvailable = () => {
      setPwaInstallStatus(getPWAInstallStatus());
      showNotification(
        'このアプリをホーム画面に追加できます',
        'info',
        <Button color="inherit" onClick={handleInstallPWA}>
          インストール
        </Button>
      );
    };

    // Service Workerからのメッセージ監視
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'BACKGROUND_SYNC_SUCCESS':
          setSyncStatus('success');
          showNotification(`${data === 'players' ? '選手' : '学校'}データの同期が完了しました`, 'success');
          setTimeout(() => setSyncStatus('idle'), 3000);
          break;
        default:
          console.log('Unknown Service Worker message:', type);
      }
    };

    // イベントリスナーを追加
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pwaInstallAvailable', handlePWAInstallAvailable);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    // クリーンアップ
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pwaInstallAvailable', handlePWAInstallAvailable);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const showNotification = (message: string, severity: NotificationState['severity'], action?: React.ReactNode) => {
    setNotification({
      open: true,
      message,
      severity,
      action
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handleRequestNotificationPermission = async () => {
    const permission = await pwaManager.requestNotificationPermission();
    setNotificationPermission(permission);
    
    if (permission === 'granted') {
      showNotification('プッシュ通知が有効になりました', 'success');
      
      // テスト通知を送信
      setTimeout(() => {
        pwaManager.sendNotification({
          title: '通知テスト',
          body: 'プッシュ通知が正常に動作しています！',
          data: { url: '/dashboard' }
        });
      }, 1000);
    } else {
      showNotification('通知権限が拒否されました', 'warning');
    }
  };

  const handleBackgroundSync = async () => {
    setSyncStatus('syncing');
    
    try {
      // 選手データの同期
      const playersSync = await pwaManager.requestBackgroundSync('background-sync-players');
      // 学校データの同期
      const schoolsSync = await pwaManager.requestBackgroundSync('background-sync-schools');
      
      if (playersSync && schoolsSync) {
        showNotification('バックグラウンド同期を開始しました', 'info');
      } else {
        setSyncStatus('error');
        showNotification('バックグラウンド同期に失敗しました', 'error');
      }
    } catch (error) {
      setSyncStatus('error');
      showNotification('同期エラーが発生しました', 'error');
      console.error('Background sync failed:', error);
    }
  };

  const handleInstallPWA = async () => {
    const installed = await pwaManager.promptInstall();
    if (installed) {
      setPwaInstallStatus(getPWAInstallStatus());
      showNotification('アプリのインストールが完了しました', 'success');
    }
  };

  const sendTestNotification = () => {
    pwaManager.sendNotification({
      title: '新しい選手データ',
      body: '2025年度の志望届が更新されました。ダッシュボードで確認してください。',
      data: { url: '/dashboard' }
    });
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <SyncIcon className="sync-spinning" />;
      case 'success':
        return <CloudDoneIcon color="success" />;
      case 'error':
        return <CloudOffIcon color="error" />;
      default:
        return <SyncIcon />;
    }
  };

  return (
    <>
      {/* PWA 制御パネル */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            PWA機能
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* 通知権限ボタン */}
            <Tooltip title={`通知権限: ${notificationPermission}`}>
              <Button
                variant={notificationPermission === 'granted' ? 'contained' : 'outlined'}
                startIcon={notificationPermission === 'granted' ? <NotificationsIcon /> : <NotificationsOffIcon />}
                onClick={handleRequestNotificationPermission}
                color={notificationPermission === 'granted' ? 'success' : 'primary'}
                size="small"
              >
                {notificationPermission === 'granted' ? '通知ON' : '通知を有効化'}
              </Button>
            </Tooltip>

            {/* バックグラウンド同期ボタン */}
            <Tooltip title="データを最新の状態に同期">
              <Button
                variant="outlined"
                startIcon={getSyncIcon()}
                onClick={handleBackgroundSync}
                disabled={syncStatus === 'syncing'}
                size="small"
              >
                {syncStatus === 'syncing' ? '同期中...' : 'データ同期'}
              </Button>
            </Tooltip>

            {/* PWAインストールボタン */}
            {pwaInstallStatus.canInstall && (
              <Button
                variant="outlined"
                startIcon={<InstallMobileIcon />}
                onClick={handleInstallPWA}
                size="small"
              >
                アプリをインストール
              </Button>
            )}

            {/* テスト通知ボタン（開発時のみ） */}
            {import.meta.env.DEV && notificationPermission === 'granted' && (
              <Button
                variant="outlined"
                onClick={sendTestNotification}
                size="small"
              >
                テスト通知
              </Button>
            )}
          </Box>

          {/* ステータス表示 */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Badge color={isOnline ? 'success' : 'error'} variant="dot">
              <Typography variant="body2">
                {isOnline ? 'オンライン' : 'オフライン'}
              </Typography>
            </Badge>

            {pwaInstallStatus.isInstalled && (
              <Badge color="success" variant="dot">
                <Typography variant="body2">PWAインストール済み</Typography>
              </Badge>
            )}

            <Typography variant="body2" color="textSecondary">
              プラットフォーム: {pwaInstallStatus.platform}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* 通知スナックバー */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          action={notification.action}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* 同期中のアニメーション用CSS */}
      <style>
        {`
          @keyframes sync-spinning {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .sync-spinning {
            animation: sync-spinning 1s linear infinite;
          }
        `}
      </style>
    </>
  );
};

export default PWANotificationManager;