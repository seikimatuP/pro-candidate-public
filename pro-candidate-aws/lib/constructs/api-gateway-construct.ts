import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
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

    // アクセスログ用ロググループ
    // 一般公開後に「誰が・いつ・どのパスへ・何を返したか」を追跡できるようにする。
    // 保持期間90日（無期限保持によるコスト増を避けつつ調査に足りる長さ）。
    const accessLogGroup = new logs.LogGroup(this, 'ApiAccessLogGroup', {
      logGroupName: `/aws/apigateway/pro-baseball-api-${props.stage}/access`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // REST API作成（X-Ray有効）
    this.api = new apigateway.RestApi(this, 'ProBaseballApi', {
      restApiName: `pro-baseball-api-${props.stage}`,
      description: 'Pro Baseball Player Data API',
      // アクセスログの出力には API Gateway アカウント設定の CloudWatch Logs ロールが必要。
      // cdk.json で `@aws-cdk/aws-apigateway:disableCloudWatchRole: true` としているため
      // 既定では作成されないので、ここで明示的に有効化する。
      // AWS::ApiGateway::Account はリージョン単位の単一設定であり、
      // スタック削除時に設定ごと消えないよう RETAIN を指定する。
      cloudWatchRole: true,
      cloudWatchRoleRemovalPolicy: cdk.RemovalPolicy.RETAIN,
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true, // X-Ray tracing
        // アクセスログ（JSON形式）
        accessLogDestination: new apigateway.LogGroupLogDestination(accessLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.custom(
          JSON.stringify({
            requestId: apigateway.AccessLogField.contextRequestId(),
            ip: apigateway.AccessLogField.contextIdentitySourceIp(),
            user: apigateway.AccessLogField.contextIdentityUser(),
            requestTime: apigateway.AccessLogField.contextRequestTime(),
            httpMethod: apigateway.AccessLogField.contextHttpMethod(),
            resourcePath: apigateway.AccessLogField.contextResourcePath(),
            status: apigateway.AccessLogField.contextStatus(),
            responseLength: apigateway.AccessLogField.contextResponseLength(),
          })
        ),
        // ステージ全体のスロットリング（一般公開時のDDoS・コスト暴発対策）
        // UsagePlan側のスロットリングはAPIキー未使用のため実効しない。
        // ステージレベルで設定することで全リクエストに適用される。
        throttlingRateLimit: 50, // 1秒あたりリクエスト数
        throttlingBurstLimit: 100, // バースト時の最大リクエスト数
      },
      defaultCorsPreflightOptions: {
        allowOrigins:
          props.stage === 'prod'
            ? ['https://dh2yk8y9mj9wl.cloudfront.net']
            : apigateway.Cors.ALL_ORIGINS,
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
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.NONE,
      },
    });

    // Cognito認証（dev+prod 両環境で有効化）
    let cognitoAuthorizer: apigateway.CognitoUserPoolsAuthorizer | undefined;
    if (props.userPool) {
      cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
        cognitoUserPools: [props.userPool],
        identitySource: 'method.request.header.Authorization',
        authorizerName: `cognito-authorizer-${props.stage}`,
      });
    }

    // Lambda統合
    const lambdaIntegration = new apigateway.LambdaIntegration(props.apiFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // CORS Headers定数（Gateway Responsesで使用）
    const CORS_HEADERS =
      "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With,Cache-Control'";
    const CORS_ORIGIN = props.stage === 'prod' ? "'https://dh2yk8y9mj9wl.cloudfront.net'" : "'*'";

    // APIリソース構造
    //
    // 【公開方針】一般公開フェーズ
    //   - 個人を識別しない集計・補助GET   : 認証不要（publicMethodOptions）
    //   - 個人データ・変更・管理・運用系  : Cognito + admin 必須（adminMethodOptions）
    //
    // 管理者向けオプション。API Gateway で Cognito 認証を必須にし、
    // admin グループの検証は Lambda 側でも必ず行う（二重防御）。
    const adminMethodOptions = cognitoAuthorizer
      ? {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
          apiKeyRequired: false, // Cognito認証使用時はAPIキー不要
        }
      : {
          apiKeyRequired: false, // 認証・APIキー共に無効化
        };

    // 公開オプション設定（読み取り専用GET）
    const publicMethodOptions = {
      authorizationType: apigateway.AuthorizationType.NONE,
      apiKeyRequired: false,
    };

    // /health (認証不要・APIキー不要)
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', lambdaIntegration, publicMethodOptions);

    // /players
    const playersResource = this.api.root.addResource('players');
    playersResource.addMethod('GET', lambdaIntegration, adminMethodOptions); // 実名一覧（管理者限定）
    playersResource.addMethod('POST', lambdaIntegration, adminMethodOptions); // 選手作成（管理者限定）

    // /players/{id}
    const playerResource = playersResource.addResource('{id}');
    playerResource.addMethod('GET', lambdaIntegration, adminMethodOptions); // 選手詳細（管理者限定）
    playerResource.addMethod('PUT', lambdaIntegration, adminMethodOptions); // 選手更新（管理者限定）
    playerResource.addMethod('DELETE', lambdaIntegration, adminMethodOptions); // 選手削除（管理者限定）

    // /players/search
    const searchResource = playersResource.addResource('search');
    searchResource.addMethod('GET', lambdaIntegration, adminMethodOptions); // 氏名検索（管理者限定）

    // /schools
    const schoolsResource = this.api.root.addResource('schools');
    schoolsResource.addMethod('GET', lambdaIntegration, publicMethodOptions); // 学校一覧（公開）

    // /schools/{school}/players
    const schoolPlayersResource = schoolsResource.addResource('{school}').addResource('players');
    schoolPlayersResource.addMethod('GET', lambdaIntegration, adminMethodOptions); // 学校別実名一覧

    // /statistics（氏名を含まない集計のみ公開）
    const statisticsResource = this.api.root.addResource('statistics');
    statisticsResource.addMethod('GET', lambdaIntegration, publicMethodOptions);

    // /years/available（選択可能な年度一覧・公開）
    // 従来は {proxy+} 経由で処理していたが、{proxy+} は認証必須のまま残すため
    // 閲覧系ページで必要なこのパスだけを明示的な公開リソースとして切り出す。
    const yearsResource = this.api.root.addResource('years');
    const availableYearsResource = yearsResource.addResource('available');
    availableYearsResource.addMethod('GET', lambdaIntegration, publicMethodOptions);

    // /scraping/trigger (運用系・認証必須)
    const scrapingResource = this.api.root.addResource('scraping');
    const triggerResource = scrapingResource.addResource('trigger');
    triggerResource.addMethod('POST', lambdaIntegration, adminMethodOptions); // スクレイピング実行
    // OPTIONSメソッドはdefaultCorsPreflightOptionsで自動的に追加される

    // /scraping/history (運用系・認証必須)
    const historyResource = scrapingResource.addResource('history');
    historyResource.addMethod('GET', lambdaIntegration, adminMethodOptions); // 履歴取得
    // OPTIONSメソッドはdefaultCorsPreflightOptionsで自動的に追加される

    // プロキシリソース追加（すべてのパスをLambdaに転送）
    // 未定義パスを無条件に公開しないよう、キャッチオールは認証必須のまま維持する。
    // 公開したいパスは上記のように明示的なリソースとして追加すること。
    const proxyResource = this.api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', lambdaIntegration, adminMethodOptions);

    // レート制限設定（Phase 3セキュリティ改善 - DDoS対策）
    // 注: 以下のUsagePlanはAPIキーが発行されていないため実効しない。
    // 実効するレート制限は deployOptions のステージレベル設定側。
    // 環境別にスロットリング設定を適用（APIキー不要モード）
    const usagePlan = this.api.addUsagePlan('ProBaseballUsagePlan', {
      name: `pro-baseball-usage-plan-${props.stage}`,
      description: `Usage plan for Pro Baseball API - ${props.stage}`,
      throttle: {
        // 環境別レート制限
        rateLimit: props.stage === 'prod' ? 50 : 100, // 1秒あたりリクエスト数
        burstLimit: props.stage === 'prod' ? 100 : 200, // バースト時の最大リクエスト数
      },
      quota: {
        // 環境別日次クォータ
        limit: props.stage === 'prod' ? 5000 : 10000, // 1日あたりの最大リクエスト数
        period: apigateway.Period.DAY,
      },
    });

    // UsagePlanをAPIステージに紐付け
    usagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

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
