/**
 * AWS Cognito認証サービス（Amplify完全除外版）
 * AWS SDK直接使用による認証実装
 */

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  GetUserCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { log } from '../utils/logger';

// 環境別Cognito設定
interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

// dev環境設定
const devConfig: CognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'ap-northeast-1_yRTv0CRfz',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '6cfk60qf91r0qch7nfjops0scd',
  region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
};

// prod環境設定
const prodConfig: CognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'ap-northeast-1_5m7pnXzt8',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '3vuipnf467d9q43k40fo480fdk',
  region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
};

// 環境判定（遅延実行対応）
function getEnvironmentConfig(): CognitoConfig {
  // window オブジェクトの存在確認（SSR対応）
  if (typeof window === 'undefined') {
    log.debug('Using DEV Cognito config (no window object)');
    return devConfig;
  }

  const hostname = window.location.hostname;
  if (hostname.includes('d3brmn978dqs63') || hostname.includes('pro-candidate-frontend-dev') || hostname === 'localhost') {
    log.debug('Using DEV Cognito config');
    return devConfig;
  }
  log.debug('Using PROD Cognito config');
  return prodConfig;
}

// Cognitoクライアントの遅延初期化
let cognitoClient: CognitoIdentityProviderClient | null = null;
let config: CognitoConfig | null = null;

function getCognitoClient(): CognitoIdentityProviderClient {
  if (!cognitoClient) {
    config = getEnvironmentConfig();
    cognitoClient = new CognitoIdentityProviderClient({
      region: config.region,
    });
  }
  return cognitoClient;
}

function getConfig(): CognitoConfig {
  if (!config) {
    config = getEnvironmentConfig();
  }
  return config;
}

// ユーザー情報型定義
export interface User {
  username: string;
  email?: string;
  groups?: string[];
  attributes?: Record<string, string>;
}

// セッションストレージキー
const ACCESS_TOKEN_KEY = 'cognito_access_token';
const ID_TOKEN_KEY = 'cognito_id_token';
const REFRESH_TOKEN_KEY = 'cognito_refresh_token';
const USERNAME_KEY = 'cognito_username';

/**
 * サインイン
 */
export async function signIn(username: string, password: string): Promise<User> {
  try {
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: getConfig().clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    });

    const response = await getCognitoClient().send(command);

    if (response.ChallengeName) {
      throw new Error(`認証チャレンジが必要です: ${response.ChallengeName}`);
    }

    if (!response.AuthenticationResult) {
      throw new Error('認証結果が取得できませんでした');
    }

    // トークンをセッションストレージに保存
    sessionStorage.setItem(ACCESS_TOKEN_KEY, response.AuthenticationResult.AccessToken || '');
    sessionStorage.setItem(ID_TOKEN_KEY, response.AuthenticationResult.IdToken || '');
    sessionStorage.setItem(REFRESH_TOKEN_KEY, response.AuthenticationResult.RefreshToken || '');
    sessionStorage.setItem(USERNAME_KEY, username);

    log.debug('✅ サインイン成功:', username);

    // ユーザー情報取得
    return await getCurrentUser();
  } catch (error) {
    log.error('❌ サインインエラー:', error);
    throw error;
  }
}

/**
 * サインアウト
 */
export async function signOut(): Promise<void> {
  try {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (accessToken) {
      const command = new GlobalSignOutCommand({
        AccessToken: accessToken,
      });
      await getCognitoClient().send(command);
    }

    // セッションストレージクリア
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ID_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USERNAME_KEY);

    log.debug('✅ サインアウト成功');
  } catch (error) {
    log.error('❌ サインアウトエラー:', error);
    // エラーでもローカルストレージはクリア
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ID_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USERNAME_KEY);
    throw error;
  }
}

/**
 * 現在のユーザー情報取得
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const idToken = sessionStorage.getItem(ID_TOKEN_KEY);
    const username = sessionStorage.getItem(USERNAME_KEY);

    if (!accessToken || !username) {
      throw new Error('認証情報が見つかりません');
    }

    const command = new GetUserCommand({
      AccessToken: accessToken,
    });

    const response = await getCognitoClient().send(command);

    // IDトークンからグループ情報取得
    const groups = parseGroupsFromIdToken(idToken);

    // 属性情報をオブジェクトに変換
    const attributes: Record<string, string> = {};
    response.UserAttributes?.forEach(attr => {
      if (attr.Name && attr.Value) {
        attributes[attr.Name] = attr.Value;
      }
    });

    const user: User = {
      username: response.Username || username,
      email: attributes['email'],
      groups,
      attributes,
    };

    log.debug('✅ ユーザー情報取得成功:', user.username);
    return user;
  } catch (error) {
    log.error('❌ ユーザー情報取得エラー:', error);
    throw error;
  }
}

/**
 * IDトークンからグループ情報を抽出
 */
function parseGroupsFromIdToken(idToken: string | null): string[] {
  if (!idToken) return [];

  try {
    // JWTトークンをデコード（Base64）
    const parts = idToken.split('.');
    if (parts.length !== 3) return [];

    const payload = JSON.parse(atob(parts[1]));
    const groups = payload['cognito:groups'];

    if (Array.isArray(groups)) {
      return groups.filter((g): g is string => typeof g === 'string');
    }
    return [];
  } catch (error) {
    log.error('❌ IDトークンパースエラー:', error);
    return [];
  }
}

/**
 * セッション有効性チェック
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

/**
 * サインアップ
 */
export async function signUp(username: string, password: string, email: string): Promise<void> {
  try {
    const command = new SignUpCommand({
      ClientId: getConfig().clientId,
      Username: username,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
      ],
    });

    await getCognitoClient().send(command);
    log.debug('✅ サインアップ成功:', username);
  } catch (error) {
    log.error('❌ サインアップエラー:', error);
    throw error;
  }
}

/**
 * サインアップ確認
 */
export async function confirmSignUp(username: string, code: string): Promise<void> {
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: getConfig().clientId,
      Username: username,
      ConfirmationCode: code,
    });

    await getCognitoClient().send(command);
    log.debug('✅ サインアップ確認成功:', username);
  } catch (error) {
    log.error('❌ サインアップ確認エラー:', error);
    throw error;
  }
}

/**
 * パスワードリセット開始
 */
export async function resetPassword(username: string): Promise<void> {
  try {
    const command = new ForgotPasswordCommand({
      ClientId: getConfig().clientId,
      Username: username,
    });

    await getCognitoClient().send(command);
    log.debug('✅ パスワードリセット開始:', username);
  } catch (error) {
    log.error('❌ パスワードリセットエラー:', error);
    throw error;
  }
}

/**
 * パスワードリセット確認
 */
export async function confirmResetPassword(username: string, code: string, newPassword: string): Promise<void> {
  try {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: getConfig().clientId,
      Username: username,
      ConfirmationCode: code,
      Password: newPassword,
    });

    await getCognitoClient().send(command);
    log.debug('✅ パスワードリセット確認成功:', username);
  } catch (error) {
    log.error('❌ パスワードリセット確認エラー:', error);
    throw error;
  }
}
