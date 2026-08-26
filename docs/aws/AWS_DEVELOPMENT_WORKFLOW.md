# AWS開発ワークフロー・デプロイメントガイド

## プロ野球志望届システム AWS環境専用開発プロセス

**最終更新**: 2025-06-09  
**対象**: AWS環境（dev・prod）デプロイ・テスト・運用

---

## 📋 AWS環境構成

### 環境一覧

- **dev環境**: AWS Lambda + S3 + API Gateway + Cognito認証（開発用）
- **prod環境**: AWS Lambda + S3 + API Gateway + Cognito認証（本番運用）

### API の公開範囲（dev / prod 共通）

API Gateway の Cognito authorizer は **dev / prod の両方**で有効。実名を含むAPI
（`/players` 系・`/schools/{school}/players`・`/scraping/*`・`{proxy+}`）は
ログインに加えて ID トークンの `cognito:groups` に `admin` が必要
（Lambda 側でも検証する二重防御）。

認証不要（公開）なのは次の4本だけ。

- `GET /health`
- `GET /statistics`（氏名・学校名を含まない集計のみ）
- `GET /schools`
- `GET /years/available`

管理者アカウントの用意は [Cognito 管理者セットアップ](COGNITO_ADMIN_SETUP.md) を参照。

### 前提条件

```bash
# 必要ツール
aws --version     # AWS CLI v2
cdk --version     # AWS CDK v2
node --version    # v18.x以上（CDK用）

# AWS認証情報設定確認
aws sts get-caller-identity
# {
#     "UserId": "AIDACKCEVSQ6C2EXAMPLE",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/DevUser"
# }
```

---

## 🔄 AWS開発ワークフロー

### Phase 1: CDK準備・ローカルテスト

#### 1.1 CDK環境セットアップ

```bash
# CDK依存関係インストール
cd pro-candidate-aws
npm install

# AWS CDK Bootstrap（初回のみ）
cdk bootstrap aws://123456789012/ap-northeast-1
# ⏳ Bootstrapping environment aws://123456789012/ap-northeast-1...
# ✅ Environment aws://123456789012/ap-northeast-1 bootstrapped

# CDK設定確認
cdk ls
# ProBaseballStack-dev
# ProBaseballStack-prod
```

#### 1.2 Lambda関数ローカルテスト

```bash
# Lambda依存関係インストール
cd lambda
npm install

# 関数単体テスト
node -e "
const { handler } = require('./api.js');
handler({
  httpMethod: 'GET',
  path: '/health'
}, {}, (err, result) => {
  console.log('Result:', JSON.stringify(result, null, 2));
});
"
# Result: {
#   "statusCode": 200,
#   "body": "{\"status\":\"healthy\",\"timestamp\":\"2025-06-09T12:00:00.000Z\"}"
# }

# スクレイピング関数テスト
node -e "
const { handler } = require('./scraping.js');
handler({ test: true }, {}, (err, result) => {
  console.log('Scraping Result:', JSON.stringify(result, null, 2));
});
"
```

#### 1.3 アプリケーションテスト・品質チェック

```bash
# プロジェクトルートに戻る
cd ..

# 包括的テスト実行
npm test                    # 全テスト実行（Jest）
# Test Suites: 15 passed, 15 total
# Tests:       382 passed, 382 total
# Snapshots:   12 passed, 12 total
# Time:        45.123 s

# テスト種別実行
npm run test:unit          # ユニットテストのみ
npm run test:integration   # 統合テストのみ
npm run test:snapshot      # スナップショットテスト
npm run test:e2e          # エンドツーエンドテスト

# カバレッジ付きテスト
npm run test:coverage
# Coverage summary in coverage/lcov-report/index.html
# Statements   : 85.67% ( 2156/2517 )
# Branches     : 78.45% ( 891/1136 )
# Functions    : 92.13% ( 412/447 )
# Lines        : 86.23% ( 2089/2423 )

# 高速テスト（最適化設定）
npm run test:fast
npm run test:parallel

# コード品質チェック
npm run lint               # ESLint実行
npm run lint:fix          # 自動修正
npm run format            # Prettierフォーマット

# 包括的品質チェック
npm run quality-check     # lint + test + analyze
```

