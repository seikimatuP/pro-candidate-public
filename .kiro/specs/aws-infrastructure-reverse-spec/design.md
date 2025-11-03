# Design Document

## Overview

このドキュメントは、プロ野球候補選手データ収集・分析ツールのAWS環境における既存システムの設計を詳細に記述します。本システムは、AWSサーバーレスアーキテクチャを採用し、完全無料枠内（月額$0.50以下）での運用を実現しています。

### システムの目的

- 高校生・大学生のプロ野球志望届データの自動収集
- RESTful APIによるデータアクセス提供
- Webフロントエンドによるユーザーインターフェース
- 環境分離（dev/prod）による安全な開発・運用
- Infrastructure as Codeによる再現性の確保

### 主要な技術スタック

- **インフラ管理**: AWS CDK (TypeScript)
- **コンピューティング**: AWS Lambda (Node.js 20.x)
- **ストレージ**: Amazon S3 (JSON形式)
- **API**: Amazon API Gateway (REST API)
- **認証**: Amazon Cognito
- **CDN**: Amazon CloudFront
- **監視**: Amazon CloudWatch + AWS X-Ray
- **CI/CD**: GitHub Actions

## Architecture

### システムアーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│                         ユーザー                                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CloudFront (CDN)                              │
│  - HTTPS配信                                                     │
│  - SPA対応（404→index.html）                                    │
│  - キャッシュ最適化                                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              S3 Static Website Hosting                           │
│  - React + Vite フロントエンド                                   │
│  - PWA対応                                                       │
└─────────────────────────────────────────────────────────────────┘

                 │
                 │ API呼び出し
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API Gateway (REST API)                          │
│  - CORS対応                                                      │
│  - Cognito認証統合（prod環境）                                   │
│  - X-Rayトレーシング                                             │
│  - エンドポイント:                                               │
│    /health, /players, /schools, /statistics,                    │
│    /scraping/trigger, /scraping/history, /years/available       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lambda Functions                              │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  API Function    │  │ Scraping Function│  │ Data Process │ │
│  │  (128MB)         │  │  (512MB)         │  │  (128MB)     │ │
│  │  - データ取得    │  │  - HTML解析      │  │  - データ変換│ │
│  │  - 検索処理      │  │  - S3保存        │  │  - 統計生成  │ │
│  │  - 統計計算      │  │  - 履歴記録      │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└────────────────┬────────────────┬────────────────┬─────────────┘
                 │                │                │
                 │                │                │
                 ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Amazon S3 (Data Bucket)                       │
