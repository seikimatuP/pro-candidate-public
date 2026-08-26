// 開発環境用の簡易Amplify設定
export interface CognitoConfig {
  userPoolId: string;
  userPoolClientId: string;
  region: string;
  storageBucket?: string;
  oauth?: {
    domain: string;
    scope: string[];
    redirectSignIn: string;
    redirectSignOut: string;
  };
}

import { Amplify } from 'aws-amplify';
import { log as logger } from '../utils/logger';

export const configureAmplify = (config: CognitoConfig) => {
  const amplifyConfig = {
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
        loginWith: {
          oauth: config.oauth ? {
            domain: config.oauth.domain,
            scopes: config.oauth.scope as Array<"email" | "openid" | "profile">,
            redirectSignIn: [config.oauth.redirectSignIn],
            redirectSignOut: [config.oauth.redirectSignOut],
            responseType: 'code' as const,
          } : undefined,
          email: true,
          username: true,
        },
      },
    },
  };

  Amplify.configure(amplifyConfig);
  if (import.meta.env.DEV) {
    logger.info('Amplify configured successfully');
  }
};

// プロダクション環境のCognito設定（動的URL使用）
const prodCognitoConfig: CognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'ap-northeast-1_prodPoolId',
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || 'prodclientidxxxxxxxxxxxxxx',
  region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
  storageBucket: import.meta.env.VITE_S3_BUCKET_NAME || 'pro-candidate-data-prod',
  oauth: {
    domain: 'pro-candidate-prod-auth.auth.ap-northeast-1.amazoncognito.com',
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: import.meta.env.VITE_FRONTEND_URL || window.location.origin,
    redirectSignOut: import.meta.env.VITE_FRONTEND_URL || window.location.origin,
  }
};

// 開発環境の設定
const devCognitoConfig: CognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'ap-northeast-1_placeholder',
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || 'placeholder-client-id',
  region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
  storageBucket: import.meta.env.VITE_S3_BUCKET_NAME || 'pro-candidate-data-dev',
  oauth: {
    domain: `pro-candidate-${import.meta.env.VITE_ENVIRONMENT || 'dev'}.auth.ap-northeast-1.amazoncognito.com`,
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: import.meta.env.VITE_FRONTEND_URL || window.location.origin,
    redirectSignOut: import.meta.env.VITE_FRONTEND_URL || window.location.origin,
  }
};

export const defaultCognitoConfig: CognitoConfig = 
  window.location.hostname.includes('s3-website') || window.location.hostname.includes('amazonaws.com')
    ? prodCognitoConfig  // プロダクション環境
    : devCognitoConfig;  // 開発環境