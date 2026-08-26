# システム動作確認ガイド

このドキュメントでは、プロ野球志望届データ収集システム（AWS S3 ベースアーキテクチャ）の動作確認方法を説明します。

## 前提条件

- AWS CLI が設定済み（`aws configure`）
- 適切な IAM 権限を持つユーザーでログイン
- jq コマンド（オプション、JSON 整形用）

## 1. デプロイ状況確認

### スタック情報の取得

```bash
# CloudFormationスタックの状態確認
aws cloudformation describe-stacks --stack-name ProBaseballStack-dev

# 主要な出力値のみ取得
aws cloudformation describe-stacks \
  --stack-name ProBaseballStack-dev \
  --query 'Stacks[0].Outputs'
```

### API Gateway URL 確認

```bash
# API エンドポイントURLを取得
API_URL=$(aws cloudformation describe-stacks \
  --stack-name ProBaseballStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

echo "API URL: $API_URL"
```

## 2. API 動作確認

### 2.0 認証の前提

API Gateway の Cognito 認証は **dev / prod の両方**で有効。認証不要で叩けるのは次の 4 本だけ。

- `GET /health`
- `GET /statistics`
- `GET /schools`
- `GET /years/available`

これ以外（`/players` 系すべて・`/schools/{school}/players`・`/scraping/*`・`ANY /{proxy+}`）は
ID トークンが必要で、さらに `cognito:groups` に `admin` が無いと通らない。認証ヘッダー無しで
叩くと **401**、認証は通っていて admin でなければ **403** が返る。

以下では認証が必要な例に `$ID_TOKEN` を使う。E2E のセッションを流用する場合は
`playwright/.auth/<env>.json` の idToken を取り出すか、`aws cognito-idp` でログインして取得する
（管理者アカウントの用意は [Cognito 管理者セットアップ](../aws/COGNITO_ADMIN_SETUP.md)）。

### 2.1 ヘルスチェック

```bash
# ヘルスチェックエンドポイント
curl ${API_URL}health

# 期待される応答例:
# {
#   "status": "healthy",
#   "timestamp": "2025-06-05T05:14:48.884Z",
#   "bucket": "pro-candidate-data-dev"
# }
```

### 2.2 選手データ取得

`GET /players` は **認証必須（admin グループ必須）**。ページングされ、既定 100 件・上限 500 件。

```bash
# 全選手データ取得（認証必須）
curl -H "Authorization: Bearer ${ID_TOKEN}" ${API_URL}players

# 期待される応答（metadata にページング情報が入る）:
# {
#   "success": true,
#   "data": [...],
#   "metadata": {
#     "year": 2025,
#     "total": 159,
#     "limit": 100,
#     "offset": 0,
#     "hasMore": true
#   },
#   "count": 100
# }

# ページ送り
curl -s -H "Authorization: Bearer ${ID_TOKEN}" "${API_URL}players?limit=500&offset=100" | jq .

# 認証ヘッダーを付けない場合は 401 が返る（動作確認としてはこれが正しい挙動）
curl -s -o /dev/null -w "%{http_code}\n" ${API_URL}players
```

### 2.3 学校データ取得

```bash
# 学校一覧取得
curl ${API_URL}schools

# 期待される応答:
# {
#   "success": true,
#   "data": [],
#   "message": "Schools API - implementation pending"
# }
```

## 3. Lambda 関数の動作確認

### 3.1 スクレイピング関数の実行

```bash
# データ収集Lambda関数を手動実行
aws lambda invoke \
  --function-name pro-baseball-scraping-dev \
  --payload '{}' \
  response.json

# 実行結果確認
cat response.json

# 期待される応答:
# {
#   "statusCode": 200,
#   "body": "{\"message\":\"Scraping completed successfully\",\"playersCount\":1,\"s3Key\":\"players/highschool/2025.json\"}"
# }
```

### 3.2 Lambda 関数一覧確認

```bash
# プロジェクトのLambda関数一覧
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `pro-baseball`)].FunctionName'

# 期待される出力:
# [
#   "pro-baseball-api-dev",
#   "pro-baseball-processing-dev",
#   "pro-baseball-scraping-dev"
# ]
```

## 4. S3 データストレージ確認

### 4.1 バケット内容確認

```bash
# S3バケット名取得
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ProBaseballStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`S3DataBucketName`].OutputValue' \
  --output text)

echo "S3 Bucket: $BUCKET_NAME"

# バケット内のファイル一覧
aws s3 ls s3://${BUCKET_NAME}/ --recursive
```

### 4.2 保存データの確認

