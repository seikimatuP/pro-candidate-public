# S3静的ホスティング SPA設定トラブルシューティングガイド

## 🔍 問題の概要

AWS S3静的ホスティングでReact SPAの直接アクセス（`/highschool-players`など）が404エラーになる問題の調査と解決策。

> **現在の配信構成**: フロントエンドは S3 Website の前段に CloudFront を置いて配信している
> （dev: `d3brmn978dqs63.cloudfront.net` / prod: `dh2yk8y9mj9wl.cloudfront.net`）。
> このドキュメントの検証コマンドは S3 Website エンドポイントを直接叩くもので、
> 利用者から見える挙動を確認するには CloudFront 側の URL でも確認すること。
> フロントエンドのデプロイでは CloudFront invalidation を必須にしている。

## 🚨 根本原因分析

### 1. CDK設定の不整合（修正済み）

**問題**: prod環境で既存バケット参照のみでWebsite設定が未適用

```typescript
// 修正前（問題のあるコード）
if (props.stage === 'prod') {
  this.bucket = s3.Bucket.fromBucketName(
    this,
    'FrontendBucket',
    `pro-candidate-frontend-${props.stage}`
  ); // Website設定なし
}

// 修正後（統一的な設定）
if (props.stage === 'prod') {
  this.bucket = new s3.Bucket(this, 'FrontendBucket', {
    bucketName: `pro-candidate-frontend-${props.stage}`,
    websiteIndexDocument: 'index.html',
    websiteErrorDocument: 'index.html', // SPA用
    // ... 他の設定
  });
}
```

### 2. CI/CDパイプラインの設定不足（修正済み）

**問題**: フロントエンドデプロイ時にWebsite設定確認・修復機能なし

**解決策**:

- GitHub Actionsワークフローに自動Website設定チェック・修復機能追加
- デプロイ時の自動検証・設定適用

### 3. S3 Website設定の特殊な制約

**重要な発見**: S3 Website機能には以下の制約があります

#### A. Cache-Control ヘッダーの影響

```bash
# 問題のあるレスポンス例
< HTTP/1.1 404 Not Found
< Cache-Control: public, max-age=300  # ← これが問題
< x-amz-error-code: NoSuchKey
```

#### B. S3 Website エラードキュメントの制限

- **4xx系エラー**: ErrorDocumentが適用される
- **キャッシュされた404**: ブラウザ・CDNレベルでキャッシュされる可能性
- **反映時間**: 設定変更後5-15分の反映時間が必要

## 🔧 解決策の実装

### 1. CDK統一設定（完了）

```typescript
// /pro-candidate-aws/lib/constructs/simple-frontend-construct.ts
// dev/prod環境で統一的なWebsite設定を適用
```

### 2. CI/CD自動修復機能（完了）

```yaml
# /.github/workflows/deploy-frontend.yml
# デプロイ時のWebsite設定自動確認・修復機能
```

### 3. 検証・トラブルシューティングスクリプト（完了）

```bash
# 包括的な検証スクリプト
./scripts/verify-s3-website-config.sh prod
```

## 🚀 推奨運用プロセス

### デプロイ前チェック

```bash
# 1. インフラ更新（必要時）※ ローカルからの cdk deploy は使わない
gh workflow run deploy-infra.yml --ref develop -f environment=prod

# 2. フロントエンドデプロイ（GitHub Actions）
gh workflow run deploy-frontend.yml --ref develop -f environment=prod

# 3. デプロイ後検証
./scripts/verify-s3-website-config.sh prod
```

### トラブル時の緊急対応

```bash
# 1. Website設定強制リセット
aws s3api put-bucket-website --bucket pro-candidate-frontend-prod \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
  }'

# 2. 設定確認
aws s3api get-bucket-website --bucket pro-candidate-frontend-prod

# 3. キャッシュクリア待機（5-15分）
# この間はCDN/ブラウザキャッシュが原因で404が継続する可能性

# 4. 検証
curl -v "http://pro-candidate-frontend-prod.s3-website-ap-northeast-1.amazonaws.com/highschool-players"
```

## 🎯 予防策

### 1. Infrastructure as Code徹底

- **手動設定の禁止**: AWSコンソールでの手動変更を避ける
- **CDK統一管理**: 全環境でCDKによる統一設定
- **設定のバージョン管理**: 設定変更のGit管理

### 2. CI/CD自動化強化

- **デプロイ前検証**: Website設定の事前確認
- **デプロイ後テスト**: SPA直接アクセステスト
- **失敗時の自動修復**: 設定不備の自動検出・修復

### 3. 監視・アラート

- **ヘルスチェック**: 定期的なSPAアクセステスト
- **設定ドリフト検出**: CDKと実際の設定の差異監視
- **エラー監視**: 404エラーの監視・アラート

## 📊 検証結果

### 現在の状況（2025-06-20時点）

```bash
# 検証コマンド実行結果
./scripts/verify-s3-website-config.sh prod

# 結果サマリー（2025-06-20更新）
✅ Bucket Exists: Yes
✅ Website Config: Yes
✅ SPA Config: Yes
✅ Bucket Policy: Yes
✅ Website Access: Yes
✅ SPA Direct Access: Yes (問題解決済み)
```

### 解決済み項目（2025-06-20更新）

- ✅ CDK設定統一化
- ✅ CI/CD自動修復機能追加
- ✅ 検証スクリプト作成
- ✅ Website設定強制リセット
- ✅ **AWS内部同期問題解決**: S3 Website設定強制適用で正常化完了
- ✅ **SPA直接アクセス復旧**: `/highschool-players`等の404エラー完全解消

### 根本原因確定（2025-06-20）

- ❌ **CDKデプロイ起因説は誤り**: CloudFormation履歴確認でS3バケット関連更新なし
- ✅ **AWS S3サービス内部問題**: Website設定と実際の動作で一時的同期ズレ発生
- ✅ **解決方法確立**: `aws s3api put-bucket-website`による設定強制リセットが効果的

## 🔮 長期的改善案

### 1. CloudFront導入（✅ 導入済み）

`lib/constructs/cloudfront-construct.ts` で CloudFront + S3 構成を実装済み。
HTTPS 化と SPA 用エラーページ設定が入っており、デプロイ時に invalidation を実行する。
残る課題はキャッシュ戦略の最適化。

### 2. 統合監視システム

```typescript
// CloudWatch Alarms
// SPA アクセステスト自動化
// Slack/メール通知
```

### 3. 多環境運用強化

```bash
# staging環境追加
# Blue-Green デプロイ
# カナリアリリース
```

## 📝 学習ポイント

1. **S3 Website制約理解**: エラードキュメント機能の詳細
2. **キャッシュ戦略**: HTTP キャッシュヘッダーの影響
3. **CI/CD自動化**: Infrastructure as Codeの重要性
4. **監視・検証**: デプロイ後の自動検証の必要性

## 🔗 関連リソース

- [AWS S3 Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [React Router and S3](https://create-react-app.dev/docs/deployment/#s3-and-cloudfront)
- [CDK S3 Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)