│                                                                  │
│  players/                                                        │
│  ├── highschool/                                                │
│  │   ├── 2024.json                                             │
│  │   └── 2025.json                                             │
│  ├── university/                                                │
│  │   ├── 2024.json                                             │
│  │   └── 2025.json                                             │
│  config/                                                         │
│  ├── dev/app-config.json                                        │
│  └── prod/app-config.json                                       │
│  scraping-history/                                              │
│  ├── dev/                                                       │
│  └── prod/                                                      │
│  cache/                                                          │
│  └── scraping-status.json                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Amazon Cognito                                │
│  - User Pool (dev/prod分離)                                      │
│  - MFA対応                                                       │
│  - パスワードポリシー                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 CloudWatch + X-Ray                               │
│  - ログ集約                                                      │
│  - メトリクス監視                                                │
│  - アラーム（5個まで無料枠）                                     │
│  - 分散トレーシング                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    EventBridge                                   │
│  - 定期実行（平日17:30 JST）                                     │
│  - スクレイピング自動実行                                        │
└─────────────────────────────────────────────────────────────────┘
```

### レイヤー構造

システムは以下の論理レイヤーで構成されています：

1. **プレゼンテーション層**
   - CloudFront CDN
   - S3静的ホスティング
   - React + Vite フロントエンド

2. **API層**
   - API Gateway
   - Lambda (API Function)

3. **ビジネスロジック層**
   - Lambda (Scraping Function)
   - Lambda (Data Processing Function)

4. **データ層**
   - S3 (JSON形式)
   - 環境別バケット分離

5. **認証層**
   - Cognito User Pool
   - Cognito User Pool Client

6. **監視層**
   - CloudWatch Logs
   - CloudWatch Metrics
   - CloudWatch Alarms
   - AWS X-Ray

## Components and Interfaces

### 1. S3 Data Storage (S3Construct)

**責務**: データの永続化とバージョン管理

**主要機能**:

- 環境別バケット（`pro-candidate-data-{stage}`）
- AES-256暗号化
- バージョニング有効化
- ライフサイクルポリシー
  - 旧バージョン: 30日後削除
  - キャッシュ: 7日後削除
  - ログ: 14日後削除
  - 一時データ: 1日後削除
  - IA移行: 30日後
  - Glacier移行: 90日後

**CORS設定**:

```typescript
allowedMethods: [GET, PUT, POST];
allowedOrigins: ['*']; // 本番では特定ドメインに制限推奨
allowedHeaders: ['*'];
maxAge: 3000;
```

**セキュリティ**:

- publicReadAccess: false
- blockPublicAccess: BLOCK_ALL
- encryption: S3_MANAGED

### 2. Lambda Functions (LambdaConstruct)

#### 2.1 Scraping Function

**責務**: Webスクレイピングとデータ収集

**設定**:

- Runtime: Node.js 20.x
- Memory: 512MB（処理速度49%向上）
- Timeout: 5分
- Handler: `scraping.handler`

**環境変数**:

```typescript
S3_DATA_BUCKET: バケット名;
CACHE_TTL: '43200'; // 12時間
LOG_LEVEL: 'DEBUG' | 'WARN';
ENVIRONMENT: 'dev' | 'prod';
ENABLE_EMAIL_NOTIFICATION: 'true';
NOTIFICATION_EMAIL: 'yuta.nozue@gmail.com';
```

**主要処理フロー**:

1. 実行制限チェック（prod環境、Frontend実行時のみ1日1回）
2. S3から設定ファイル読み込み
3. 年度パラメータ検証（2020-現在年+1）
4. HTMLデータ取得（fetch）
5. cheerioによるHTML解析
6. データ抽出・変換
7. S3保存
8. 履歴記録（正常終了時のみ）
9. メール通知（EventBridge実行時のみ）

**スクレイピング対象**:

- 高校生: `https://www.jhbf.or.jp/pro-aspiring/{year}.html`
  - 2番目のテーブル（ドラフト対象者）を抽出
  - ※印の選手を除外
- 大学生: `https://www.jubf.net/system/prog/procandidate.php?kind=all&year={year}`
  - 最初のテーブル（ドラフト対象者）を抽出
  - ※印の選手を除外

#### 2.2 API Function

**責務**: RESTful APIエンドポイント提供

**設定**:

- Runtime: Node.js 20.x
- Memory: 128MB（50%コスト削減）
- Timeout: 30秒
- Handler: `api.handler`

**エンドポイント**:

| エンドポイント                       | メソッド | 説明                                         | 認証     |
| ------------------------------------ | -------- | -------------------------------------------- | -------- |
| `/health`                            | GET      | ヘルスチェック                               | 不要     |
| `/players`                           | GET      | 選手データ取得（全体または年度・タイプ指定） | 環境依存 |
| `/players?type=highschool&year=2024` | GET      | 2024年度高校生データ                         | 環境依存 |
| `/players?type=university&year=2024` | GET      | 2024年度大学生データ                         | 環境依存 |
| `/schools`                           | GET      | 学校一覧                                     | 環境依存 |
| `/statistics`                        | GET      | 統計情報                                     | 環境依存 |
| `/years/available`                   | GET      | 利用可能年度リスト                           | 環境依存 |
| `/scraping/trigger`                  | POST     | スクレイピング実行                           | 環境依存 |
| `/scraping/history`                  | GET      | スクレイピング履歴                           | 環境依存 |

**レスポンスヘッダー**:

```typescript
'Content-Type': 'application/json'
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control'
'Cache-Control': 'no-cache, no-store, must-revalidate'
'Pragma': 'no-cache'
'Expires': '0'
```

#### 2.3 Data Processing Function

**責務**: データ変換と統計生成

**設定**:

- Runtime: Node.js 20.x
- Memory: 128MB（50%コスト削減）
- Timeout: 3分
- Handler: `dataProcessing.handler`

**IAM権限**:

```typescript
S3Access:
  - s3:GetObject, s3:PutObject, s3:DeleteObject
  - Resources: players/*, config/*, scraping-history/*, cache/*, previous-counts/*
  - s3:ListBucket (特定プレフィックスのみ)

ConfigAccess:
  - ssm:GetParameter, ssm:GetParameters, ssm:GetParametersByPath
  - Resources: /pro-candidate/{stage}/*

SESAccess:
  - ses:SendEmail, ses:SendRawEmail

CloudWatchAccess:
  - cloudwatch:PutMetricData
  - logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents

LambdaInvokeAccess:
  - lambda:InvokeFunction
  - Resources: pro-baseball-*
```