#### 1.4 CDK構文チェック

```bash
# CDKディレクトリに移動
cd pro-candidate-aws

# CDK TypeScript型チェック
npx tsc --noEmit

# CDK構文検証
cdk synth ProBaseballStack-dev > /dev/null
echo "CDK構文チェック完了"

# CDK リソース確認
cdk synth ProBaseballStack-dev --json | jq '.Resources | keys'
# [
#   "ApiGatewayRestApi",
#   "LambdaFunction",
#   "S3Bucket",
#   "CognitoUserPool"
# ]
```

### Phase 2: dev環境デプロイ・統合テスト

#### 2.1 dev環境デプロイ

```bash
# デプロイ差分確認
cdk diff ProBaseballStack-dev
# Stack ProBaseballStack-dev
# Resources
# [+] AWS::Lambda::Function ScrapingFunction
# [+] AWS::S3::Bucket DataBucket

# dev環境デプロイ実行
cdk deploy ProBaseballStack-dev --require-approval never
# ✨ Deployment time: 63.21s
# ✅ ProBaseballStack-dev
#
# Outputs:
# ProBaseballStack-dev.ApiEndpoint = https://abc123def4.execute-api.ap-northeast-1.amazonaws.com/prod/
# ProBaseballStack-dev.FrontendUrl = http://pro-candidate-frontend-dev.s3-website-ap-northeast-1.amazonaws.com/
# ProBaseballStack-dev.S3DataBucketName = pro-candidate-data-dev
# ProBaseballStack-dev.ScrapingFunctionName = pro-baseball-scraping-dev

# デプロイ結果確認
aws cloudformation describe-stacks --stack-name ProBaseballStack-dev --query 'Stacks[0].StackStatus'
# "CREATE_COMPLETE"
```

#### 2.2 フロントエンドAWS S3デプロイ

```bash
cd ../frontend

# 本番ビルド（dev環境設定）
npm run build
# vite v5.0.8 building for production...
# ✓ 257 modules transformed.
# dist/index.html                  0.45 kB │ gzip:  0.30 kB
# dist/assets/index-abc123.js    127.32 kB │ gzip: 41.25 kB

# S3バケット存在確認
aws s3 ls s3://pro-candidate-frontend-dev/
# PRE assets/
# PRE icons/
# 2025-06-09 12:00:00        450 index.html

# S3へアップロード
aws s3 sync dist/ s3://pro-candidate-frontend-dev --delete --cache-control max-age=31536000
# upload: dist/index.html to s3://pro-candidate-frontend-dev/index.html
# upload: dist/assets/index-abc123.js to s3://pro-candidate-frontend-dev/assets/index-abc123.js
# delete: s3://pro-candidate-frontend-dev/assets/index-old123.js

# S3 Webサイト設定確認
aws s3api get-bucket-website --bucket pro-candidate-frontend-dev
# {
#     "IndexDocument": {
#         "Suffix": "index.html"
#     },
#     "ErrorDocument": {
#         "Key": "index.html"
#     }
# }
```

#### 2.3 dev環境統合テスト

