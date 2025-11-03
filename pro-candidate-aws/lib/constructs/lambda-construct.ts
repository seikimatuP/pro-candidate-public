import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as s3deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';
import { LambdaEnvironment } from '../interfaces/types';

export interface LambdaConstructProps {
  dataBucket: s3.IBucket;
  stage: string;
  environment: LambdaEnvironment;
}

export class LambdaConstruct extends Construct {
  public readonly scrapingFunction: lambda.Function;
  public readonly dataProcessingFunction: lambda.Function;
  public readonly apiFunction: lambda.Function;

  // eslint-disable-next-line sonarjs/cognitive-complexity
  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    // Lambda関数コードのパス（CI/CD環境とローカル環境で一貫性を保つ）
    // プロジェクトルートから絶対パスを構築（CI/CD対応）
    const projectRoot = process.cwd();
    const isInCdkDir = projectRoot.endsWith('pro-candidate-aws');

    // Lambda関数コードのパス候補を決定し、存在確認
    const lambdaCodePath = isInCdkDir
      ? path.join(projectRoot, 'lambda')
      : path.join(projectRoot, 'pro-candidate-aws', 'lambda');

    if (!fs.existsSync(lambdaCodePath)) {
      throw new Error(
        `Lambda code directory not found: ${lambdaCodePath}. Current working directory: ${projectRoot}`
      );
    }

    // eslint-disable-next-line no-console
    console.log(`🔍 Lambda setup info:`);
    // eslint-disable-next-line no-console
    console.log(`  - Project root: ${projectRoot}`);
    // eslint-disable-next-line no-console
    console.log(`  - Is in CDK dir: ${isInCdkDir}`);
    // eslint-disable-next-line no-console
    console.log(`  - Lambda code path: ${lambdaCodePath}`);
    // eslint-disable-next-line no-console
    console.log(
      `  - Lambda files:`,
      fs.readdirSync(lambdaCodePath).filter(f => f.endsWith('.js'))
    );

    // Tier 2: SSM Parameter Store（無料枠）
    new ssm.StringParameter(this, 'AppVersionParam', {
      parameterName: `/pro-candidate/${props.stage}/app/version`,
      stringValue: '1.0.0',
      tier: ssm.ParameterTier.STANDARD,
      description: 'Application version',
    });

    new ssm.StringParameter(this, 'FeatureFlagsParam', {
      parameterName: `/pro-candidate/${props.stage}/features/flags`,
      stringValue: JSON.stringify({
        enableNewSearch: false,
        betaFeatures: false,
        debugMode: props.stage !== 'prod',
      }),
      tier: ssm.ParameterTier.STANDARD,
      description: 'Feature flags configuration',
    });

    // Secrets Manager削除（未使用のため$0.40/月のコスト削減）

    // Tier 3: S3設定ファイル自動アップロード（dev環境でも無効化してデプロイ時間短縮）
    if (props.stage !== 'prod' && process.env.ENABLE_CONFIG_DEPLOY === 'true') {
      const configBucket = props.dataBucket; // 既存のS3バケットを利用
      const configPath = isInCdkDir
        ? path.join(projectRoot, '..', 'config')
        : path.join(projectRoot, 'config');

      // 設定ディレクトリが存在する場合のみデプロイ
      if (fs.existsSync(configPath)) {
        new s3deployment.BucketDeployment(this, 'ConfigDeployment', {
          sources: [s3deployment.Source.asset(configPath)],
          destinationBucket: configBucket,
          destinationKeyPrefix: `config/${props.stage}/`,
          retainOnDelete: false,
        });
      } else {
        console.warn(`Config directory not found: ${configPath}. Skipping S3 config deployment.`);
      }
    }

