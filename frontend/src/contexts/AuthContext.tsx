import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getCurrentUser, signIn, signOut, signUp, confirmSignUp, resetPassword, confirmResetPassword, fetchAuthSession } from 'aws-amplify/auth';
import { isLocalhost } from '../utils/environment';

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

  const refreshUser = useCallback(async () => {
    // E2Eテストモードの確認（URLパラメータから）
    const urlParams = new URLSearchParams(window.location.search);
    const isE2EMode = urlParams.get('e2e') === 'true';

    if (isE2EMode) {
      // E2EモードフラグをlocalStorageに保存（ページ遷移後も維持）
      window.localStorage.setItem('E2E_TEST_MODE', 'true');
      console.log('E2Eテストモード有効化 - 認証をバイパス');
    }

    // モック認証の確認
    const isMockAuth = window.localStorage.getItem('MOCK_AUTH') === 'true';
    const isE2ETest = window.localStorage.getItem('E2E_TEST_MODE') === 'true';

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
        const userGroups = await getUserGroups();
        
        setUser({
          username: currentUser.username,
          email: currentUser.signInDetails?.loginId,
          groups: userGroups,
          attributes: {} as Record<string, string | number | boolean>,
        });
        
        if (import.meta.env.DEV) {
          console.log('✅ 認証状態確認成功:', currentUser.username);
        }
        setLoading(false);
        return;
        
      } catch (error) {
        retryCount++;
        
        if (import.meta.env.DEV) {
          console.log(`⚠️ 認証確認試行 ${retryCount}/${maxRetries}:`, error);
        }
        
        if (retryCount < maxRetries) {
          // 短い待機後にリトライ
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // 最終試行も失敗した場合
        if (import.meta.env.DEV) {
          console.log('❌ 認証状態確認失敗');
        }

        // ローカル環境ではダミーユーザーを設定
        if (isLocalhost()) {
          console.log('🏠 ローカル環境のためダミーユーザーを設定');
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
  }, []);

  // ユーザーのグループ情報を取得（AWS Cognitoから取得）
  const getUserGroups = async (): Promise<string[]> => {
    // ローカル環境またはE2Eテスト環境では管理者権限を付与
    if (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        import.meta.env.VITE_E2E_TEST === 'true' ||
        window.location.search.includes('e2e=true') ||
        window.localStorage.getItem('E2E_TEST_MODE') === 'true') {
      return ['admin'];
    }

    try {
      // 初回のみ強制更新、それ以降は通常のセッション取得
      const forceRefresh = !user?.groups;
      const { tokens } = await fetchAuthSession({ forceRefresh });

      // IDトークンからグループ情報を取得
      const groups = tokens?.idToken?.payload?.['cognito:groups'];

      if (import.meta.env.DEV) {
        console.log('✅ ユーザーグループ取得成功:', groups);
      }

      // groupsが配列であることを確認し、文字列配列に変換
      if (Array.isArray(groups)) {
        return groups.filter((g): g is string => typeof g === 'string');
      }
      return [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ グループ情報の取得に失敗:', error);
      }
      return [];
    }
  };

  useEffect(() => {
    refreshUser();
    
    // ページフォーカス時とvisibility変更時に認証状態を再確認
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        refreshUser();
      }
    };
    
    const handleFocus = () => {
      if (!loading) {
        refreshUser();
      }
    };
    
    // イベントリスナー登録
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // クリーンアップ
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loading, refreshUser]);

  const handleSignIn = async (username: string, password: string) => {
    try {
      const result = await signIn({ username, password });
      await refreshUser();
      return result;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Sign in error:', error);
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
        console.error('Sign out error:', error);
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
        console.error('Sign up error:', error);
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
        console.error('Confirm sign up error:', error);
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
        console.error('Reset password error:', error);
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
        console.error('Confirm reset password error:', error);
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