```bash
# API Gateway ヘルスチェック
curl -X GET "https://abc123def4.execute-api.ap-northeast-1.amazonaws.com/prod/health"
# {"status":"healthy","timestamp":"2025-06-09T12:00:00.000Z","environment":"dev"}

# Players API動作確認（dev でも認証必須。ヘッダー無しは401）
curl -X GET "https://abc123def4.execute-api.ap-northeast-1.amazonaws.com/prod/players" \
  -H "Content-Type: application/json"
# {"message":"Unauthorized"}
# HTTP Status: 401

# 認証付きで叩く場合は Cognito の ID トークンを Authorization ヘッダーに付ける
curl -X GET "https://abc123def4.execute-api.ap-northeast-1.amazonaws.com/prod/players" \
  -H "Authorization: $ID_TOKEN"
# {"players":[],"total":0,"environment":"dev","message":"No data available"}
# ※ admin グループに居ない場合は 403 になる

# Lambda関数直接実行テスト
aws lambda invoke \
  --function-name pro-baseball-scraping-dev \
  --payload '{"test": true}' \
  --cli-binary-format raw-in-base64-out \
  dev-response.json

cat dev-response.json
# {"statusCode":200,"body":"{\"message\":\"Test execution successful\",\"timestamp\":\"2025-06-09T12:00:00.000Z\",\"environment\":\"dev\"}"}

# Lambda関数ログ確認
aws logs tail /aws/lambda/pro-baseball-scraping-dev --follow --since 5m
# 2025-06-09T12:00:00.000000+00:00 2025/06/09/[$LATEST]abc123 START RequestId: abc-123-def
# 2025-06-09T12:00:00.100000+00:00 2025/06/09/[$LATEST]abc123 [INFO] Function started
# 2025-06-09T12:00:00.500000+00:00 2025/06/09/[$LATEST]abc123 END RequestId: abc-123-def

# S3データバケット確認
aws s3 ls s3://pro-candidate-data-dev/ --recursive
# PRE cache/
# PRE players/
# PRE config/

# フロントエンドアクセス確認
echo "dev環境フロントエンドURL: http://pro-candidate-frontend-dev.s3-website-ap-northeast-1.amazonaws.com/"
```

### Phase 3: prod環境リリース

#### 3.1 prod環境デプロイ準備

```bash
# 本番デプロイ前テスト実行
cd ..  # プロジェクトルートに移動
npm run test:coverage      # カバレッジ付きテスト
npm run lint              # コード品質チェック

# テスト結果確認（96%以上の成功率確保）
echo "テスト成功率96%以上・ESLint警告なしを確認"

# 本番デプロイ前差分確認
cd pro-candidate-aws
cdk diff ProBaseballStack-prod
# Stack ProBaseballStack-prod
# Resources
# [~] AWS::Lambda::Function pro-baseball-scraping-prod
#     └─ [~] Code
#         └─ [~] .S3Key: "asset.abc123..." => "asset.def456..."
# [~] AWS::Cognito::UserPool ProBaseballUserPool-prod
#     └─ [~] UserPoolTags
#         └─ [~] .Version: "v1.1.0" => "v1.2.0"

# リソース制限確認
aws service-quotas get-service-quota \
  --service-code lambda \
  --quota-code L-B99A9384
# CurrentValue: 10 (同時実行関数数)

# IAM権限確認
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/DevUser \
  --action-names lambda:UpdateFunctionCode \
  --resource-arns arn:aws:lambda:ap-northeast-1:123456789012:function:pro-baseball-*
```

#### 3.2 prod環境デプロイ実行

```bash
# 本番デプロイ（認証付き）
cdk deploy ProBaseballStack-prod --require-approval never
# ✨ Deployment time: 89.45s
# ✅ ProBaseballStack-prod
#
# Outputs:
# ProBaseballStack-prod.ApiEndpoint = https://xyz789abc1.execute-api.ap-northeast-1.amazonaws.com/prod/
# ProBaseballStack-prod.FrontendUrl = http://pro-candidate-frontend-prod.s3-website-ap-northeast-1.amazonaws.com/
# ProBaseballStack-prod.CognitoUserPoolId = ap-northeast-1_prodPoolId
# ProBaseballStack-prod.CognitoClientId = prodclientidxxxxxxxxxxxxxx
# ProBaseballStack-prod.S3DataBucketName = pro-candidate-data-prod

# デプロイ状態確認
aws cloudformation describe-stacks \
  --stack-name ProBaseballStack-prod \
  --query 'Stacks[0].{Status:StackStatus,LastUpdated:LastUpdatedTime}'
# {
#     "Status": "UPDATE_COMPLETE",
#     "LastUpdated": "2025-06-09T12:05:30.123000+00:00"
# }

# Lambda関数設定確認
aws lambda get-function-configuration --function-name pro-baseball-scraping-prod
# {
#     "FunctionName": "pro-baseball-scraping-prod",
#     "Runtime": "nodejs18.x",
#     "MemorySize": 512,
#     "Timeout": 300,
#     "Environment": {
#         "Variables": {
#             "STAGE": "prod",
#             "S3_DATA_BUCKET": "pro-candidate-data-prod"
#         }
#     }
# }
```

