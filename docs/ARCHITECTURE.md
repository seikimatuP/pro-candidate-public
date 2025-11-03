# システムアーキテクチャ

**最終更新**: 2025-06-29 - ドキュメント大規模再構成・3層アーキテクチャ実装

## 🏗️ 概要

プロ野球志望届管理システム - **AWS サーバーレス + React**によるモジュラー設計。月額$0.50以下の低コスト運用を実現。

### 📚 ドキュメント3層アーキテクチャ（2025-06-29実装）

**Level 1 - 即座実行** (5分以内):

- [QUICK_START.md](../QUICK_START.md): 3コマンドシステム起動
- [WORKFLOWS.md](../WORKFLOWS.md): タスク別実行ガイド
- [EMERGENCY.md](../EMERGENCY.md): 緊急時対応

**Level 2 - 実用開発** (30分以内):

- [ARCHITECTURE.md](ARCHITECTURE.md): システム設計詳細
- [development/DEPLOYMENT.md](development/DEPLOYMENT.md): デプロイガイド
- [development/TESTING/E2E_TESTING.md](development/TESTING/E2E_TESTING.md): テスト実行

**Level 3 - 専門知識** (深い理解):

- [development/baseball-features/](development/baseball-features/): 野球業務特化
- [operation/TROUBLESHOOTING.md](operation/TROUBLESHOOTING.md): 高度トラブル対応
- アーカイブ・詳細設定資料

## 🔧 技術スタック

### フロントエンド

- **React + TypeScript**: メインUI
- **PWA**: オフライン対応・インストール可能
- **Material-UI**: コンポーネント・ダークモード
- **CloudFront**: CDN配信

### バックエンド

- **Lambda**: Node.js 18.x・API処理・スクレイピング
- **API Gateway**: RESTful API・CORS・認証
- **S3 + JSON**: データストレージ（DynamoDB置き換え）
- **Cognito**: 認証システム

### データフロー

```
React UI → API Gateway → Lambda → S3 Storage
                               ↓
                        CloudWatch Monitoring
```

## 📁 プロジェクト構造

### コア層 (`src/core/`)

- `types.ts`: TypeScript型定義・PlayerData・S3構造
- `utils.ts`: 構造化ログ・LogLevel列挙型
- `cache.ts`: 高度キャッシュ・TTL管理

### サービス層 (`src/services/`)

- **`s3-data-service.ts`**: 623行S3操作SDK
  - TTLキャッシュ・並列読み込み・高速検索 -統計生成・エラーハンドリング・CRUD操作

### フィーチャー層 (`src/features/`)

- **スクレイピング** (`scraping/`): データ収集・バッチ最適化
- **バリデーション** (`validation/`): 入力検証・セキュリティ
- **履歴管理** (`history/`): S3ベース履歴・差分計算

### インフラ (`pro-candidate-aws/`)

- **CDK**: Infrastructure as Code・TypeScript
- **Constructs**: S3・Lambda・API Gateway・CloudFront
- **Custom Resource**: SPA 404問題解決・自動設定

## 🗄️ データ構造

### S3バケット構成

```
pro-candidate-data-{env}/
├── players/
│   ├── highschool/2024.json    # 高校生データ
│   └── university/2024.json    # 大学生データ
├── indexes/
│   └── available-years.json    # 年度インデックス
├── cache/
│   └── statistics.json         # 統計キャッシュ
└── history/
    └── scraping-history.json   # 実行履歴
```

### PlayerData型

```typescript
interface PlayerData {
  name: string;
  school: string;
  position: string;
  prefecture: string;
  year: number;
  isDraftEligible: boolean;
}
```

## 🔒 セキュリティ

### 認証・認可

- **AWS Cognito**: 環境別UserPool（dev/prod分離）
- **ローカル**: 認証スキップ（開発効率）
- **セッション**: 永続化・自動リトライ・リアルタイム監視

### データ保護

