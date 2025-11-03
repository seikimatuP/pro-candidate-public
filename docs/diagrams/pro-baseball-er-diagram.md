# プロ野球志望届システム ER図

## システム概要

高校生・大学生のプロ野球志望届データを収集・管理するAWSクラウドネイティブシステムのデータ構造図

## ER図（Entity-Relationship Diagram）

```mermaid
erDiagram
    %% 主要エンティティ（選手データ関連）
    PlayerData {
        string id PK "ID {type}_{year}_{index}"
        string name "選手名"
        string school "学校名"
        string type "タイプ(highschool/university)"
        number year "年度"
        string filingDate "志望届提出日"
        string prefecture "都道府県"
        string region "地域"
        string position "ポジション"
        boolean isDraftEligible "ドラフト対象"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    PlayersDataFile {
        string id PK "ファイルID"
        object metadata "メタデータ"
        array players "選手データ配列"
        number year FK "年度"
        string type FK "選手タイプ"
        number totalCount "総件数"
        datetime lastUpdated "最終更新"
        string version "バージョン"
    }

    PlayersIndex {
        string type PK "選手タイプ"
        array availableYears "利用可能年度"
        number totalRecords "総レコード数"
        number latestYear "最新年度"
        datetime lastUpdated "最終更新"
        array files "ファイル情報"
    }

    %% スクレイピング履歴関連
    ScrapingHistory {
        string id PK "実行ID"
        datetime timestamp "実行完了時刻"
        string type "実行タイプ"
        string environment "環境(dev/prod)"
        number duration "実行時間(秒)"
        object results "結果詳細"
        object summary "サマリー"
        string triggeredBy "トリガー"
    }

    PreviousCount {
        string id PK "カウントID"
        number count "前回件数"
        datetime timestamp "記録時刻"
        array playerNames "選手名リスト"
        string type FK "選手タイプ"
        string environment FK "環境"
    }

    HistoryIndex {
        string environment PK "環境"
        number totalRecords "総レコード数"
        datetime lastUpdated "最終更新"
        array records "履歴レコード"
    }

    %% ストレージ・システム管理
    S3Metadata {
        string key PK "S3キー"
        number size "ファイルサイズ"
        datetime lastModified "最終更新"
        string contentType "コンテンツタイプ"
    }

    ScrapingStatus {
        string id PK "ステータスID"
        datetime lastRun "最終実行"
        string status "実行状態"
        object results "実行結果"
        datetime nextScheduledRun "次回予定"
    }

    AppSettings {
        string version PK "バージョン"
        string environment "環境"
        object features "機能設定"
        object limits "制限設定"
        object scraping "スクレイピング設定"
    }

    %% リレーションシップ定義（主要な関係）
    PlayersDataFile ||--o{ PlayerData : contains
    PlayersIndex ||--o{ PlayersDataFile : references
    S3Metadata ||--|| PlayersDataFile : describes

    %% スクレイピング履歴の関係
    ScrapingHistory ||--o{ PreviousCount : uses
    HistoryIndex ||--o{ ScrapingHistory : indexes
    ScrapingStatus ||--|| ScrapingHistory : tracks

    %% システム設定の関係
    AppSettings ||--o{ ScrapingStatus : configures
    PlayerData }o--o{ ScrapingHistory : tracked_in
```

## エンティティ詳細説明

### 主要エンティティ

#### 1. PlayerData（選手データ）

- **主キー**: id（一意識別子）
- **機能**: 個々の選手情報を管理
- **特徴**: 高校生・大学生両方に対応、ドラフト対象者フラグ付き

#### 2. PlayersDataFile（選手データファイル）

- **機能**: S3に保存される年度別・タイプ別のデータファイル
- **構造**: メタデータ + 選手データ配列
- **関係**: 複数のPlayerDataを含む

#### 3. PlayersIndex（選手インデックス）

- **機能**: 利用可能なデータファイルのインデックス管理
- **用途**: 年度選択UI、データ検索最適化

### 履歴管理エンティティ

#### 4. ScrapingHistory（スクレイピング履歴）

- **機能**: 実行履歴の詳細記録・差分計算
- **環境分離**: dev/prod環境別管理

#### 5. PreviousCount（前回件数データ）

- **機能**: 差分計算用データ・前回実行比較

### システム管理エンティティ

#### 6. S3Metadata（S3メタデータ）

- **機能**: S3オブジェクト情報管理
- **用途**: ファイルサイズ・更新日時追跡

#### 7. AppSettings（アプリケーション設定）

- **機能**: システム設定管理
- **範囲**: 機能フラグ・制限値・スクレイピング設定

## データフロー概要

### 1. データ収集フロー

```
スクレイピング実行 → PlayerData生成 → PlayersDataFile作成 → S3保存 → PlayersIndex更新
```

### 2. 履歴記録フロー

```
スクレイピング完了 → PreviousCountData参照 → 差分計算 → ScrapingHistoryRecord作成 → ScrapingHistoryIndex更新
```

### 3. データ検索フロー

```
PlayersIndex参照 → 対象ファイル特定 → PlayersDataFile読み込み → PlayerData抽出
```

## 技術特徴

- **S3ベースアーキテクチャ**: NoSQLからJSONファイルベースへ移行
- **環境分離**: dev/prod環境の完全分離
- **履歴追跡**: 詳細な変更履歴と差分計算
- **型安全性**: TypeScriptによる完全な型定義
- **AWS統合**: Lambda、S3、API Gatewayとの統合

## データ整合性

- PlayerDataのidは`{type}_{year}_{index}`形式で一意性保証
- 環境別（dev/prod）データ分離によるテスト安全性確保
- メタデータによるファイル整合性チェック
- インデックスファイルによる高速検索対応

---

_このER図はプロ野球志望届システム v1.2.84+ のデータ構造を表現_