#### 3.3 prod環境フロントエンドデプロイ

```bash
cd ../frontend

# 本番ビルド（認証有効・prod環境設定）
npm run build
# vite v5.0.8 building for production...
# ✓ 312 modules transformed. (認証コンポーネント含む)
# dist/index.html                  0.52 kB │ gzip:  0.35 kB
# dist/assets/index-xyz789.js    145.67 kB │ gzip: 47.89 kB

# prod環境固有設定確認
grep -r "ap-northeast-1_prodPoolId" dist/assets/
# dist/assets/index-xyz789.js:cognitoUserPoolId:"ap-northeast-1_prodPoolId"

# S3へアップロード（prod環境）
aws s3 sync dist/ s3://pro-candidate-frontend-prod --delete \
  --cache-control max-age=31536000 \
  --metadata-directive REPLACE
# upload: dist/index.html to s3://pro-candidate-frontend-prod/index.html
# upload: dist/assets/index-xyz789.js to s3://pro-candidate-frontend-prod/assets/index-xyz789.js

# CloudFront無効化（使用している場合）
# aws cloudfront create-invalidation \
#   --distribution-id E123456789ABCD \
#   --paths "/*"
```

### Phase 4: prod環境テスト・検証

#### 4.1 API・Lambda機能テスト

```bash
# prod API Gateway ヘルスチェック
curl -X GET "https://xyz789abc1.execute-api.ap-northeast-1.amazonaws.com/prod/health"
# {"status":"healthy","timestamp":"2025-06-09T12:10:00.000Z","environment":"prod"}

# Players API詳細テスト（認証必須。ID トークンが無いと401）
curl -X GET "https://xyz789abc1.execute-api.ap-northeast-1.amazonaws.com/prod/players" \
  -H "Content-Type: application/json" \
  -H "Authorization: $ID_TOKEN" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
# {"players":[...],"total":200,"environment":"prod"}
# HTTP Status: 200
# Response Time: 0.245s
# ※ Authorization ヘッダー無し → 401 / admin グループ未所属 → 403

# Lambda関数prod環境実行テスト
aws lambda invoke \
  --function-name pro-baseball-scraping-prod \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  prod-response.json

cat prod-response.json
# {"statusCode":200,"body":"{\"message\":\"Production execution successful\",\"timestamp\":\"2025-06-09T12:10:00.000Z\",\"environment\":\"prod\"}"}

# Lambda実行時間・メモリ使用量確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/pro-baseball-scraping-prod" \
  --start-time $(date -d '5 minutes ago' +%s)000 \
  --filter-pattern "[REPORT]"
# REPORT RequestId: xyz-789-abc Duration: 1234.56 ms Billed Duration: 1235 ms Memory Size: 512 MB Max Memory Used: 89 MB
```

#### 4.2 Cognito認証システムテスト

