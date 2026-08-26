# ⚾ 野球業務特化機能ガイド

**作成日**: 2025-06-28 - プロ野球志望届管理システム業務特化  
**目的**: 野球界特有のデータ管理・分析業務の専門機能

> **⚠️ このドキュメントは構想段階のものを多く含む（2026-08-23 追記）**
>
> 実装済みの API は `/health` `/players` `/players/{id}` `/players/search` `/schools`
> `/schools/{school}/players` `/statistics` `/years/available` `/scraping/trigger`
> `/scraping/history` のみ。本文中の `/players/duplicates`・`/players/validate`・
> `/players/similar`・`/players/compare`・`/statistics/prefecture` などのサブパス、
> `/analytics/*`・`/predictions/*`・`/admin/*` は **未実装**（呼ぶと 403 か 404 になる）。
>
> また `/players` 系・`/scraping/*` は **dev / prod とも Cognito 認証必須**で、ID トークンの
> `cognito:groups` に `admin` が必要。以下の `curl` 例はいずれも
> `-H "Authorization: Bearer ${ID_TOKEN}"` を付けないと 401 になる。認証不要なのは
> `GET /health` `GET /statistics` `GET /schools` `GET /years/available` の 4 本だけ。
>
> 本文中の `./scripts/gemini` および `npm run validate:players` は現存しない。

## 📊 野球データ管理の特徴

### プロ志望届制度理解

```
高校生プロ志望届
├── 提出期限: 毎年10月末
├── 対象: 高校3年生
├── データ項目: 氏名・学校・ポジション・身長・体重
└── 年間規模: 約160名

大学生プロ志望届
├── 提出期限: 毎年7月末
├── 対象: 大学4年生・社会人
├── データ項目: 氏名・学校・ポジション・身長・体重
└── 年間規模: 約160名
```

### データ収集の課題

- **更新頻度**: 年1回・期限集中による一括更新
- **データ品質**: 手動入力による誤記・重複リスク
- **地域偏在**: 関東・関西圏の強豪校集中
- **ポジション変更**: 高校→大学でのポジション転向

## 🔍 選手データ管理機能

### 基本検索・フィルタ

```typescript
// 高度検索パラメータ
interface PlayerSearchParams {
  type: 'highschool' | 'university';
  year: number[]; // 複数年度対応
  school?: string; // 学校名部分一致
  prefecture?: string[]; // 複数都道府県
  position?: string[]; // 複数ポジション
  isDraftEligible?: boolean; // ドラフト対象絞り込み
}

// 使用例
const searchParams = {
  type: 'highschool',
  year: [2022, 2023, 2024],
  prefecture: ['大阪府', '兵庫県', '京都府'],
  position: ['投手', '内野手'],
};
```

### 重複選手検出

```bash
# 同名選手の検出・確認
curl "$API_URL/players/duplicates?threshold=0.8" | jq '.data'

# AI支援重複判定
./scripts/gemini review "$(curl '$API_URL/players/duplicates' | jq '.data[0:5]')"
```

### データ品質管理

```bash
# データ整合性チェック
curl "$API_URL/players/validate" | jq '.errors'

# 欠損データ確認
curl "$API_URL/players?type=highschool&year=2024" | jq '.data[] | select(.school == null or .position == null)'

# AI品質分析
./scripts/gemini chat "選手データの品質問題・改善提案"
```

## 📈 統計分析・レポート機能

### 地域別分析

```bash
# 都道府県別選手数
curl "$API_URL/statistics/prefecture" | jq '.data'

# 地域ブロック別集計
curl "$API_URL/statistics/region" | jq '.data'

# 強豪校ランキング
curl "$API_URL/statistics/schools?limit=20" | jq '.data'
```

### ポジション別分析

```bash
# ポジション分布
curl "$API_URL/statistics/position" | jq '.data'

# 年度別ポジショントレンド
for year in 2022 2023 2024; do
  echo "Year $year:"
  curl "$API_URL/statistics/position?year=$year" | jq '.data.pitcher_ratio'
done

# AI分析
./scripts/gemini chat "$(curl '$API_URL/statistics/position' | jq '.data') このポジション分布の傾向分析"
```

### 年度比較・トレンド分析

```bash
# 年度別選手数推移
curl "$API_URL/statistics/yearly-trend" | jq '.data'

# 学校別年度推移
curl "$API_URL/statistics/school-trend?school=智弁学園" | jq '.data'

# AI トレンド分析
./scripts/gemini explain "過去3年間の野球選手志望動向・要因分析"
```

## 🏆 高度分析機能

### 強豪校分析

