import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getCurrentUser, signIn, signOut, signUp, confirmSignUp, resetPassword, confirmResetPassword, fetchAuthSession } from 'aws-amplify/auth';
import { isLocalHostname, isLocalhost } from '../utils/environment';
import { log as logger } from '../utils/logger';

interface User {
  username: string;
  email?: string;
  groups?: string[];
  attributes?: Record<string, string | number | boolean>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (username: string, password: string, email: string) => Promise<void>;
  confirmSignUp: (username: string, code: string) => Promise<void>;
  resetPassword: (username: string) => Promise<void>;
  confirmResetPassword: (username: string, code: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ユーザーのグループ情報を取得（AWS Cognitoから取得）
  const getUserGroups = useCallback(async (currentGroups?: string[]): Promise<string[]> => {
    // 本番環境でのAdmin権限バイパス防止
    // 環境変数・URLパラメータ・localStorageからの権限昇格を禁止
    const isProduction = import.meta.env.PROD && !import.meta.env.DEV;
    const isCloudFrontDomain = window.location.hostname.includes('cloudfront.net');

    // 本番環境（CloudFront）では必ずCognitoから権限を取得
    if (isProduction || isCloudFrontDomain) {
      // URLパラメータ・localStorageからの権限バイパス試行をログ記録
      if (window.location.search.includes('e2e=true') ||
          window.localStorage.getItem('E2E_TEST_MODE') === 'true') {
        logger.warn('⚠️ 本番環境でのAdmin権限バイパス試行を検出');
      }
      // 本番環境は常にCognito認証に委ねる（下のtryブロックへ進む）
    } else {
      // 開発環境のみ：ローカル環境またはE2Eテスト環境では管理者権限を付与。
      // URLパラメータ・localStorage による指定は実ホスト名がローカルのときだけ尊重する。
      const isLocalMachine =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isE2EFlagged =
        window.location.search.includes('e2e=true') ||
        window.localStorage.getItem('E2E_TEST_MODE') === 'true';

      if (isLocalMachine || import.meta.env.VITE_E2E_TEST === 'true') {
        return ['admin'];
      }
      if (isE2EFlagged) {
        logger.warn('⚠️ ローカル以外のホストでのE2Eフラグによる権限昇格を無視');
      }
    }

    try {
      // 初回のみ強制更新、それ以降は通常のセッション取得
      const forceRefresh = !currentGroups;
      const { tokens } = await fetchAuthSession({ forceRefresh });

      // IDトークンからグループ情報を取得
      const groups = tokens?.idToken?.payload?.['cognito:groups'];

      if (import.meta.env.DEV) {
        logger.info('✅ ユーザーグループ取得成功:', groups);
      }

      // groupsが配列であることを確認し、文字列配列に変換
      if (Array.isArray(groups)) {
        return groups.filter((g): g is string => typeof g === 'string');
      }
      return [];
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('❌ グループ情報の取得に失敗:', error);
      }
      return [];
    }
  }, []);

