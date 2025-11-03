import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';

export interface ApiGatewayConstructProps {
  apiFunction: lambda.Function;
  stage: string;
  userPool?: cognito.UserPool;
}

export class ApiGatewayConstruct extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    // REST API作成（X-Ray有効）
    this.api = new apigateway.RestApi(this, 'ProBaseballApi', {
      restApiName: `pro-baseball-api-${props.stage}`,
      description: 'Pro Baseball Player Data API',
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true, // X-Ray tracing
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Requested-With',
          'Cache-Control',
        ],
      },
      // デフォルトメソッドオプション（認証なし）
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.NONE,
      },
    });

    // Cognito認証（現在は全環境で無効化 - 開発効率重視）
    let cognitoAuthorizer: apigateway.CognitoUserPoolsAuthorizer | undefined;
    // if (props.userPool && props.stage === 'prod') {
    //   cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
    //     cognitoUserPools: [props.userPool],
    //     identitySource: 'method.request.header.Authorization',
    //     authorizerName: `cognito-authorizer-${props.stage}`,
    //   });
    // }

    // Lambda統合
    const lambdaIntegration = new apigateway.LambdaIntegration(props.apiFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // CORS Headers定数（Gateway Responsesで使用）
    const CORS_HEADERS =
      "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With,Cache-Control'";
    const CORS_ORIGIN = "'*'";

    // APIリソース構造
    // 認証オプション設定 (全環境で認証無効化)
    const authMethodOptions = cognitoAuthorizer
      ? {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
          apiKeyRequired: false, // Cognito認証使用時はAPIキー不要
        }
      : {
          apiKeyRequired: false, // 認証・APIキー共に無効化
        };

    // /health (認証不要・APIキー不要)
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // /players (認証が有効な場合は認証必要)
    const playersResource = this.api.root.addResource('players');
    playersResource.addMethod('GET', lambdaIntegration, authMethodOptions); // 全選手取得
    playersResource.addMethod('POST', lambdaIntegration, authMethodOptions); // 選手作成

    // /players/{id}
    const playerResource = playersResource.addResource('{id}');
    playerResource.addMethod('GET', lambdaIntegration, authMethodOptions); // 選手詳細取得
    playerResource.addMethod('PUT', lambdaIntegration, authMethodOptions); // 選手更新
    playerResource.addMethod('DELETE', lambdaIntegration, authMethodOptions); // 選手削除

    // /players/search
    const searchResource = playersResource.addResource('search');
    searchResource.addMethod('GET', lambdaIntegration, authMethodOptions); // 検索API

    // /schools (認証が有効な場合は認証必要)
    const schoolsResource = this.api.root.addResource('schools');
    schoolsResource.addMethod('GET', lambdaIntegration, authMethodOptions); // 学校一覧

    // /schools/{school}/players
    const schoolPlayersResource = schoolsResource.addResource('{school}').addResource('players');
    schoolPlayersResource.addMethod('GET', lambdaIntegration, authMethodOptions); // 学校別選手一覧

    // /scraping/trigger (認証が有効な場合は認証必要)
    const scrapingResource = this.api.root.addResource('scraping');
    const triggerResource = scrapingResource.addResource('trigger');
    triggerResource.addMethod('POST', lambdaIntegration, authMethodOptions); // スクレイピング実行
    // OPTIONSメソッドはdefaultCorsPreflightOptionsで自動的に追加される

    // /scraping/history (認証が有効な場合は認証必要)
    const historyResource = scrapingResource.addResource('history');
    historyResource.addMethod('GET', lambdaIntegration, authMethodOptions); // 履歴取得
    // OPTIONSメソッドはdefaultCorsPreflightOptionsで自動的に追加される

    // プロキシリソース追加（すべてのパスをLambdaに転送）
    const proxyResource = this.api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', lambdaIntegration, authMethodOptions);

    // APIキー設定（現在は無効化）
    // if (props.stage === 'prod') {
    //   const apiKey = this.api.addApiKey('ProBaseballApiKey', {
    //     apiKeyName: `pro-baseball-api-key-${props.stage}`,
    //     description: 'API key for Pro Baseball API',
    //   });

    //   const plan = this.api.addUsagePlan('ProBaseballUsagePlan', {
    //     name: `pro-baseball-usage-plan-${props.stage}`,
    //     description: 'Usage plan for Pro Baseball API',
    //     throttle: {
    //       rateLimit: 50,
    //       burstLimit: 100,
    //     },
    //     quota: {
    //       limit: 1000,
    //       period: apigateway.Period.DAY,
    //     },
    //   });

    //   plan.addApiKey(apiKey);
    //   plan.addApiStage({
    //     stage: this.api.deploymentStage,
    //   });

    //   // APIキー出力
    //   new cdk.CfnOutput(this, 'ApiKey', {
    //     value: apiKey.keyId,
    //     description: 'API Gateway API Key ID',
    //   });
    // }

    // Gateway Responses for CORS support during errors
    this.api.addGatewayResponse('UnauthorizedResponse', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: {
        'Access-Control-Allow-Origin': CORS_ORIGIN,
        'Access-Control-Allow-Headers': CORS_HEADERS,
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    this.api.addGatewayResponse('ForbiddenResponse', {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders: {
        'Access-Control-Allow-Origin': CORS_ORIGIN,
        'Access-Control-Allow-Headers': CORS_HEADERS,
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    // 出力
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'Pro Baseball API Gateway URL',
    });

    // タグ設定
    cdk.Tags.of(this.api).add('Project', 'ProBaseballScrapingSystem');
    cdk.Tags.of(this.api).add('Environment', props.stage);
  }
}