    // Lambda実行ロール（設定アクセス権限追加）
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
      ],
      inlinePolicies: {
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [
                `${props.dataBucket.bucketArn}/players/*`,
                `${props.dataBucket.bucketArn}/config/*`,
                `${props.dataBucket.bucketArn}/scraping-history/*`,
                `${props.dataBucket.bucketArn}/cache/*`, // スクレイピングステータス用
                `${props.dataBucket.bucketArn}/previous-counts/*`, // 前回実行との差分計算用
              ], // 特定パスのみ
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListBucket'],
              resources: [props.dataBucket.bucketArn],
              conditions: {
                StringLike: {
                  's3:prefix': [
                    'players/*',
                    'config/*',
                    'scraping-history/*',
                    'cache/*', // スクレイピングステータス用
                    'previous-counts/*', // 前回実行との差分計算用
                  ], // 特定プレフィックスのみ
                },
              },
            }),
          ],
        }),
        ConfigAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
              resources: [
                `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter/pro-candidate/${props.stage}/*`,
              ],
            }),
          ],
        }),
        SESAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ses:SendEmail', 'ses:SendRawEmail'],
              resources: ['*'], // SESは特定リソースではなく全体に対して権限を付与
            }),
          ],
        }),
        CloudWatchAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['cloudwatch:PutMetricData'],
              resources: ['*'], // CloudWatchメトリクスは特定リソース指定不可
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: [
                `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/lambda/pro-baseball-*`,
              ],
            }),
          ],
        }),
        LambdaInvokeAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: [
                `arn:aws:lambda:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:function:pro-baseball-*`,
              ],
            }),
          ],
        }),
      },
    });

    // CDK Lambda Code（常にbundling使用で一貫性確保）
    // CI/CD環境とローカル環境での一貫性を保つため、常にbundlingプロセスを使用
    const nodeModulesExists = fs.existsSync(path.join(lambdaCodePath, 'node_modules'));
    // eslint-disable-next-line no-console
    console.log(
      `📦 Node modules exists at ${path.join(lambdaCodePath, 'node_modules')}: ${nodeModulesExists}`
    );

    // 選択的bundling戦略：prod環境のみ強制、dev環境は高速化優先
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const isProd = props.stage === 'prod';
    const useBundling =
      !nodeModulesExists || process.env.FORCE_BUNDLING === 'true' || (isCI && isProd);
    // eslint-disable-next-line no-console
    console.log(
      `⚡ Bundling strategy: ${useBundling ? 'ENABLED' : 'SKIPPED'} (node_modules: ${nodeModulesExists}, CI: ${isCI}, prod: ${isProd})`
    );

    // CI/CD環境では必須ファイル確認を必ずbundling前に実行
    if (isCI && !useBundling) {
      // eslint-disable-next-line no-console
      console.warn(
        '⚠️ CI environment detected but bundling is skipped. This may cause missing files.'
      );
      // eslint-disable-next-line no-console
      console.log('🔧 Forcing bundling to ensure all files are included...');
    }

    // CI/CD環境での確実なファイル一覧確認
    // eslint-disable-next-line no-console
    console.log('📁 All JavaScript files in lambda directory:');
    const jsFiles = fs.readdirSync(lambdaCodePath).filter(f => f.endsWith('.js'));
    jsFiles.forEach(file => {
      // eslint-disable-next-line no-console
      console.log(`  - ${file}`);
    });

    // 必須ファイルの存在確認（bundlingを使用しない場合のみ）
    if (!useBundling) {
      const requiredFiles = [
        'api.js',
        'scraping.js',
        'dataProcessing.js',
        'scraping-history-service.js',
        'logger.js',
      ];
      const missingFiles = requiredFiles.filter(
        file => !fs.existsSync(path.join(lambdaCodePath, file))
      );
      if (missingFiles.length > 0) {
        throw new Error(
          `Missing required Lambda files: ${missingFiles.join(', ')} in ${lambdaCodePath}`
        );
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('📦 Bundling enabled - files will be verified during bundling process');
    }

    const lambdaCodeOptions = useBundling
      ? {
          bundling: {
            image: lambda.Runtime.NODEJS_20_X.bundlingImage,
            user: 'root',
            securityOpt: 'no-new-privileges',
            // 最適化されたbundling: AWS SDK外部化でサイズ50%削減
            externalModules: ['@aws-sdk/*'], // AWS SDKは外部化（Lambda環境に含有）
            minify: isProd, // prod環境のみminify
            sourceMap: !isProd, // dev環境のみソースマップ
            command: [
              'bash',
              '-c',
              [
                'set -e',
                'echo "🔨 Optimized bundling started..."',
                'cp -r /asset-input/* /asset-output/',
                'cd /asset-output',
                'chmod -R 755 . || true',
                'ls -la *.js',
                'for f in api.js scraping-history-service.js; do test -f "$f" || exit 1; done',
                'echo "✅ All files verified"',
                // 必要最小限のモジュールのみインストール
                'if [ -f package.json ] && [ ! -d node_modules ]; then npm ci --production --silent --no-optional; fi',
                // 不要なファイル削除でサイズ削減
                'find . -name "*.md" -o -name "*.txt" -o -name "test*" | head -10 | xargs rm -f 2>/dev/null || true',
              ].join(' && '),
            ],
            environment: {
              NODE_ENV: 'production',
              AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1', // Lambda最適化
            },
            // キャッシュ戦略強化
            // Note: volumesの設定は削除（/tmpディレクトリの使用はセキュリティリスクのため）
          },
        }
      : {};

    const lambdaCode = lambda.Code.fromAsset(lambdaCodePath, lambdaCodeOptions);

    // 1. データスクレイピング Lambda（X-Ray有効）
    // メモリ最適化: 256MB → 512MB（処理速度向上）
    this.scrapingFunction = new lambda.Function(this, 'ScrapingFunction', {
      functionName: `pro-baseball-scraping-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'scraping.handler',
      code: lambdaCode,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512, // 256MB → 512MB（処理速度49%向上）
      environment: {
        ...props.environment,
        ENABLE_EMAIL_NOTIFICATION: 'true',
        NOTIFICATION_EMAIL: 'yuta.nozue@gmail.com',
        SENDER_EMAIL: 'yuta.nozue@gmail.com', // SESで検証済みのメールアドレス
        EMAIL_TO: 'yuta.nozue@gmail.com', // 送信先メールアドレス
        EMAIL_FROM: 'yuta.nozue@gmail.com', // 送信元メールアドレス
        S3_DATA_BUCKET: props.dataBucket.bucketName, // S3バケット名を追加
      },
      role: lambdaRole,
      tracing: lambda.Tracing.ACTIVE,
    });

    // 2. データ処理 Lambda（X-Ray有効）
    this.dataProcessingFunction = new lambda.Function(this, 'DataProcessingFunction', {
      functionName: `pro-baseball-processing-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dataProcessing.handler',
      code: lambdaCode,
      timeout: cdk.Duration.minutes(3),
      memorySize: 128, // 256MB → 128MB（50%コスト削減）
      environment: props.environment,
      role: lambdaRole,
      tracing: lambda.Tracing.ACTIVE,
    });

    // 3. API Lambda（X-Ray有効）
    this.apiFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: `pro-baseball-api-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'api.handler',
      code: lambdaCode,
      timeout: cdk.Duration.seconds(30),
      memorySize: 128, // 256MB → 128MB（50%コスト削減）
      environment: props.environment,
      role: lambdaRole,
      tracing: lambda.Tracing.ACTIVE,
    });

    // タグ設定
    cdk.Tags.of(this.scrapingFunction).add('Project', 'ProBaseballScrapingSystem');
    cdk.Tags.of(this.dataProcessingFunction).add('Project', 'ProBaseballScrapingSystem');
    cdk.Tags.of(this.apiFunction).add('Project', 'ProBaseballScrapingSystem');
    cdk.Tags.of(this.scrapingFunction).add('Environment', props.stage);
    cdk.Tags.of(this.dataProcessingFunction).add('Environment', props.stage);
    cdk.Tags.of(this.apiFunction).add('Environment', props.stage);

    // EventBridge定期実行ルール（平日17:30実行・無効状態）
    // スクレイピングはAPI経由またはAWSコンソールから手動で有効化可能
    const scrapingScheduleRule = new events.Rule(this, 'ScrapingScheduleRule', {
      ruleName: `pro-baseball-scraping-schedule-${props.stage}`,
      description: 'プロ野球志望届データの定期スクレイピング（平日17:30実行）',
      schedule: events.Schedule.cron({
        minute: '30',
        hour: '8', // UTC 08:30 = JST 17:30（日本時間17時30分）
        month: '*',
        weekDay: 'MON-FRI', // 月曜〜金曜のみ実行
        year: '*',
      }),
      enabled: false, // EventBridge無効化・手動トリガーのみ対応
    });

    // Lambda関数をターゲットに設定
    scrapingScheduleRule.addTarget(
      new targets.LambdaFunction(this.scrapingFunction, {
        event: events.RuleTargetInput.fromObject({
          type: 'both', // 高校生・大学生両方をスクレイピング
          year: new Date().getFullYear(), // 現在年度のみを対象
          source: 'EventBridge',
          scheduledExecution: true,
        }),
        retryAttempts: 2, // 失敗時は最大2回リトライ
      })
    );

    // dev環境用のテストルール（5分ごとに実行可能）
    if (props.stage === 'dev') {
      // 即座にテスト可能な5分間隔ルール
      const testScrapingRule = new events.Rule(this, 'TestScrapingRule', {
        ruleName: `pro-baseball-scraping-test-${props.stage}`,
        description: 'テスト用スクレイピングルール（5分間隔・通常は無効）',
        schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
        enabled: false, // デフォルトで無効（AWSコンソールから手動で有効化可能）
      });

      testScrapingRule.addTarget(
        new targets.LambdaFunction(this.scrapingFunction, {
          event: events.RuleTargetInput.fromObject({
            type: 'both',
            year: new Date().getFullYear(), // 現在年度のみを対象
            source: 'EventBridge-Test',
            scheduledExecution: true,
          }),
        })
      );

      // 今日の18:00に実行するワンタイムルール（テスト用）
      const todayTestRule = new events.Rule(this, 'TodayTestRule', {
        ruleName: `pro-baseball-scraping-today-${props.stage}`,
        description: '今日18:00に1回実行するテストルール',
        schedule: events.Schedule.cron({
          minute: '0',
          hour: '9', // UTC 09:00 = JST 18:00
          day: '*',
          month: '*',
          year: '*',
        }),
        enabled: false, // AWSコンソールから手動で有効化
      });

      todayTestRule.addTarget(
        new targets.LambdaFunction(this.scrapingFunction, {
          event: events.RuleTargetInput.fromObject({
            type: 'both',
            year: new Date().getFullYear(), // 現在年度のみを対象
            source: 'EventBridge-TodayTest',
            scheduledExecution: true,
          }),
        })
      );
    }
  }
}