```bash
# スクレイピングで保存されたJSONファイルの内容確認
aws s3 cp s3://${BUCKET_NAME}/players/highschool/2025.json - | python -m json.tool

# 期待される構造:
# {
#   "metadata": {
#     "year": 2025,
#     "type": "highschool",
#     "totalCount": 1,
#     "lastUpdated": "2025-06-05T...",
#     "version": "1.0"
#   },
#   "players": [
#     {
#       "id": "highschool_2025_0001",
#       "name": "テスト太郎",
#       "school": "テスト高校",
#       ...
#     }
#   ]
# }
```

## 5. ログ確認

### 5.1 Lambda 関数のログ確認

```bash
# スクレイピング関数のログ（最新10件）
aws logs tail /aws/lambda/pro-baseball-scraping-dev --since 1h

# API関数のログ（リアルタイム監視）
aws logs tail /aws/lambda/pro-baseball-api-dev --follow

# データ処理関数のログ
aws logs tail /aws/lambda/pro-baseball-processing-dev --since 1h
```

### 5.2 特定のエラーログ検索

```bash
# エラーログの検索
aws logs filter-log-events \
  --log-group-name /aws/lambda/pro-baseball-api-dev \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000
```

## 6. パフォーマンステスト

### 6.1 API 応答時間測定

```bash
# 応答時間を含む詳細情報
curl -w "\n\nTime Total: %{time_total}s\n" ${API_URL}health

# 10回連続実行してパフォーマンス確認（認証必須エンドポイント）
for i in {1..10}; do
  echo "Request $i:"
  time curl -s -H "Authorization: Bearer ${ID_TOKEN}" ${API_URL}players > /dev/null
  sleep 1
done
```

### 6.2 並列リクエストテスト

```bash
# 5並列でAPIリクエスト（公開エンドポイントで測る場合）
seq 1 5 | xargs -n1 -P5 -I{} curl -s ${API_URL}statistics
```

## 7. コスト・使用量確認

### 7.1 Lambda 関数の使用状況

```bash
# Lambda関数のメトリクス確認（過去1時間）
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=pro-baseball-api-dev \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### 7.2 S3 使用量確認

```bash
# バケットサイズ確認
aws s3 ls s3://${BUCKET_NAME}/ --recursive --human-readable --summarize
```

## 8. トラブルシューティング

### 8.1 API Gateway 502/503 エラー

```bash
# Lambda関数の状態確認
aws lambda get-function --function-name pro-baseball-api-dev

# 最近のエラーログ確認
aws logs tail /aws/lambda/pro-baseball-api-dev --since 5m | grep -i error
```

### 8.2 Lambda 関数タイムアウト

```bash
# タイムアウト設定確認
aws lambda get-function-configuration \
  --function-name pro-baseball-scraping-dev \
  --query 'Timeout'

# メモリ使用量確認
aws logs tail /aws/lambda/pro-baseball-scraping-dev --since 1h | grep "Memory"
```

### 8.3 S3 アクセスエラー

```bash
# IAMロールの権限確認
aws lambda get-function-configuration \
  --function-name pro-baseball-api-dev \
  --query 'Role'

# S3バケットポリシー確認
aws s3api get-bucket-policy --bucket ${BUCKET_NAME}
```

## 9. 自動化スクリプト

### 包括的動作確認スクリプト

```bash
#!/bin/bash
# comprehensive-test.sh

set -e

echo "=== Pro Baseball AWS Infrastructure Test ==="

# API URL取得
API_URL=$(aws cloudformation describe-stacks \
  --stack-name ProBaseballStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

echo "Testing API: $API_URL"

# API テスト
echo -e "\n1. Health Check..."
curl -s "${API_URL}health"
echo -e "\n✅ Health Check Passed"

echo -e "\n2. Players API（認証ゲート確認）..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}players")
[ "$STATUS" = "401" ] || { echo "❌ 認証ゲートが効いていない（HTTP $STATUS）"; exit 1; }
echo -e "\n✅ Players API は未認証で 401 を返す"

echo -e "\n3. Schools API..."
curl -s "${API_URL}schools"
echo -e "\n✅ Schools API Passed"

echo -e "\n3.1 Statistics API..."
curl -s "${API_URL}statistics" > /dev/null
echo -e "\n✅ Statistics API Passed"

# Lambda テスト
echo -e "\n4. Lambda Functions..."
for func in scraping processing api; do
  aws lambda get-function --function-name "pro-baseball-${func}-dev" > /dev/null
  echo "✅ Lambda Function: pro-baseball-${func}-dev"
done

# S3 テスト
echo -e "\n5. S3 Bucket..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ProBaseballStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`S3DataBucketName`].OutputValue' \
  --output text)

aws s3 ls s3://${BUCKET_NAME}/ > /dev/null
echo "✅ S3 Bucket Accessible: ${BUCKET_NAME}"

echo -e "\n=== All Tests Passed! ==="
```

## まとめ

このガイドに従って動作確認を行うことで、システムが正常に稼働していることを確認できます。定期的な監視とテストを実施して、システムの健全性を維持してください。

---

_最終更新: 2025-06-05_
