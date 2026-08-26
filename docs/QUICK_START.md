# 🚀 5分完全スタートガイド

**作成日**: 2025-06-28 - 野球選手管理システム特化  
**最終更新**: 2026-08-23 - 公開範囲（実名一覧は admin 限定）・画面ルートを実態に合わせて更新  
**目標**: 新開発者が5分でシステム理解・実行開始

## ⚡ 3コマンドシステム起動

### 1分: 環境準備

```bash
git clone <repository-url> && cd pro_candidate
npm install
cp .env.example .env.local
```

### 2分: システム起動・確認

```bash
npm run dev              # Frontend: http://localhost:5173
npm test                 # Unit tests: 548件・96.2%成功
npm run test:e2e:local   # E2E tests: 46件・100%成功
```

### 2分: 主要機能実践

```bash
# データ確認（認証不要なのは集計のみ）
curl "http://localhost:5173/api/statistics?year=2024"

# 実名一覧は admin グループのIDトークンが必要
curl "http://localhost:5173/api/players?type=highschool&year=2024&limit=100" \
  -H "Authorization: Bearer $ID_TOKEN"

# AI支援
./scripts/gemini review "$(cat src/services/s3-data-service.ts)"
./scripts/gemini debug "エラーメッセージ"
```

## ⚾ 野球データフロー理解

### データ収集→分析の完全フロー

```
プロ志望届サイト → Lambda スクレイピング → S3 JSON保存 → React ダッシュボード表示
     ↓               ↓                    ↓               ↓
  年間320名      Node.js処理         高速検索対応      統計・グラフ表示
```

### 重要データ構造

```typescript
interface PlayerData {
  name: string; // 選手名
  school: string; // 学校名
  position: string; // ポジション
  prefecture: string; // 都道府県
  year: number; // 年度
  isDraftEligible: boolean; // ドラフト対象
}
```

### データ保存場所

```
S3バケット: pro-candidate-data-{env}/
├── players/highschool/2024.json  # 高校生約160名
├── players/university/2024.json  # 大学生約160名
├── indexes/available-years.json  # 年度インデックス
└── history/scraping-history.json # 実行履歴
```

## 🔧 主要機能実践

### 選手検索・分析

```bash
# 1. トップの集計ダッシュボード（未ログインで閲覧可）
open http://localhost:5173/
# → 年度別・地域別・ポジション別グラフ。氏名・学校名は含まない

# 2. 高校生一覧（要ログイン・admin グループ）
open http://localhost:5173/highschool-players
# → 学校名・ポジション・都道府県フィルタ
# → 未ログインだと /auth/login へ誘導される

# 3. 大学生一覧（要ログイン・admin グループ）
open http://localhost:5173/university-players
```

### データ更新・スクレイピング

```bash
# 手動データ更新（admin グループのIDトークンが必要）
curl -X POST "http://localhost:5173/api/scraping/trigger" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "both", "year": 2024}'

# 実行履歴確認
curl "http://localhost:5173/api/scraping/history?limit=5" \
  -H "Authorization: Bearer $ID_TOKEN"
```

### AWS環境デプロイ

```bash
# dev環境デプロイ
git push origin develop

# prod環境デプロイ
git tag v1.x.x && git push origin v1.x.x

# デプロイ確認
scripts/verify-lambda-environment.sh dev
```

## 🤖 AI統合（Claude + Gemini）

### コード開発支援

```bash
# コードレビュー
./scripts/gemini review "$(cat src/services/player-service.ts)"

# エラー解析・デバッグ
./scripts/gemini debug "TypeError: Cannot read properties of undefined"

# 技術説明・学習
./scripts/gemini explain "AWS Lambda冷却対策"
```

### 野球業務支援

```bash
# 選手分析支援
./scripts/gemini chat "2024年度高校生投手の傾向分析"

# データ品質確認
./scripts/gemini review "$(cat data/players/highschool/2024.json | head -50)"

# 機能改善提案
./scripts/gemini explain "選手比較機能・AI予測モデル実装方法"
```

## 📊 システム現状確認

### 成功指標（5分後の到達目標）

- ✅ **フロントエンド**: localhost:5173で集計ダッシュボード表示（未ログインで到達可）
- ✅ **データ表示**: ログイン後に高校生・大学生選手一覧表示（admin グループ必須）
- ✅ **テスト通過**: Unit 96.2%・E2E 100%成功
- ✅ **AI連携**: Gemini コマンド実行成功

### パフォーマンス指標

- **開発サーバー起動**: 3-5秒
- **選手データ表示**: 1-2秒（キャッシュ効果）
- **検索・フィルタ**: 即座反応
- **AI支援応答**: 2-5秒

## 🎯 次のステップ

### 開発作業開始

1. **機能開発**: [WORKFLOWS.md](WORKFLOWS.md) - タスク別実行ガイド
2. **システム設計**: [ARCHITECTURE.md](ARCHITECTURE.md) - 詳細技術仕様
3. **デプロイ作業**: [development/DEPLOYMENT.md](development/DEPLOYMENT.md) - AWS運用

### 緊急時対応

- **システム問題**: [EMERGENCY.md](EMERGENCY.md) - 緊急時専用対応
- **日常問題**: [operation/TROUBLESHOOTING.md](operation/TROUBLESHOOTING.md) - 一般的問題解決

### 野球業務深掘り

- **データ分析**: [development/baseball-features/](development/baseball-features/) - 野球特化機能
- **スクレイピング**: [development/SCRIPTS.md](development/SCRIPTS.md) - データ収集詳細

---

**🏆 5分完了おめでとうございます！** プロ野球選手データ管理システムの基本操作をマスターしました。本格的な開発・分析作業を開始できます。