- **S3暗号化**: AES-256・サーバーサイド暗号化
- **IAM最小権限**: 特定パス制限・機能別権限分離
- **入力検証**: XSS・SQLインジェクション防止

## 📊 運用・監視

### パフォーマンス

- **Lambda**: 512MB（スクレイピング）・128MB（API）
- **S3キャッシュ**: TTL 5-15分・データ種別最適化
- **API**: 50-80%呼び出し削減達成

### 監視・ログ

- **CloudWatch**: メトリクス・ログ・アラーム（5個上限）
- **X-Ray**: 分散トレーシング・パフォーマンス分析
- **コスト**: 月額$0.50閾値アラーム・自動最適化

### 高可用性

- **Auto Scaling**: Lambda並行実行・API Gateway自動スケール
- **Backup**: S3バージョニング・ライフサイクル管理
- **災害復旧**: CloudFormation・Infrastructure as Code

## 🤖 AI統合

### Claude Code + Gemini

- **直接API**: Gemini Flash・リアルタイム応答
- **MCP統合**: Claude Desktop対応・10専用ツール
- **開発支援**: コードレビュー・デバッグ・技術説明

## 🚀 デプロイ・CI/CD

### 自動化

- **GitHub Actions**: 分離型パイプライン・並列実行
- **フロントエンド**: 3-5分（75%短縮）
- **インフラ**: 8-12分・CDK差分デプロイ

### 環境管理

- **dev**: 自動デプロイ（develop push）
- **prod**: タグベースリリース・手動承認
- **検証**: 自動テスト・環境確認・ヘルスチェック

## 📋 API仕様・使用例

### 主要エンドポイント

| エンドポイント           | 説明               | パラメータ     |
| ------------------------ | ------------------ | -------------- |
| `GET /players`           | 選手データ取得     | `type`, `year` |
| `GET /years/available`   | 利用可能年度一覧   | -              |
| `POST /scraping/trigger` | スクレイピング実行 | `type`, `year` |
| `GET /scraping/history`  | 実行履歴           | `limit`        |
| `GET /health`            | ヘルスチェック     | -              |

### 使用例

```bash
# 高校生データ取得
curl "https://api.example.com/players?type=highschool&year=2024"

# スクレイピング実行
curl -X POST "https://api.example.com/scraping/trigger" \
  -H "Content-Type: application/json" \
  -d '{"type": "both", "year": 2024}'

# 実行履歴確認
curl "https://api.example.com/scraping/history?limit=10"
```

### エラーハンドリング

| コード | 説明                 | 対応           |
| ------ | -------------------- | -------------- |
| 400    | バリデーションエラー | パラメータ確認 |
| 401    | 認証失敗             | トークン再取得 |
| 404    | リソース不存在       | URL確認        |
| 500    | サーバーエラー       | ログ確認       |

### 認証

**環境別認証**:

- **ローカル**: 認証スキップ（開発効率）
- **dev/prod**: AWS Cognito必須

```javascript
// Cognito認証例
import { Auth } from 'aws-amplify';

const token = await Auth.currentSession();
const headers = {
  Authorization: `Bearer ${token.getIdToken().getJwtToken()}`,
};
```

## 🔍 パフォーマンス最適化

### キャッシュ戦略

- **S3DataService**: TTL 5-15分・データ種別最適化
- **API Gateway**: レスポンスキャッシュ300秒
- **CloudFront**: 静的アセット31536000秒

### メモリ最適化

- **Lambdaスクレイピング**: 512MB（パフォーマンス重視）
- **Lambda API**: 128MB（コスト重視）
- **フロントエンド**: メモリ300MB基準

### コスト最適化

- **S3ライフサイクル**: IA→4月→Glacier→1年
- **CloudWatch**: ログ保持期間4週間
- **無料枠監視**: 月額$0.50闾値アラーム

詳細は[DEPLOYMENT.md](development/DEPLOYMENT.md)参照
