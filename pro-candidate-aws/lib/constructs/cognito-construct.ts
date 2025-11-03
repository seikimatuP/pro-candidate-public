import { Construct } from 'constructs';
import {
  UserPool,
  UserPoolClient,
  AccountRecovery,
  UserPoolDomain,
  Mfa,
  UserPoolEmail,
  OAuthScope,
  ClientAttributes,
} from 'aws-cdk-lib/aws-cognito';
import { CfnOutput, Duration } from 'aws-cdk-lib';

export interface CognitoConstructProps {
  readonly stage: string;
  readonly frontendUrl?: string;
}

export class CognitoConstruct extends Construct {
  public readonly userPool: UserPool;
  public readonly userPoolClient: UserPoolClient;
  public readonly userPoolDomain: UserPoolDomain;

  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    // Cognito User Pool
    this.userPool = new UserPool(this, 'UserPool', {
      userPoolName: `pro-candidate-${props.stage}-user-pool`,
      
      // サインイン設定
      signInAliases: {
        email: true,
        username: true,
      },
      
      // セルフサインアップ設定
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
      },
      
      // パスワードポリシー
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      
      // MFA設定
      mfa: Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      
      // アカウント復旧
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      
      // 詳細セキュリティ（無料枠では無効）
      // advancedSecurityMode: AdvancedSecurityMode.ENFORCED,
      
      // メール設定
      email: UserPoolEmail.withCognito('noreply@verification.com'),
      
      // 標準属性
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
      },
      
      // ユーザー招待メッセージ
      userInvitation: {
        emailSubject: 'プロ野球志望届システムへようこそ',
        emailBody: 'ユーザー名: {username}、一時パスワード: {####}',
        smsMessage: 'ユーザー名: {username}、一時パスワード: {####}',
      },
      
      // ユーザー検証メッセージ
      userVerification: {
        emailSubject: 'プロ野球志望届システム - メールアドレス確認',
        emailBody: '確認コード: {####}',
        smsMessage: '確認コード: {####}',
      },
    });

    // User Pool Client
    this.userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `pro-candidate-${props.stage}-client`,
      
      // 認証フロー
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
        adminUserPassword: true,
      },
      
      // トークン設定
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      
      // セキュリティ設定
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
      
      // OAuth設定
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          OAuthScope.EMAIL,
          OAuthScope.OPENID,
          OAuthScope.PROFILE,
        ],
        callbackUrls: props.frontendUrl 
          ? [`${props.frontendUrl}/auth/callback`, 'http://localhost:5173/auth/callback']
          : ['http://localhost:5173/auth/callback'],
        logoutUrls: props.frontendUrl
          ? [`${props.frontendUrl}/auth/logout`, 'http://localhost:5173/auth/logout']
          : ['http://localhost:5173/auth/logout'],
      },
      
      // 読み取り・書き込み属性
      readAttributes: new ClientAttributes()
        .withStandardAttributes({
          email: true,
          emailVerified: true,
          familyName: true,
          givenName: true,
        }),
      writeAttributes: new ClientAttributes()
        .withStandardAttributes({
          email: true,
          familyName: true,
          givenName: true,
        }),
    });

    // User Pool Domain
    this.userPoolDomain = new UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: `pro-candidate-${props.stage}-auth`,
      },
    });

    // 管理者グループ作成（後で実装）
    // const adminGroup = new CfnUserPoolGroup(this, 'AdminGroup', {
    //   userPoolId: this.userPool.userPoolId,
    //   groupName: 'admin',
    //   description: 'システム管理者グループ',
    //   precedence: 1,
    // });

    // 一般ユーザーグループ作成（後で実装）
    // const userGroup = new CfnUserPoolGroup(this, 'UserGroup', {
    //   userPoolId: this.userPool.userPoolId,
    //   groupName: 'user',
    //   description: '一般ユーザーグループ',
    //   precedence: 10,
    // });

    // デフォルト管理者ユーザー作成（後で実装）
    // if (props.stage === 'dev' || props.stage === 'development') {
    //   const adminUser = new CfnUserPoolUser(this, 'AdminUser', {
    //     userPoolId: this.userPool.userPoolId,
    //     username: 'admin',
    //     userAttributes: [
    //       {
    //         name: 'email',
    //         value: 'admin@example.com',
    //       },
    //       {
    //         name: 'email_verified',
    //         value: 'true',
    //       },
    //     ],
    //     messageAction: 'SUPPRESS', // 招待メール送信を抑制
    //   });
    // }

    // CloudFormation Outputs
    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${props.stage}-UserPoolId`,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${props.stage}-UserPoolClientId`,
    });

    new CfnOutput(this, 'UserPoolDomainName', {
      value: this.userPoolDomain.domainName,
      description: 'Cognito User Pool Domain',
      exportName: `${props.stage}-UserPoolDomain`,
    });

    new CfnOutput(this, 'UserPoolRegion', {
      value: this.userPool.stack.region,
      description: 'Cognito User Pool Region',
      exportName: `${props.stage}-UserPoolRegion`,
    });
  }
}