```typescript
// 強豪校評価指標
interface SchoolAnalytics {
  school: string;
  totalPlayers: number; // 総志望者数
  draftSuccessRate: number; // ドラフト成功率
  positionDiversity: number; // ポジション多様性
  regionalInfluence: number; // 地域影響度
  yearlyConsistency: number; // 年度安定性
}
```

```bash
# 強豪校総合評価
curl "$API_URL/analytics/schools/ranking" | jq '.data[0:10]'

# 特定校詳細分析
curl "$API_URL/analytics/schools/detail?school=智弁学園" | jq '.data'

# AI評価
./scripts/gemini chat "$(curl '$API_URL/analytics/schools/ranking' | jq '.data[0:5]') この強豪校ランキングの妥当性評価"
```

### 選手比較機能

```bash
# 類似選手検索
curl "$API_URL/players/similar?playerId=12345" | jq '.data'

# ポジション別比較
curl "$API_URL/players/compare" \
  -H "Content-Type: application/json" \
  -d '{"playerIds": [123, 456, 789], "metrics": ["school", "prefecture", "year"]}'

# AI比較分析
./scripts/gemini chat "選手比較機能で見つけた類似性・差異の意味分析"
```

### 予測分析（将来機能）

```bash
# ドラフト予測（開発予定）
curl "$API_URL/predictions/draft?year=2025" | jq '.data'

# 地域トレンド予測
curl "$API_URL/predictions/regional-trend" | jq '.data'

# AI予測モデル
./scripts/gemini explain "野球選手データを活用した機械学習予測モデル設計"
```

## 🔄 データ更新・管理ワークフロー

### 年次データ更新（10月・7月）

```bash
# 1. 新年度データ準備
curl -X POST "$API_URL/admin/prepare-year" \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "type": "highschool"}'

# 2. スクレイピング実行・監視
curl -X POST "$API_URL/scraping/trigger" \
  -H "Content-Type: application/json" \
  -d '{"type": "highschool", "year": 2025}'

# 3. データ品質確認・AI検証
./scripts/gemini review "$(curl '$API_URL/players?type=highschool&year=2025' | jq '.data[0:10]')"
```

### 日常メンテナンス

```bash
# データ整合性チェック
npm run validate:players

# 統計情報更新
curl -X POST "$API_URL/statistics/refresh"

# AI品質監視
./scripts/gemini chat "定期的なデータ品質監視・異常検知結果"
```

### データ移行・アーカイブ

```bash
# 古いデータアーカイブ
aws s3 sync s3://pro-candidate-data-prod/players/highschool/2020.json \
           s3://pro-candidate-archive/players/

# AI アーカイブ戦略
./scripts/gemini explain "野球データの長期保存戦略・アクセス最適化"
```

## 📱 フロントエンド野球特化UI

### ダッシュボード設計

- **年度選択**: 現在年度を強調・過去データ比較
- **地域マップ**: 都道府県別選手分布の視覚化
- **ポジション円グラフ**: 投手・野手・捕手の比率表示
- **強豪校ランキング**: 上位校の年度推移表示

### 検索UI最適化

- **学校名自動補完**: 全国高校・大学データベース連携
- **地域フィルタ**: 都道府県・地域ブロック選択
- **ポジション絞り込み**: 野球特有ポジション分類
- **年度範囲選択**: スライダーによる複数年度選択

### レポート機能

- **PDF生成**: 年度別選手一覧・統計レポート（構想）
- **CSV エクスポート**: 認証必須の管理画面（選手管理・学校管理）のみ。公開ページの一括エクスポートは 2026-08-19 に廃止。XLSX 対応は「実装しない」方針で決着済み
- **印刷最適化**: A4サイズでの見やすい選手リスト（構想）

## 🤖 AI支援野球分析

### 自動分析機能

```bash
# 週次自動分析
./scripts/gemini chat "今週の新規志望届・注目選手・トレンド分析"

# 月次レポート
./scripts/gemini chat "月次野球界動向・データ品質・システム改善提案"

# 年次総括
./scripts/gemini chat "年度総括・来年度予測・システム機能拡張提案"
```

### カスタム分析支援

```bash
# 特定テーマ分析
./scripts/gemini chat "関西圏私立高校の野球選手輩出傾向・特徴分析"

# 比較分析
./scripts/gemini chat "コロナ前後での野球志望届数・地域分布変化分析"

# 予測分析
./scripts/gemini explain "来年度の野球選手志望動向・要注目地域予測"
```

---

**⚾ 野球界特有のデータ特性を深く理解し、専門的な分析・管理機能によりプロ野球スカウト・関係者の業務を支援します。**