### 3. API Gateway (ApiGatewayConstruct)

**責務**: HTTPエンドポイント提供とルーティング

**設定**:

- Type: REST API
- Stage: dev | prod
- Tracing: X-Ray有効
- CORS: 全オリジン許可（本番では制限推奨）

**リソース構造**:

```
/
├── health (GET)
├── players
│   ├── GET (全選手取得)
│   ├── POST (選手作成)
│   ├── {id}
│   │   ├── GET (選手詳細)
│   │   ├── PUT (選手更新)
│   │   └── DELETE (選手削除)
│   └── search (GET)
├── schools
│   ├── GET (学校一覧)
│   └── {school}
│       └── players (GET)
├── scraping
│   ├── trigger (POST)
│   └── history (GET)
└── {proxy+} (ANY) - すべてのパスをLambdaに転送
```

**Gateway Responses（CORS対応）**:

- UnauthorizedResponse (401)
- ForbiddenResponse (403)

### 4. Cognito Authentication (CognitoConstruct)

**責務**: ユーザー認証・認可

**User Pool設定**:

```typescript
userPoolName: `pro-candidate-{stage}-user-pool`
signInAliases: { email: true, username: true }
selfSignUpEnabled: true
autoVerify: { email: true }
mfa: OPTIONAL
mfaSecondFactor: { sms: true, otp: true }
accountRecovery: EMAIL_ONLY
```

**パスワードポリシー**:

```typescript
minLength: 8;
requireLowercase: true;
requireUppercase: true;
requireDigits: true;
requireSymbols: true;
```

**User Pool Client設定**:

```typescript
authFlows: {
  userPassword: true,
  userSrp: true,
  custom: true,
  adminUserPassword: true
}
accessTokenValidity: 1時間
idTokenValidity: 1時間
refreshTokenValidity: 30日
```

**OAuth設定**:

```typescript
flows: {
  authorizationCodeGrant: true;
}
scopes: [EMAIL, OPENID, PROFILE];
callbackUrls: ['{frontendUrl}/auth/callback', 'http://localhost:5173/auth/callback'];
logoutUrls: ['{frontendUrl}/auth/logout', 'http://localhost:5173/auth/logout'];
```

**User Pool Domain**:

```
cognitoDomain: `pro-candidate-{stage}-auth`
```

### 5. CloudFront CDN (CloudFrontConstruct)

**責務**: コンテンツ配信とHTTPS化

**設定**:

```typescript
defaultBehavior: {
  origin: S3Origin(OAI使用);
  viewerProtocolPolicy: REDIRECT_TO_HTTPS;
  allowedMethods: ALLOW_GET_HEAD;
  cachedMethods: CACHE_GET_HEAD;
  compress: true;
  cachePolicy: CACHING_OPTIMIZED;
}
defaultRootObject: 'index.html';
priceClass: PRICE_CLASS_100; // 無料枠最適化
```

**エラーレスポンス（SPA対応）**:

```typescript
404 → 200 (index.html) - TTL: 300秒
403 → 200 (index.html) - TTL: 300秒
```

**Origin Access Identity**:

- S3バケットへの読み取り権限付与
- 直接S3アクセスをブロック

### 6. Monitoring (MonitoringConstruct)

**責務**: システム監視とアラート

**SNS Topic**:

```typescript
topicName: `pro-baseball-alerts-{stage}`;
subscription: EmailSubscription(alertEmail);
```

**CloudWatch Dashboard**:

```typescript
dashboardName: `ProCandidate-Overview-{stage}`
widgets:
  - Lambda実行状況（Invocations, Errors）
  - Lambda実行時間（Duration: Average, Maximum）
  - 同時実行数（ConcurrentExecutions）
  - 推定コスト（EstimatedCharges）
```

**CloudWatch Alarms（無料枠5個まで）**:

1. **Critical Lambda Errors**
   - Metric: 統合Lambdaエラー（scraping + api + data）
   - Threshold: 10エラー/5分
   - Action: SNS通知

2. **Cost Alarm**
   - Metric: EstimatedCharges
   - Threshold: $0.50
   - Action: SNS通知

3. **Free Tier Usage Alarm**
   - Metric: Lambda実行回数 / 100万 \* 100
   - Threshold: 80%
   - Action: SNS通知

**X-Ray Tracing**:

