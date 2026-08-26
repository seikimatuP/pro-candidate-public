# AWS 設定ファイル更新ガイド

## 概要

このガイドでは、AWS Lambda 関数で使用されるスクレイピング設定ファイル `aws-scraping-config.json` の更新方法について説明します。

**設定ファイル場所**: `s3://pro-candidate-data-{環境}/config/aws-scraping-config.json`

> ⚠️ **注意**: 本ガイドで使っている `scripts/update-scraping-config.sh` は、
> 現在リポジトリに存在しない。当面は「AWS CLI 直接操作」の手順で更新すること。

---

## 🚀 簡易更新方法

### 1. コマンドライン更新スクリプト（推奨）

#### URL 個別更新

```bash
# 高校生データURL更新
./scripts/update-scraping-config.sh dev update-highschool "https://new-highschool-url.com"

# 大学生データURL更新
./scripts/update-scraping-config.sh dev update-university "https://new-university-url.com"

# prod環境の場合
./scripts/update-scraping-config.sh prod update-highschool "https://new-url.com"
```

#### 設定ファイル一括アップロード

```bash
# ローカルファイルから一括更新
./scripts/update-scraping-config.sh dev upload-file ./config/aws-scraping-config.json
./scripts/update-scraping-config.sh prod upload-file ./config/aws-scraping-config.json
```

#### 設定確認・検証

```bash
# 現在の設定表示
./scripts/update-scraping-config.sh dev
./scripts/update-scraping-config.sh prod

# 設定検証のみ
./scripts/update-scraping-config.sh dev validate
```

### 2. AWS CLI 直接操作

#### S3 ファイル直接更新

```bash
# 設定ファイルダウンロード
aws s3 cp s3://pro-candidate-data-dev/config/aws-scraping-config.json ./temp-config.json

# ファイル編集後アップロード
aws s3 cp ./temp-config.json s3://pro-candidate-data-dev/config/aws-scraping-config.json

# Lambda関数キャッシュクリア（テスト実行）
echo '{"year": 2024, "dataType": "highschool", "testMode": true}' > payload.json
aws lambda invoke --function-name pro-baseball-scraping-dev --payload fileb://payload.json response.json
```

---

## 📋 設定ファイル構造

### aws-scraping-config.json 構造

```json
{
  "scraping": {
    "urls": {
      "highschool": "https://www.jhbf.or.jp/pro-aspiring",
      "university": "https://www.jubf.net/system/prog/procandidate.php"
    },
    "settings": {
      "timeout": 30000,
      "retryCount": 3,
      "userAgent": "Mozilla/5.0 (compatible; DataScraper/1.0; AWS Lambda; +mailto:yuta.nozue@gmail.com)",
      "delayBetweenRequests": 1000
    },
    "parsing": {
      "highschool": {
        "tableSelector": "table.player-list",
        "rowSelector": "tr",
        "nameSelector": "td:nth-child(1)",
        "schoolSelector": "td:nth-child(2)",
        "positionSelector": "td:nth-child(3)"
      },
      "university": {
        "tableSelector": "table#player-table",
        "rowSelector": "tbody tr",
        "nameSelector": "td.name",
        "schoolSelector": "td.school",
        "positionSelector": "td.position"
      }
    }
  },
  "metadata": {
    "version": "1.0.0",
    "lastUpdated": "2025-06-08T00:00:00Z",
    "updatedBy": "system",
    "description": "プロ野球志望届スクレイピング設定"
  }
}
```

### 主要設定項目

| セクション   | 項目                 | 説明               | 例                                                                                    |
| ------------ | -------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| **urls**     | highschool           | 高校生データ URL   | `https://www.jhbf.or.jp/pro-aspiring`                                                 |
| **urls**     | university           | 大学生データ URL   | `https://www.jubf.net/system/prog/procandidate.php`                                   |
| **settings** | timeout              | タイムアウト(ms)   | `30000`                                                                               |
| **settings** | retryCount           | リトライ回数       | `3`                                                                                   |
| **settings** | userAgent            | User-Agent 文字列  | `Mozilla/5.0 (compatible; DataScraper/1.0; AWS Lambda; +mailto:yuta.nozue@gmail.com)` |
| **settings** | delayBetweenRequests | リクエスト間隔(ms) | `1000`                                                                                |

