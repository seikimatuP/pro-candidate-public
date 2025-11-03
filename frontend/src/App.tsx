import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { configureAmplify, defaultCognitoConfig } from './config/amplify';
import { isLocalhost } from './utils/environment';

// 遅延読み込み対象：コード分割実装
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const PlayerManagement = lazy(() => import('./pages/PlayerManagement').then(m => ({ default: m.PlayerManagement })));
const SchoolManagement = lazy(() => import('./pages/SchoolManagement').then(m => ({ default: m.SchoolManagement })));
const HighschoolPlayers = lazy(() => import('./pages/HighschoolPlayers').then(m => ({ default: m.HighschoolPlayers })));
const UniversityPlayers = lazy(() => import('./pages/UniversityPlayers').then(m => ({ default: m.UniversityPlayers })));
const ScrapingHistory = lazy(() => import('./pages/ScrapingHistory').then(m => ({ default: m.ScrapingHistory })));
const TestPage = lazy(() => import('./pages/TestPage').then(m => ({ default: m.TestPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));

function App() {
  useEffect(() => {
    // Service Worker を完全に削除（強化版）
    const cleanupServiceWorkers = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // 1. すべてのService Workerを取得して削除
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.length > 0) {
            console.warn('🚨 Service Worker が検出されました。強制削除を開始します...');
            for (const registration of registrations) {
              const success = await registration.unregister();
              if (success) {
                console.log('✅ Service Worker を削除しました:', registration.scope);
              } else {
                console.error('❌ Service Worker の削除に失敗:', registration.scope);
              }
            }
          }
          
          // 2. Service Worker controllerをクリア
          if (navigator.serviceWorker.controller) {
            console.warn('🚨 Active Service Worker が検出されました。リロードが必要です。');
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
          console.error('Service Worker の削除中にエラー:', error);
        }
      }
      
      // 3. すべてのキャッシュを強制削除
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          if (cacheNames.length > 0) {
            console.warn('🚨 キャッシュが検出されました。完全削除を開始します...');
            await Promise.all(
              cacheNames.map(async (cacheName) => {
                const deleted = await caches.delete(cacheName);
                if (deleted) {
                  console.log('✅ キャッシュを削除しました:', cacheName);
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
            console.log('✅ localStorageから削除:', key);
          });
          
        } catch (error) {
          console.error('キャッシュの削除中にエラー:', error);
        }
      }
    };
    
    cleanupServiceWorkers();

    // ローカル環境ではAmplify初期化をスキップ
    if (isLocalhost()) {
      console.log('🏠 ローカル環境: 認証をスキップします');
      return;
    }

    // Amplify設定を初期化
    if (defaultCognitoConfig.userPoolId && defaultCognitoConfig.userPoolClientId) {
      try {
        configureAmplify(defaultCognitoConfig);
        console.log('✅ AWS Amplify設定完了');
      } catch (error) {
        console.error('❌ AWS Amplify設定エラー:', error);
      }
    } else {
      console.warn('⚠️ AWS Cognito設定が不完全です');
    }
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* ログインページ（認証不要） */}
              <Route path="/auth/login" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <LoginPage />
                </Suspense>
              } />

              {/* 保護されたページ（認証必要） */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Dashboard />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/players" element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <PlayerManagement />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/highschool-players" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <HighschoolPlayers />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/university-players" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <UniversityPlayers />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/schools" element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <SchoolManagement />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/scraping-history" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ScrapingHistory />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/test" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <TestPage />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
