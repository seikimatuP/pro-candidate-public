import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { configureAmplify, defaultCognitoConfig } from './config/amplify';
import { isLocalhost } from './utils/environment';
import { log as logger } from './utils/logger';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const PlayerManagement = lazy(() =>
  import('./pages/PlayerManagement').then(m => ({ default: m.PlayerManagement }))
);
const SchoolManagement = lazy(() =>
  import('./pages/SchoolManagement').then(m => ({ default: m.SchoolManagement }))
);
const HighschoolPlayers = lazy(() =>
  import('./pages/HighschoolPlayers').then(m => ({ default: m.HighschoolPlayers }))
);
const UniversityPlayers = lazy(() =>
  import('./pages/UniversityPlayers').then(m => ({ default: m.UniversityPlayers }))
);
const ScrapingHistory = lazy(() =>
  import('./pages/ScrapingHistory').then(m => ({ default: m.ScrapingHistory }))
);
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage }))
);
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

const TestPage = import.meta.env.DEV
  ? lazy(() => import('./pages/TestPage').then(m => ({ default: m.TestPage })))
  : null;
const DesignLabPage = import.meta.env.DEV
  ? lazy(() => import('../.claude-design/lab/DesignLabPage'))
  : null;

function App() {
  useEffect(() => {
    // Service Worker を完全に削除（強化版）
    const cleanupServiceWorkers = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // 1. すべてのService Workerを取得して削除
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.length > 0) {
            logger.warn('🚨 Service Worker が検出されました。強制削除を開始します...');
            for (const registration of registrations) {
              const success = await registration.unregister();
              if (success) {
                logger.info('✅ Service Worker を削除しました:', registration.scope);
              } else {
                logger.error('❌ Service Worker の削除に失敗:', registration.scope);
              }
            }
          }

          // 2. Service Worker controllerをクリア
          if (navigator.serviceWorker.controller) {
            logger.warn('🚨 Active Service Worker が検出されました。リロードが必要です。');
            // ページをリロードして完全にクリア（1回だけ実行）
            const reloaded = sessionStorage.getItem('sw-cleanup-reloaded');
            if (!reloaded) {
              sessionStorage.setItem('sw-cleanup-reloaded', 'true');
              window.location.reload();
              return;
            }
          }
          sessionStorage.removeItem('sw-cleanup-reloaded');
        } catch (error) {
          logger.error('Service Worker の削除中にエラー:', error);
        }
      }

      // 3. すべてのキャッシュを強制削除
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          if (cacheNames.length > 0) {
            logger.warn('🚨 キャッシュが検出されました。完全削除を開始します...');
            await Promise.all(
              cacheNames.map(async cacheName => {
                const deleted = await caches.delete(cacheName);
                if (deleted) {
                  logger.info('✅ キャッシュを削除しました:', cacheName);
                }
              })
            );
          }

          // 4. localStorage/sessionStorageのPWA関連データも削除
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('workbox') || key.includes('sw') || key.includes('pwa'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            logger.info('✅ localStorageから削除:', key);
          });
        } catch (error) {
          logger.error('キャッシュの削除中にエラー:', error);
        }
      }
    };

    cleanupServiceWorkers();

    // ローカル環境ではAmplify初期化をスキップ
    if (isLocalhost()) {
      logger.info('ローカル環境: 認証をスキップします');
      return;
    }

    if (defaultCognitoConfig.userPoolId && defaultCognitoConfig.userPoolClientId) {
      try {
        configureAmplify(defaultCognitoConfig);
        logger.info('AWS Amplify設定完了');
      } catch (error) {
        logger.error('AWS Amplify設定エラー:', error);
      }
    } else {
      logger.warn('AWS Cognito設定が不完全です');
    }
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route
                path="/auth/login"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <LoginPage />
                  </Suspense>
                }
              />

              {/* 公開ページ: 個人を識別できない集計ダッシュボードのみ認証不要 */}
              <Route
                path="/"
                element={
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Dashboard />
                    </Suspense>
                  </AppLayout>
                }
              />
              {/* 実名一覧・管理系ページは admin 必須 */}
              <Route
                path="/players"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppLayout>
                      <Suspense fallback={<LoadingSpinner />}>
                        <PlayerManagement />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/highschool-players"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppLayout>
                      <Suspense fallback={<LoadingSpinner />}>
                        <HighschoolPlayers />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/university-players"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppLayout>
                      <Suspense fallback={<LoadingSpinner />}>
                        <UniversityPlayers />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schools"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppLayout>
                      <Suspense fallback={<LoadingSpinner />}>
                        <SchoolManagement />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scraping-history"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppLayout>
                      <Suspense fallback={<LoadingSpinner />}>
                        <ScrapingHistory />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {TestPage && (
                <Route
                  path="/test"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Suspense fallback={<LoadingSpinner />}>
                          <TestPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
              )}
              {DesignLabPage && (
                <Route
                  path="/__design_lab"
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <DesignLabPage />
                    </Suspense>
                  }
                />
              )}

              {/* 旧URL・タイポ対策: /dashboard は / へ、その他未定義URLは404ページへ */}
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route
                path="*"
                element={
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <NotFound />
                    </Suspense>
                  </AppLayout>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