  const refreshUser = useCallback(async () => {
    // 認証バイパス（E2Eテストモード・モック認証）は実ホスト名がローカルのときだけ許可する。
    // デプロイ済みドメインでは localStorage / URLパラメータを立てても効かない。
    const localBypassAllowed = isLocalHostname();

    // E2Eテストモードの確認（URLパラメータから）
    const urlParams = new URLSearchParams(window.location.search);
    const isE2EMode = urlParams.get('e2e') === 'true';

    if (isE2EMode && localBypassAllowed) {
      // E2EモードフラグをlocalStorageに保存（ページ遷移後も維持）
      window.localStorage.setItem('E2E_TEST_MODE', 'true');
      logger.info('E2Eテストモード有効化 - 認証をバイパス');
    }

    // モック認証の確認
    const isMockAuth =
      localBypassAllowed && window.localStorage.getItem('MOCK_AUTH') === 'true';
    const isE2ETest =
      localBypassAllowed && window.localStorage.getItem('E2E_TEST_MODE') === 'true';

    // ローカル環境、E2Eテストモード、またはモック認証では認証をスキップしてダミーユーザーを設定
    if (isLocalhost() || isMockAuth || isE2ETest) {
      setUser({
        username: isMockAuth ? 'admin' : 'local-admin',
        email: isMockAuth ? 'admin@example.com' : 'admin@localhost',
        groups: ['admin'],
        attributes: {},
      });
      setLoading(false);
      return;
    }

    // AWS Cognito環境での認証状態確認（リトライ機能付き）
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const currentUser = await getCurrentUser();
        // 既存のグループ情報を渡すことはできない（userステートに依存するため）
        // 代わりにundefinedを渡して強制リフレッシュさせるか、ロジックを調整
        const userGroups = await getUserGroups();
        
        setUser({
          username: currentUser.username,
          email: currentUser.signInDetails?.loginId,
          groups: userGroups,
          attributes: {} as Record<string, string | number | boolean>,
        });
        
        if (import.meta.env.DEV) {
          logger.info('✅ 認証状態確認成功:', currentUser.username);
        }
        setLoading(false);
        return;
        
      } catch (error) {
        retryCount++;
        
        if (import.meta.env.DEV) {
          logger.debug(`⚠️ 認証確認試行 ${retryCount}/${maxRetries}:`, error);
        }
        
        if (retryCount < maxRetries) {
          // 短い待機後にリトライ
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // 最終試行も失敗した場合
        if (import.meta.env.DEV) {
          logger.info('❌ 認証状態確認失敗');
        }

        // ローカル環境ではダミーユーザーを設定
        if (isLocalhost()) {
          logger.info('🏠 ローカル環境のためダミーユーザーを設定');
          setUser({
            username: 'local-admin',
            email: 'admin@localhost',
            groups: ['admin'],
            attributes: {} as Record<string, string | number | boolean>,
          });
        } else {
          setUser(null);
        }
      }
    }
    
    setLoading(false);
  }, [getUserGroups]);



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser();
    
    // ページフォーカス時とvisibility変更時に認証状態を再確認
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUser();
      }
    };
    
    const handleFocus = () => {
      refreshUser();
    };
    
    // イベントリスナー登録
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // クリーンアップ
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshUser]);

  const handleSignIn = async (username: string, password: string) => {
    try {
      const result = await signIn({ username, password });
      await refreshUser();
      return result;
    } catch (error) {
      // 既にログイン済みの場合は正常として処理
      if (error instanceof Error && error.name === 'UserAlreadyAuthenticatedException') {
        logger.info('✅ 既にログイン済み: セッションを継続', { username });
        await refreshUser();
        return;
      }
      if (import.meta.env.DEV) {
        logger.error('Sign in error:', error);
      }
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Sign out error:', error);
      }
      throw error;
    }
  };

  const handleSignUp = async (username: string, password: string, email: string) => {
    try {
      const result = await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });
      return result;
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Sign up error:', error);
      }
      throw error;
    }
  };

  const handleConfirmSignUp = async (username: string, code: string) => {
    try {
      const result = await confirmSignUp({ username, confirmationCode: code });
      return result;
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Confirm sign up error:', error);
      }
      throw error;
    }
  };

  const handleResetPassword = async (username: string) => {
    try {
      const result = await resetPassword({ username });
      return result;
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Reset password error:', error);
      }
      throw error;
    }
  };

  const handleConfirmResetPassword = async (username: string, code: string, newPassword: string) => {
    try {
      const result = await confirmResetPassword({
        username,
        confirmationCode: code,
        newPassword,
      });
      return result;
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Confirm reset password error:', error);
      }
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    signIn: async (username: string, password: string) => { await handleSignIn(username, password); },
    signOut: handleSignOut,
    signUp: async (username: string, password: string, email: string) => { await handleSignUp(username, password, email); },
    confirmSignUp: async (username: string, code: string) => { await handleConfirmSignUp(username, code); },
    resetPassword: async (username: string) => { await handleResetPassword(username); },
    confirmResetPassword: async (username: string, code: string, newPassword: string) => { await handleConfirmResetPassword(username, code, newPassword); },
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};