- 全Lambda関数で有効化
- API Gatewayで有効化
- サービスマップ自動生成

**Config Rules & Security Hub**:

- 完全無効化（コスト削減: $23-37/月）
- S3バケットポリシーとIAMで代替

### 7. EventBridge Scheduler

**責務**: 定期実行スケジューリング

**本番スケジュール**:

```typescript
ruleName: `pro-baseball-scraping-schedule-{stage}`
schedule: cron(30 8 * * MON-FRI *)  // UTC 08:30 = JST 17:30
enabled: true  // dev/prod両環境で有効
target: ScrapingFunction
payload: {
  type: 'both',
  year: 現在年度,
  source: 'EventBridge',
  scheduledExecution: true
}
retryAttempts: 2
```

**dev環境テストルール**:

```typescript
// 5分間隔テストルール（デフォルト無効）
ruleName: `pro-baseball-scraping-test-{stage}`
schedule: rate(5 minutes)
enabled: false  // AWSコンソールから手動有効化

// 今日18:00ワンタイムルール（デフォルト無効）
ruleName: `pro-baseball-scraping-today-{stage}`
schedule: cron(0 9 * * * *)  // UTC 09:00 = JST 18:00
enabled: false  // AWSコンソールから手動有効化
```

## Data Models

### PlayerData

選手データの主要インターフェース

```typescript
interface PlayerData {
  id: string; // UUID v4
  name: string; // 選手名
  school: string; // 学校名
  type: 'highschool' | 'university'; // タイプ
  year: number; // 年度
  prefecture?: string; // 都道府県（高校生）
  region?: string; // 地域（大学生）
  filingDate: string; // 提出日（ISO 8601）
  isDraftEligible: boolean; // ドラフト対象フラグ
  createdAt: string; // 作成日時（ISO 8601）
  updatedAt: string; // 更新日時（ISO 8601）

  // 大学生専用フィールド
  originalName?: string; // 元の名前（ふりがななし）
  originalRegion?: string; // 元の地域情報
  furigana?: string; // ふりがな
}
```

### PlayersDataFile

S3ファイル形式のメタデータ付きJSON構造

```typescript
interface PlayersDataFile {
  metadata: {
    year: number; // 年度
    type: 'highschool' | 'university'; // タイプ
    totalCount: number; // 総件数
    lastUpdated: string; // 最終更新日時（ISO 8601）
    version: string; // データバージョン
  };
  players: PlayerData[]; // 選手データ配列
}
```

### ScrapingHistoryRecord

スクレイピング履歴レコード

```typescript
interface ScrapingHistoryRecord {
  id: string; // 履歴ID
  timestamp: string; // 実行日時（ISO 8601）
  type: 'highschool' | 'university' | 'both'; // タイプ
  year: number; // 年度
  environment: 'dev' | 'prod'; // 環境
  success: boolean; // 成功フラグ
  count: number; // 取得件数
  duration: number; // 実行時間（秒）
  daysSinceLastUpdate?: number; // 前回実行からの経過日数
  differences: {
    // 差分情報
    [key: string]: {
      newPlayers: number; // 新規選手数
      deletedPlayers: number; // 削除選手数
      newPlayersList?: PlayerData[]; // 新規選手リスト
      deletedPlayersList?: PlayerData[]; // 削除選手リスト
    };
  };
  message?: string; // メッセージ
  error?: string; // エラーメッセージ
}
```

### ScrapingConfig

スクレイピング設定（S3: config/{stage}/app-config.json）

```typescript
interface ScrapingConfig {
  metadata: {
    version: string; // 設定バージョン
    source: string; // 設定ソース
    lastUpdated: string; // 最終更新日時
  };
  scraping: {
    urls: {
      highschool: string; // 高校生URL
      university: string; // 大学生URL
    };
    settings: {
      timeout: number; // タイムアウト（ミリ秒）
      userAgent: string; // User-Agent
      retryCount: number; // リトライ回数
    };
  };
}
```

## Error Handling

### エラー分類

1. **HTTP Errors**
   - 404: データ未公開（正常終了として扱う）
   - 500: サーバーエラー（リトライ）
   - Timeout: タイムアウト（リトライ）

2. **Validation Errors**
   - 年度範囲外（2020-現在年+1）
   - 不正なタイプ指定
   - 空データ・不正データ

3. **S3 Errors**
   - NoSuchKey: ファイル不存在（空配列返却）
   - AccessDenied: 権限エラー（500エラー）
   - PutObject失敗: 保存エラー（500エラー）

