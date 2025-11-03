import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { isLocalhost } from '../../utils/environment';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // ローカル環境では認証をスキップ
  if (isLocalhost()) {
    return <>{children}</>;
  }

  // ロード中の表示
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" color="textSecondary">
          認証状態を確認中...
        </Typography>
      </Box>
    );
  }

  // 未認証の場合はログインページにリダイレクト
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/auth/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // 管理者権限が必要で、管理者でない場合
  if (requireAdmin && user && !user.groups?.includes('admin')) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <Typography variant="h5" color="error">
          アクセス権限がありません
        </Typography>
        <Typography variant="body1" color="textSecondary">
          この機能を利用するには管理者権限が必要です。
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};