```bash
# Cognito User Pool設定確認
aws cognito-idp describe-user-pool \
  --user-pool-id ap-northeast-1_prodPoolId \
  --query '{Name:Name,Status:Status,Policies:Policies.PasswordPolicy}'
# {
#     "Name": "ProBaseballUserPool-prod",
#     "Status": "Active",
#     "Policies": {
#         "MinimumLength": 8,
#         "RequireUppercase": true,
#         "RequireLowercase": true,
#         "RequireNumbers": true,
#         "RequireSymbols": false
#     }
# }

# Cognitoクライアント設定確認
aws cognito-idp describe-user-pool-client \
  --user-pool-id ap-northeast-1_prodPoolId \
  --client-id prodclientidxxxxxxxxxxxxxx
# {
#     "UserPoolClient": {
#         "ClientName": "ProBaseballApp-prod",
#         "ExplicitAuthFlows": ["ADMIN_NO_SRP_AUTH", "USER_PASSWORD_AUTH"],
#         "SupportedIdentityProviders": ["COGNITO"]
#     }
# }

# 管理者ユーザー状態確認
aws cognito-idp admin-get-user \
  --user-pool-id ap-northeast-1_prodPoolId \
  --username admin
# {
#     "Username": "admin",
#     "UserStatus": "CONFIRMED",
#     "UserAttributes": [
#         {
#             "Name": "email",
#             "Value": "yuta.nozue@gmail.com"
#         }
#     ]
# }

# admin グループ所属確認（実名系APIはこれが無いと403）
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id ap-northeast-1_prodPoolId \
  --username admin \
  --query 'Groups[].GroupName'
# [
#     "admin"
# ]
# ※ 未所属なら docs/aws/COGNITO_ADMIN_SETUP.md の手順で追加する
# ※ セルフサインアップは無効（selfSignUpEnabled: false）。アカウントは運営者が作成する

# 認証トークン取得テスト
aws cognito-idp admin-initiate-auth \
  --user-pool-id ap-northeast-1_prodPoolId \
  --client-id prodclientidxxxxxxxxxxxxxx \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=admin,PASSWORD=YourPassword123!
# {
#     "AuthenticationResult": {
#         "AccessToken": "eyJraWQiOiI...",
#         "ExpiresIn": 3600,
#         "IdToken": "eyJraWQiOiI...",
#         "RefreshToken": "eyJjdHkiOiJ...",
#         "TokenType": "Bearer"
#     }
# }
```

#### 4.3 S3・データ確認

```bash
# S3データバケット状態確認
aws s3api head-bucket --bucket pro-candidate-data-prod
echo "S3バケットアクセス成功"

# S3データ構造確認
aws s3 ls s3://pro-candidate-data-prod/ --recursive --human-readable
# 2025-06-09 12:00:00    1.2 MiB players/2025/highschool.json
# 2025-06-09 12:00:00  894.5 KiB players/2025/university.json
# 2025-06-09 12:00:00   45.6 KiB config/dev/app-config.json

# S3バケットポリシー確認
aws s3api get-bucket-policy --bucket pro-candidate-data-prod
# バケットポリシーが適切に設定されているか確認

# S3ライフサイクルポリシー確認
aws s3api get-bucket-lifecycle-configuration --bucket pro-candidate-data-prod
# {
#     "Rules": [
#         {
#             "ID": "CacheCleanup",
#             "Status": "Enabled",
#             "Filter": {
#                 "Prefix": "cache/"
#             },
#             "Expiration": {
#                 "Days": 7
#             }
#         }
#     ]
# }
```

#### 4.4 フロントエンド動作確認

```bash
# フロントエンドアクセステスト
curl -I "http://pro-candidate-frontend-prod.s3-website-ap-northeast-1.amazonaws.com/"
# HTTP/1.1 200 OK
# Content-Type: text/html
# Content-Length: 532

# PWA Manifest確認
curl -X GET "http://pro-candidate-frontend-prod.s3-website-ap-northeast-1.amazonaws.com/manifest.json"
# {
#     "name": "プロ野球志望届データ管理システム",
#     "short_name": "野球志望届",
#     "start_url": "/",
#     "display": "standalone"
# }

echo "prod環境フロントエンドURL: http://pro-candidate-frontend-prod.s3-website-ap-northeast-1.amazonaws.com/"
echo "認証必須: admin / ynozue アカウントでログイン"
```

### Phase 5: 監視・ログ確認

#### 5.1 CloudWatch監視

