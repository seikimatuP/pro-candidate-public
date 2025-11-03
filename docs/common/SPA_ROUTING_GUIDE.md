# SPA（Single Page Application）ルーティングガイド

## 概要

本プロジェクトはReact Routerを使用したSPAアーキテクチャを採用しており、**CloudFront + S3静的ホスティング環境**でのクライアントサイドルーティングに完全対応しています。

> **✅ 更新（v1.2.74）**: CloudFront SPA完全対応・BrowserRouter実装・404エラー根本解決完了

## 技術的背景

### SPAの特徴

SPAでは、実際のファイル構造とURLルーティングが異なります：

```
物理的なファイル構造（S3バケット）:
s3://pro-candidate-frontend-prod/
├── index.html          ← 実際に存在
├── assets/
│   ├── index-xxx.js   ← 実際に存在
│   └── index-xxx.css  ← 実際に存在
└── manifest.json      ← 実際に存在

仮想的なルーティング（React Router）:
/                      ← ダッシュボード
/login                 ← ログイン画面
/dashboard             ← 統計ダッシュボード
/players               ← 選手管理
/schools               ← 学校管理
```

### リロード時404問題

| アクセス方法              | 処理者     | 流れ                     | 結果         |
| ------------------------- | ---------- | ------------------------ | ------------ |
| **リンククリック**        | JavaScript | React Router がURL変更   | ✅ 正常表示  |
| **直接アクセス/リロード** | S3サーバー | S3に/loginファイルを要求 | ❌ 404エラー |

## 解決方法

### S3 ErrorDocument設定

```json
{
  "IndexDocument": { "Suffix": "index.html" },
  "ErrorDocument": { "Key": "index.html" }
}
```

### 動作フロー

```
1. ユーザーが /login でリロード
2. S3に /login ファイルをリクエスト
3. ファイルが存在しない → 404
4. S3がErrorDocument（index.html）を返す
5. index.htmlが読み込まれ、React Routerが起動
6. React Routerが /login を認識してLoginPageを表示
```

## 実装状況

### 設定済み環境

- ✅ **Development**: pro-candidate-frontend-dev + CloudFront（`https://d3brmn978dqs63.cloudfront.net`）
- ✅ **Production**: pro-candidate-frontend-prod

### CloudFront + S3統合設定（v1.2.74完全対応）

#### CloudFront設定

```typescript
// pro-candidate-aws/lib/constructs/cloudfront-construct.ts
errorResponses: [
  {
    httpStatus: 404,
    responseHttpStatus: 200,
    responsePagePath: '/index.html',
    ttl: cdk.Duration.seconds(300),
  },
  {
    httpStatus: 403,
    responseHttpStatus: 200,
    responsePagePath: '/index.html',
    ttl: cdk.Duration.seconds(300),
  },
];
```

### CDK設定

```typescript
// pro-candidate-aws/lib/constructs/simple-frontend-construct.ts
this.bucket = new s3.Bucket(this, 'FrontendBucket', {
  websiteIndexDocument: 'index.html',
  websiteErrorDocument: 'index.html', // SPA対応
  // ...
});
```

### Vite設定（本番最適化）

```typescript
// frontend/vite.config.ts
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true, // 本番ビルドでconsole.log完全削除
      drop_debugger: true
    }
  }
}
```

## テスト方法

### 正常動作確認

```bash
# 基本アクセス
curl http://pro-candidate-frontend-prod.s3-website-ap-northeast-1.amazonaws.com

# SPAルーティングテスト
curl http://pro-candidate-frontend-prod.s3-website-ap-northeast-1.amazonaws.com/login
curl http://pro-candidate-frontend-prod.s3-website-ap-northeast-1.amazonaws.com/dashboard
```

### ブラウザテスト

1. **通常ナビゲーション**: リンククリックで各ページ移動
2. **リロードテスト**: 任意のページでF5キー
3. **直接アクセス**: URLバーに直接入力
4. **ブックマーク**: ページをブックマークして再訪問

## トラブルシューティング

### よくある問題

#### 問題: リロード時に404エラー

**原因**: S3のErrorDocument設定なし
**解決**:

```bash
aws s3api put-bucket-website --bucket BUCKET_NAME \
  --website-configuration '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'
```

#### 問題: 本番環境でconsole.logが出力される

**原因**: Vite terser設定不備
**解決**: vite.config.tsで`drop_console: true`設定

#### 問題: 環境別設定が正しく動作しない

**原因**: 環境変数・ビルド設定のミスマッチ
**解決**: import.meta.env.DEVによる条件分岐確認

## 開発時の注意点

### フロントエンド開発

1. **環境別ログ**: `import.meta.env.DEV`で開発環境でのみデバッグ出力
2. **本番ビルド**: terserによりconsole.log自動削除
3. **SPAルーティング**: React Router Domの設定確認

### デプロイ時

1. **ビルド**: `npm run build`で本番最適化
2. **S3同期**: `aws s3 sync dist/ s3://BUCKET --delete`
3. **設定確認**: S3ウェブサイト設定の確認

## 関連ドキュメント

- [AWS Infrastructure Documentation](../aws/AWS_INFRASTRUCTURE_DOCUMENTATION.md)
- [開発ガイド](../common/DEVELOPMENT_GUIDE.md)
- [Deployment Guide](../aws/AWS_CICD_GUIDE.md)

---

## 更新履歴

### 2025-06-20

- **prod環境404問題解決**: AWS S3内部同期問題によるSPA直接アクセス404エラー修正
- **Website設定強制リセット**: CDKとは無関係なS3サービス側問題の解決策確立
- **根本原因特定**: AWS側の一時的設定同期ズレが真因・CDKデプロイは影響なし

### 2025-06-09

- **初回作成**: SPA routing, console.log optimization, S3 ErrorDocument configuration

_最終更新: 2025-06-20_
_SPA routing troubleshooting, AWS S3 internal sync issue resolution_