これらの値は `pro-candidate-aws/lambda/scraping/html-fetcher.ts` の `fetchHtml` が使う。

- `timeout`: 1 リクエストのタイムアウト（`AbortController` で打ち切る）
- `retryCount`: 再試行回数。待ち時間は指数バックオフ（上限 30 秒）で、
  レスポンスに `Retry-After` があればその値を優先する
- `delayBetweenRequests`: 最低リクエスト間隔。高校・大学を並列処理しても、
  リクエストの開始時刻がこの間隔だけ空くよう直列化する
- `userAgent`: 連絡先（`+mailto:`）を含める。取得元サイトからの連絡手段を残すため外さないこと

---

## ⚠️ 重要な注意事項

### 1. 設定反映のタイミング

- **キャッシュ期間**: 10 分間（設定変更後、最大 10 分で反映）
- **即座反映**: Lambda 関数のテスト実行でキャッシュクリア可能
- **自動反映**: 次回 Lambda 関数実行時に新設定で動作

### 2. 設定検証

- **URL 検証**: 有効な HTTP/HTTPS URL である必要
- **数値検証**: timeout, retryCount は正の整数
- **必須項目**: urls.highschool, urls.university は必須

### 3. フォールバック機能

- **S3 エラー**: 設定読み込み失敗時は環境変数を使用
- **設定不正**: JSON 形式エラー時はデフォルト設定を使用
- **ログ記録**: 設定読み込み状況は CloudWatch Logs に記録

---

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. 設定が反映されない

```bash
# キャッシュクリア（Lambda関数テスト実行）
./scripts/update-scraping-config.sh dev test-lambda

# または直接Lambda実行
aws lambda invoke --function-name pro-baseball-scraping-dev --payload '{"testMode": true}' response.json
```

#### 2. 設定ファイルが見つからない

```bash
# 設定ファイル存在確認
aws s3 ls s3://pro-candidate-data-dev/config/

# デフォルト設定ファイル作成
./scripts/update-scraping-config.sh dev upload-file ./config/aws-scraping-config.json
```

#### 3. JSON 形式エラー

```bash
# 設定ファイル検証
./scripts/update-scraping-config.sh dev validate

# JSON形式チェック
aws s3 cp s3://pro-candidate-data-dev/config/aws-scraping-config.json - | jq .
```

#### 4. 権限エラー

```bash
# S3バケットアクセス権限確認
aws s3 ls s3://pro-candidate-data-dev/ --region ap-northeast-1

# IAM権限確認（必要に応じて）
aws sts get-caller-identity
```

---

## 📊 更新履歴の確認

### CloudWatch Logs

```bash
# Lambda関数ログ確認
aws logs filter-log-events \
  --log-group-name /aws/lambda/pro-baseball-scraping-dev \
  --filter-pattern "Scraping configuration loaded" \
  --start-time $(date -d '1 hour ago' +%s)000
```

### S3 オブジェクトメタデータ

```bash
# 設定ファイル更新履歴
aws s3api head-object \
  --bucket pro-candidate-data-dev \
  --key config/aws-scraping-config.json
```

---

## 🚀 自動化・スケジューリング

### 定期的な設定更新

```bash
#!/bin/bash
# 定期更新スクリプト例

# 高校野球連盟URL更新（年度変更時）
CURRENT_YEAR=$(date +%Y)
NEW_URL="https://www.jhbf.or.jp/pro-aspiring/${CURRENT_YEAR}"

./scripts/update-scraping-config.sh prod update-highschool "${NEW_URL}"
```

### CI/CD 統合

```yaml
# GitHub Actions例
- name: Update scraping config
  run: |
    ./scripts/update-scraping-config.sh prod upload-file ./config/aws-scraping-config.json
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 📞 サポート・問い合わせ

設定更新に関する問題が発生した場合：

1. **ログ確認**: CloudWatch Logs でエラー詳細を確認
2. **設定検証**: `validate` コマンドで設定ファイルをチェック
3. **フォールバック確認**: 環境変数による代替動作を確認
4. **バックアップ**: 設定変更前のファイルを S3 バージョニングで復元可能

---

**最終更新**: 2025-06-08  
**対象環境**: dev, prod  
**責任者**: システム管理チーム