```bash
# CloudWatch Logs確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/pro-baseball"
# {
#     "logGroups": [
#         {
#             "logGroupName": "/aws/lambda/pro-baseball-scraping-prod",
#             "creationTime": 1609459200000,
#             "retentionInDays": 14,
#             "storedBytes": 12345
#         }
#     ]
# }

# エラーログ検索
aws logs filter-log-events \
  --log-group-name "/aws/lambda/pro-baseball-scraping-prod" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"
# エラーログが出力されていないことを確認

# CloudWatch アラーム状態確認
aws cloudwatch describe-alarms --state-value ALARM
# {
#     "MetricAlarms": []
# }

# CloudWatch ダッシュボード確認
aws cloudwatch list-dashboards
# {
#     "DashboardEntries": [
#         {
#             "DashboardName": "ProBaseballDashboard",
#             "DashboardArn": "arn:aws:cloudwatch:ap-northeast-1:123456789012:dashboard/ProBaseballDashboard",
#             "LastModified": "2025-06-09T12:00:00.000Z",
#             "Size": 1234
#         }
#     ]
# }
```

#### 5.2 X-Ray分散トレーシング

```bash
# X-Ray サービスマップ確認
aws xray get-service-graph \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)
# {
#     "Services": [
#         {
#             "ReferenceId": 1,
#             "Name": "pro-baseball-scraping-prod",
#             "Type": "AWS::Lambda::Function",
#             "State": "active"
#         }
#     ]
# }

# X-Ray トレース詳細
aws xray get-trace-summaries \
  --time-range-type TimeRangeByStartTime \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --filter-expression "service(\"pro-baseball-scraping-prod\")"
# TraceSummaries: [
#   {
#     "Id": "1-625c7e42-12345678901234567890abcd",
#     "Duration": 1.234,
#     "ResponseTime": 1.567,
#     "HasError": false,
#     "HasFault": false
#   }
# ]
```

#### 5.3 コスト監視

```bash
# AWS月額コスト確認
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
# ResultsByTime: [
#   {
#     "TimePeriod": {
#       "Start": "2025-05-09",
#       "End": "2025-06-09"
#     },
#     "Total": {
#       "BlendedCost": {
#         "Amount": "0.49",
#         "Unit": "USD"
#       }
#     }
#   }
# ]

# リソース別コスト詳細
aws ce get-dimension-values \
  --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --dimension SERVICE
# DimensionValues: [
#   {"Value": "Amazon Simple Storage Service"},
#   {"Value": "AWS Lambda"},
#   {"Value": "Amazon API Gateway"},
#   {"Value": "Amazon CloudWatch"}
# ]
```

---

## 🚨 AWS環境トラブルシューティング

### Lambda関数エラー対応

```bash
# Lambda関数エラーログ詳細確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/pro-baseball-scraping-prod" \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --filter-pattern "[ERROR]"

# Lambda関数設定問題診断
aws lambda get-function --function-name pro-baseball-scraping-prod \
  --query '{Runtime:Configuration.Runtime,MemorySize:Configuration.MemorySize,Timeout:Configuration.Timeout,Environment:Configuration.Environment}'

# Lambda関数の前バージョンに戻す
aws lambda publish-version --function-name pro-baseball-scraping-prod
aws lambda update-alias \
  --function-name pro-baseball-scraping-prod \
  --name LIVE \
  --function-version 1
```

### API Gateway障害対応

```bash
# API Gateway設定確認
aws apigateway get-rest-api --rest-api-id abc123def4

# API Gateway リクエストログ確認
aws logs filter-log-events \
  --log-group-name "API-Gateway-Execution-Logs_abc123def4/prod" \
  --start-time $(date -d '1 hour ago' +%s)000

# API Gateway再デプロイ
aws apigateway create-deployment \
  --rest-api-id abc123def4 \
  --stage-name prod
```

### S3アクセス問題対応

```bash
# S3バケットポリシー確認
aws s3api get-bucket-policy --bucket pro-candidate-data-prod

# S3 CORS設定確認
aws s3api get-bucket-cors --bucket pro-candidate-frontend-prod

# S3アクセスログ確認
aws s3api get-bucket-logging --bucket pro-candidate-data-prod
```

### Cognito認証問題対応