4. **Lambda Errors**
   - Timeout: 実行時間超過
   - OutOfMemory: メモリ不足
   - ConcurrentExecutions: 同時実行数超過

### エラーハンドリング戦略

**スクレイピング関数**:

```typescript
try {
  // スクレイピング処理
  const players = await scrapeData(url);
  await saveToS3(players);
  await recordHistory(players); // 正常終了時のみ
  return { success: true, count: players.length };
} catch (error) {
  if (error.message.includes('404')) {
    // データ未公開は正常終了
    return { success: true, count: 0, dataAvailable: false };
  }
  log.error('Scraping error:', error);
  return { success: false, error: error.message };
}
```

**API関数**:

```typescript
try {
  const data = await s3Client.send(new GetObjectCommand({...}));
  return { statusCode: 200, body: JSON.stringify(data) };
} catch (error) {
  if (error.name === 'NoSuchKey') {
    // ファイル不存在は空配列返却
    return { statusCode: 200, body: JSON.stringify({ data: [], count: 0 }) };
  }
  log.error('API error:', error);
  return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
}
```

### ロギング戦略

**ログレベル**:

```typescript
enum LogLevel {
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}
```

**構造化ログ**:

```typescript
log.info('Message', {
  context: 'additional data',
  timestamp: new Date().toISOString(),
  environment: process.env.ENVIRONMENT,
});
```

**CloudWatch Logs保持期間**:

- dev環境: 7日
- prod環境: 30日

## Testing Strategy

### ユニットテスト

**対象**:

- データ解析ロジック（parseHighschoolData, parseUniversityData）
- 日付変換（parseDate）
- バリデーション（年度範囲チェック）

**ツール**: Jest

### 統合テスト

**対象**:

- Lambda関数の実行
- S3データ保存・取得
- API Gateway統合

**ツール**: Jest + AWS SDK Mock

### E2Eテスト

**対象**:

- フロントエンドUI
- API呼び出し
- 認証フロー
- スクレイピング実行

**ツール**: Playwright

**環境別テスト**:

```bash
npm run test:e2e:local   # local環境
npm run test:e2e:dev     # dev環境
npm run test:e2e:prod    # prod環境
npm run test:e2e:api:dev # API専用（高速）
```

### パフォーマンステスト

**メトリクス**:

- Lambda実行時間
- メモリ使用量
- API応答時間
- スクレイピング処理時間

**目標値**:

- API応答: < 1秒
- スクレイピング: < 3分
- メモリ使用: < 80%

## Deployment Strategy

### CI/CD Pipeline (GitHub Actions)

**トリガー**:

- develop ブランチ push → dev環境デプロイ
- タグ (v1.x.x) push → prod環境デプロイ

**ワークフロー**:

1. **品質チェック**

   ```yaml
   - TypeScript コンパイル
   - ESLint チェック
   - Jest テスト実行
   ```

2. **インフラデプロイ**

   ```yaml
   - CDK synth
   - CDK diff
   - CDK deploy
   ```

3. **フロントエンドデプロイ**

   ```yaml
   - CloudFormation Outputs取得
   - 環境変数生成
   - Vite ビルド
   - S3 アップロード
   ```

4. **検証**
   ```yaml
   - Lambda環境変数検証
   - API ヘルスチェック
   - E2E テスト実行
   ```

### 環境別設定

**dev環境**:

- 認証: 無効
- ログレベル: DEBUG
- EventBridge: 有効（テスト用5分間隔ルールあり）
- コストアラーム: $0.50

**prod環境**:

- 認証: Cognito必須
- ログレベル: WARN
- EventBridge: 有効（平日17:30実行）
- コストアラーム: $0.50
- 1日1回実行制限: 有効（Frontend実行時のみ）

### ロールバック戦略

**CloudFormation**:

- 自動ロールバック有効
- スタック更新失敗時に前バージョンに復元

**Lambda**:

- バージョニング有効
- エイリアス使用（$LATEST）

**S3**:

- バージョニング有効
- 30日間の旧バージョン保持

## Security Considerations

### データ保護

- S3暗号化: AES-256
- 転送中の暗号化: HTTPS/TLS
- バージョニング: 有効
- パブリックアクセス: 完全ブロック

### アクセス制御

- IAM最小権限の原則
- Lambda実行ロール: 特定リソースのみアクセス
- S3バケットポリシー: 特定プレフィックスのみ
- Cognito認証: prod環境で必須

### 監視・監査

