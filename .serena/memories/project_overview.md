# プロ野球候補選手データ収集・分析ツール - プロジェクト概要

## 目的

高校生・大学生のプロ野球志望届データを自動収集・管理・分析するAWSクラウドネイティブツール

## 技術スタック

- **フロントエンド**: React + Vite + TypeScript・PWA対応
- **バックエンド**: AWS Lambda (Node.js 18.x)
- **データ**: Amazon S3 + JSON (DynamoDB廃止・S3移行完了)
- **API**: API Gateway (RESTful)
- **認証**: AWS Cognito
- **IaC**: AWS CDK (TypeScript)
- **テスト**: Jest・Playwright (E2E)
- **監視**: CloudWatch・X-Ray
- **AI統合**: Claude Code + Gemini 2.0 (MCP)

## 環境構成

- **Local**: localhost:5173 (Vite開発サーバー)
- **Dev**: S3 Website + CloudFront (自動デプロイ on push)
- **Prod**: S3 Website + CloudFront (自動デプロイ on tag)

## 月額コスト

$0.50以下 (完全無料枠化・98%削減達成)

## 主要機能

1. **自動スクレイピング**: Lambda関数による定期データ収集
2. **データ管理**: S3+JSON形式・年度別・検索機能
3. **統計分析**: 地域別・ポジション別・学校別集計
4. **スクレイピング履歴**: 実行履歴・差分表示
5. **RESTful API**: /players・/schools・/years/available・/scraping/history
6. **Webフロントエンド**: React UI・PWA対応・自動デプロイ

## 最新バージョン

v1.2.84 (2025-06-28)

- Web Vitals計測安定化・フォールバック機構強化
- LCP/FCP/TTFB/CLSメトリクス適切に測定
- CloudFront環境延長タイムアウト対応

## テスト状況

- E2Eテスト: ✅ 97%成功 (65/66 local)
- ユニットテスト: ⚠️ GAS環境廃止影響 (8%成功)
- テストカバレッジ目標: 70%以上

## 重要な作業記録

- docs/work_logs/20251102.md 最新更新
- Section 15: Web Vitals修正・フォールバック機構
- Section 16: ローカルテスト実行・E2E・ユニット統計

## 次のステップ (保留中)

1. dev環境E2Eテスト実行 (バックグラウンド実行中)
2. prod環境E2Eテスト実行 (バックグラウンド実行中)
3. ユニットテスト修復 (GAS依存関係削除必要)
4. フロントエンド型テスト設定