```bash
# Cognito設定リセット
aws cognito-idp admin-reset-user-password \
  --user-pool-id ap-northeast-1_prodPoolId \
  --username admin

# Cognitoユーザー状態確認
aws cognito-idp admin-get-user \
  --user-pool-id ap-northeast-1_prodPoolId \
  --username admin \
  --query '{Status:UserStatus,Attributes:UserAttributes}'
```

---

## 🔧 AWS高度運用コマンド

### パフォーマンス監視

```bash
# Lambda実行メトリクス詳細
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=pro-baseball-scraping-prod \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum,Minimum
# Datapoints: [
#   {
#     "Timestamp": "2025-06-09T11:00:00+00:00",
#     "Average": 1234.5,
#     "Maximum": 2500.0,
#     "Minimum": 890.0,
#     "Unit": "Milliseconds"
#   }
# ]

# API Gateway レイテンシ監視
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiName,Value=ProBaseballApi-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### データバックアップ

```bash
# S3データ完全バックアップ
aws s3 sync s3://pro-candidate-data-prod s3://pro-candidate-backup-prod/$(date +%Y%m%d)/ \
  --exclude "cache/*" \
  --storage-class STANDARD_IA
# upload: s3://pro-candidate-data-prod/players/2025/data.json to s3://pro-candidate-backup-prod/20250609/players/2025/data.json

# バックアップ確認
aws s3 ls s3://pro-candidate-backup-prod/$(date +%Y%m%d)/ --recursive --human-readable
# 2025-06-09 12:00:00    1.2 MiB players/2025/highschool.json

# DynamoDB風増分バックアップ（Lambda ログ）
aws logs create-export-task \
  --log-group-name "/aws/lambda/pro-baseball-scraping-prod" \
  --from $(date -d '1 day ago' +%s)000 \
  --to $(date +%s)000 \
  --destination s3://pro-candidate-backup-prod/logs/
```

### 障害復旧・ロールバック

```bash
# CDK緊急ロールバック
git log --oneline -5
git revert HEAD
cdk deploy ProBaseballStack-prod --require-approval never

# Lambda関数コード緊急復旧
aws lambda update-function-code \
  --function-name pro-baseball-scraping-prod \
  --s3-bucket pro-candidate-backup-prod \
  --s3-key lambda-backup/pro-baseball-scraping-prod-stable.zip

# S3データ復元
aws s3 sync s3://pro-candidate-backup-prod/20250608/ s3://pro-candidate-data-prod/ \
  --delete \
  --dryrun  # 実行前確認

# CloudFormation緊急ロールバック
aws cloudformation cancel-update-stack --stack-name ProBaseballStack-prod
aws cloudformation continue-update-rollback --stack-name ProBaseballStack-prod
```

---

## 📊 AWS品質保証チェックリスト

### デプロイ前チェック

- [ ] **全テスト通過**: `npm test`で96%以上成功率
- [ ] **カバレッジ確認**: `npm run test:coverage`でカバレッジ85%以上
- [ ] **コード品質**: `npm run lint`で警告なし
- [ ] **CDK構文チェック**: `cdk synth`でテンプレート生成成功
- [ ] **Lambda関数テスト**: ローカル実行テスト通過
- [ ] **AWS認証情報・権限確認**: `aws sts get-caller-identity`成功

### デプロイ後チェック

- [ ] CloudFormation Stack `CREATE_COMPLETE`/`UPDATE_COMPLETE`
- [ ] Lambda関数実行成功
- [ ] API Gateway ヘルスチェック通過
- [ ] S3デプロイ成功・アクセス可能

### 本番リリース後チェック

- [ ] Cognito認証機能動作確認（dev・prod 両環境）
- [ ] 実名系APIが未認証で401・admin未所属で403になること
- [ ] フロントエンド・API統合テスト通過
- [ ] CloudWatch監視・アラート正常
- [ ] 月額コスト$0.49以内維持

このAWS専用ワークフローにより、クラウドネイティブな開発・運用プロセスが確立できます。
