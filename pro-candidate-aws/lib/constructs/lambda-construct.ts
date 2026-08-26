import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as s3deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';
import { LambdaEnvironment } from '../interfaces/types';

/**
 * Lambdaロググループの保持期間
 * 未設定だと無期限保持となりCloudWatch Logsの保管料が増え続けるため90日で打ち切る。
 */
const LOG_RETENTION = logs.RetentionDays.THREE_MONTHS;

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
        'api', // .js or .ts
        'scraping', // .js or .ts
        'dataProcessing',
        'scraping-history-service',
        'logger',
      ];
      const missingFiles = requiredFiles.filter(
        file =>
          !fs.existsSync(path.join(lambdaCodePath, `${file}.js`)) &&
          !fs.existsSync(path.join(lambdaCodePath, `${file}.ts`))
      );
      if (missingFiles.length > 0) {
        throw new Error(
          `Missing required Lambda files: ${missingFiles.join(', ')} (.js or .ts) in ${lambdaCodePath}`
        );
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('📦 Bundling enabled - files will be verified during bundling process');
    }

    const lambdaCodeOptions = useBundling
      ? {
          bundling: {
            image: lambda.Runtime.NODEJS_22_X.bundlingImage,
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
                'if [ -f package.json ] && [ ! -d node_modules ]; then npm install --production --silent --no-optional --no-package-lock; fi',
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
    this.scrapingFunction = new NodejsFunction(this, 'ScrapingFunction', {
      functionName: `pro-baseball-scraping-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(lambdaCodePath, 'scraping.ts'),
      handler: 'handler',
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
      logRetention: LOG_RETENTION,
      bundling: {
        minify: props.stage === 'prod',
        sourceMap: props.stage !== 'prod',
        externalModules: ['@aws-sdk/*'],
      },
    });

    // 2. データ処理 Lambda（X-Ray有効）
    this.dataProcessingFunction = new NodejsFunction(this, 'DataProcessingFunction', {
      functionName: `pro-baseball-processing-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(lambdaCodePath, 'dataProcessing.ts'),
      handler: 'handler',
      timeout: cdk.Duration.minutes(3),
      memorySize: 128, // 256MB → 128MB（50%コスト削減）
      environment: props.environment,
      role: lambdaRole,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: LOG_RETENTION,
      bundling: {
        minify: props.stage === 'prod',
        sourceMap: props.stage !== 'prod',
        externalModules: ['@aws-sdk/*'],
      },
    });

    // 3. API Lambda（X-Ray有効）
    // 3. API Lambda（X-Ray有効）- TypeScript (NodejsFunction)
    this.apiFunction = new NodejsFunction(this, 'ApiFunction', {
      functionName: `pro-baseball-api-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(lambdaCodePath, 'api.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 128, // 256MB → 128MB（50%コスト削減）
      // NOTE: reservedConcurrentExecutions は現状このアカウントでは設定できない。
      // 15 を指定してデプロイしたところ CloudFormation が下記で失敗した:
      //   "Specified ReservedConcurrentExecutions for function decreases account's
      //    UnreservedConcurrentExecution below its minimum value of [10]."
      // 予約後も未予約枠を10以上残す必要があるため、このアカウントの
      // Lambda 同時実行数の上限は24以下（既定の1000ではない）と判断できる。
      // 一般公開時の流量制御は API Gateway 側のステージレベルスロットリング
      // （api-gateway-construct.ts の deployOptions、50rps/バースト100）で行う。
      // 予約同時実行数を使いたい場合は Service Quotas で
      // Lambda「Concurrent executions」(L-B99A9384) の引き上げが先に必要。
      environment: props.environment,
      role: lambdaRole,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: LOG_RETENTION,
      bundling: {
        minify: props.stage === 'prod',
        sourceMap: props.stage !== 'prod',
        externalModules: ['@aws-sdk/*'], // AWS SDKは外部化（Lambda環境に含有）
      },
    });

    // タグ設定
    cdk.Tags.of(this.scrapingFunction).add('Project', 'ProBaseballScrapingSystem');
    cdk.Tags.of(this.dataProcessingFunction).add('Project', 'ProBaseballScrapingSystem');
    cdk.Tags.of(this.apiFunction).add('Project', 'ProBaseballScrapingSystem');
    cdk.Tags.of(this.scrapingFunction).add('Environment', props.stage);
    cdk.Tags.of(this.dataProcessingFunction).add('Environment', props.stage);
    cdk.Tags.of(this.apiFunction).add('Environment', props.stage);

    // EventBridge定期実行ルール（平日17:30 JST 実行）— prod のみ
    //
    // 2026-08-19: 無効（enabled: false）のままだと定期実行が一度も走らず、
    // 削除請求フローが約束している「次回スクレイピングで再取得されないこと」
    // （SCRAPING_POLICY.md 再収集の防止）を確認する機会が生まれない。
    // 一般公開に向けて有効化する（#L2）。
    // 頻度はSCRAPING_POLICY.mdの「定期実行は1日1回程度」「オフピーク時間帯」に合わせ、
    // 平日1日1回のまま変更していない。
    //
    // 2026-08-19 追加: 定期実行は prod のみに作る。dev にも同じルールがあると
    // 取得元の公式サイトへ dev/prod から二重にアクセスすることになり、
    // SCRAPING_POLICY.md の「相手サイトへの負荷を最小限にする」方針に反するため。
    // dev で定期実行の挙動を試したいときは、下の TestScrapingRule を手動で有効化する。
    //
    // 稼働期間（例: 9/1〜9/30）は Lambda 側で SSM パラメータを見て判定する。
    // ルール自体は通年で発火させ、期間外は Lambda が何もせず終了する。
    // こうすると期間の変更が SSM の書き換えだけで済み、デプロイが要らない。
    if (props.stage === 'prod') {
      const scrapingScheduleRule = new events.Rule(this, 'ScrapingScheduleRule', {
        ruleName: `pro-baseball-scraping-schedule-${props.stage}`,
        description:
          'プロ野球志望届データの定期スクレイピング（平日17:30 JST。稼働期間はSSMで指定）',
        schedule: events.Schedule.cron({
          minute: '30',
          hour: '8', // UTC 08:30 = JST 17:30（日本時間17時30分）
          month: '*',
          weekDay: 'MON-FRI', // 月曜〜金曜のみ実行
          year: '*',
        }),
        enabled: true, // 2026-08-19 有効化（#L2）。停止が必要なときはAWSコンソールで無効化できる
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
    }

    // 定期実行の稼働期間を保持するSSMパラメータ
    //
    // 既定値は空（start/end とも ""）。この状態では Lambda 側が「期間外」と判断して
    // 必ずスキップする。動かしたくなったタイミングで値を入れる、という安全側の初期状態。
    //
    //   aws ssm put-parameter --overwrite \
    //     --name /pro-candidate/prod/scraping-schedule-period \
    //     --type String \
    //     --value '{"start":"2026-09-01","end":"2026-09-30"}'
    //
    // CDK 側は初回作成のみを担当し、以後の値は運用で書き換える。
    // デプロイのたびに空へ戻すと運用中の期間設定を壊すため、
    // 値の変更は CDK の管理対象から外す意図で説明を明記しておく。
    const scrapingPeriodParameter = new ssm.StringParameter(this, 'ScrapingSchedulePeriod', {
      parameterName: `/pro-candidate/${props.stage}/scraping-schedule-period`,
      stringValue: JSON.stringify({ start: '', end: '' }),
      description:
        '定期スクレイピングの稼働期間（JST・両端を含む）。空なら実行しない。例: {"start":"2026-09-01","end":"2026-09-30"}',
      tier: ssm.ParameterTier.STANDARD,
    });

    // スクレイピングLambdaに稼働期間パラメータの読み取りを許可する
    scrapingPeriodParameter.grantRead(this.scrapingFunction);

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
      // 注意: 元のcron式はday/month/yearが全て'*'の反復スケジュールになっており、
      // 「今日1回だけ実行する」という説明文と矛盾していた（気付かずに有効化すると
      // 毎日18:00に発火し続ける）。events.Schedule（classicなEventBridge Rule）には
      // 絶対時刻を1回だけ指定するat()相当のAPIは無い（aws-events.Scheduleはcron/rate/
      // expressionのみ）ため、day/month/yearをsynth時点の具体的な日付に固定した
      // cron式にすることで真の一回限りの実行にする（AWS EventBridgeのcron式は
      // 年まで固定すれば繰り返し発火しない）。スタックをsynth/deployし直すたびに
      // new Date()が再評価され「今日」の日付に更新されるため、操作者がテストしたい
      // 日にsynth/deployして有効化する、という元の運用意図は変えていない。
      const todayForOneTimeTest = new Date();
      const todayTestRule = new events.Rule(this, 'TodayTestRule', {
        ruleName: `pro-baseball-scraping-today-${props.stage}`,
        description: '今日18:00に1回実行するテストルール',
        schedule: events.Schedule.cron({
          minute: '0',
          hour: '9', // UTC 09:00 = JST 18:00
          day: String(todayForOneTimeTest.getUTCDate()),
          month: String(todayForOneTimeTest.getUTCMonth() + 1),
          year: String(todayForOneTimeTest.getUTCFullYear()),
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