- CloudWatch Logs: 全Lambda関数
- X-Ray Tracing: 分散トレーシング
- CloudWatch Alarms: 異常検知
- SNS通知: リアルタイムアラート

### コンプライアンス

- GDPR: 個人データ最小化
- データ保持期間: ライフサイクルポリシー
- アクセスログ: CloudWatch Logs

## Cost Optimization

### 無料枠活用

**Lambda**:

- 100万リクエスト/月
- 400,000 GB-秒/月
- 実績: 月間数千リクエスト（< 1%使用）

**S3**:

- 5GB標準ストレージ
- 20,000 GETリクエスト
- 2,000 PUTリクエスト
- 実績: < 1GB使用

**CloudFront**:

- 100GB データ転送/月
- 200万 HTTPSリクエスト/月
- 実績: < 10GB使用

**API Gateway**:

- 100万 APIコール/月
- 実績: 数千コール/月

**CloudWatch**:

- 5 アラーム
- 10 メトリクス
- 5GB ログ取り込み
- 実績: 3アラーム、< 1GB ログ

### コスト削減施策

1. **Lambda最適化**
   - Scraping: 256MB → 512MB（処理速度向上）
   - API: 256MB → 128MB（50%削減）
   - Data Processing: 256MB → 128MB（50%削減）

2. **不要サービス無効化**
   - AWS Config: 無効（$8-12/月削減）
   - Security Hub: 無効（$15-25/月削減）
   - Secrets Manager: 無効（$0.40/月削減）

3. **ライフサイクル管理**
   - 旧バージョン: 30日後削除
   - キャッシュ: 7日後削除
   - ログ: 14日後削除
   - IA移行: 30日後
   - Glacier移行: 90日後

4. **実行制限**
   - prod環境: 1日1回制限（Frontend実行時）
   - EventBridge: 平日のみ実行

**月額コスト実績**: $0.00 - $0.50（完全無料枠内）

## Performance Optimization

### Lambda最適化

- Node.js 20.x使用
- AWS SDK外部化（Lambda環境に含有）
- Minify: prod環境のみ
- SourceMap: dev環境のみ
- 接続再利用: `AWS_NODEJS_CONNECTION_REUSE_ENABLED=1`

### キャッシュ戦略

**CloudFront**:

- 静的アセット: 31536000秒（1年）
- HTML/JS: 300秒（5分）

**API**:

- Cache-Control: no-cache（常に最新データ）

**S3**:

- スクレイピングステータス: 12時間TTL

### 並列処理

```typescript
// 高校生・大学生データの並列取得
const [highschoolResult, universityResult] = await Promise.all([
  scrapeHighschoolPlayers(year, config),
  scrapeUniversityPlayers(year, config),
]);
```

### メモリ使用量監視

```typescript
await monitoring.recordMemoryUsage();
await monitoring.measureOperation('ScrapeHighschool', () => scrapeHighschoolPlayers(year, config));
```

## Maintenance and Operations

### 日常運用

**監視項目**:

- CloudWatch Dashboard確認
- Lambda実行状況
- エラー率
- コスト使用量

**定期タスク**:

- 週次: ログ確認
- 月次: コストレビュー
- 四半期: セキュリティレビュー

### トラブルシューティング

**Lambda環境検証**:

```bash
scripts/verify-lambda-environment.sh dev
scripts/verify-lambda-environment.sh prod
```

**ログ確認**:

```bash
aws logs tail /aws/lambda/pro-baseball-scraping-dev --follow
```

**メトリクス確認**:

- CloudWatch Dashboard
- X-Ray Service Map

### バックアップ・復旧

**S3バージョニング**:

- 自動バックアップ（30日保持）
- 手動復元可能

**CloudFormation**:

- スタック定義保存
- `cdk deploy`で再構築可能

**設定ファイル**:

- Git管理
- S3バックアップ

## Future Enhancements

### 短期（1-3ヶ月）

- [ ] Cognito認証の完全有効化（prod環境）
- [ ] カスタムドメイン設定（Route 53 + ACM）
- [ ] データエクスポート機能（CSV/Excel）
- [ ] 高度な検索機能（複数条件）

### 中期（3-6ヶ月）

- [ ] リアルタイム通知（WebSocket）
- [ ] データ分析ダッシュボード強化
- [ ] 機械学習予測機能
- [ ] マルチリージョン対応

### 長期（6-12ヶ月）

- [ ] GraphQL API対応
- [ ] モバイルアプリ開発
- [ ] データレイク構築
- [ ] AI支援分析機能
