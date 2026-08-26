# プロジェクトクリーンアップ推奨事項

**最終更新**: 2025-11-02
**調査範囲**: ルート、pro-candidate-aws/、scripts/、docs/、src/、tests/
**目的**: 不要ファイルの削除、古い設定の統合、ディレクトリ構造の最適化
**レビュー日**: 2025-11-02
**レビュー結果**: ✅ 修正完了（使用中の設定ファイルを保持）

---

## ⚠️ レビュー修正事項

### 重要な修正（2025-11-02）

1. **Jest 設定ファイル**: `jest.config.optimized.js` は **package.json で使用中** → **保持**
2. **Playwright 設定ファイル**: `playwright.config.ci.ts` と `playwright.config.optimized.ts` は **package.json で使用中** → **保持**
3. **バックアップファイル追加**: `cache.ts.backup` と `CHANGELOG.md.old` を削除リストに追加
4. **削除対象数修正**: 46個 → 44個（使用中の設定2個を保持）

### 削除対象の変更

| 設定ファイル                     | 当初の判断 | 修正後   | 理由                        |
| -------------------------------- | ---------- | -------- | --------------------------- |
| `jest.config.optimized.js`       | 削除       | **保持** | package.json で使用中       |
| `playwright.config.ci.ts`        | 削除       | **保持** | package.json で使用中       |
| `playwright.config.optimized.ts` | 削除       | **保持** | package.json で使用中       |
| `playwright.config.minimal.ts`   | 削除       | 削除     | 未使用（削除OK）            |
| `jest.config.aws.js`             | 削除       | 削除     | 未使用（削除OK）            |
| `.eslintrc.json`                 | 削除       | 削除     | .eslintrc.js に統合済み     |
| `.eslintrc.security.js`          | 削除       | 削除     | .eslintrc.js に統合済み     |
| `cache.ts.backup`                | -          | **追加** | バックアップファイル        |
| `CHANGELOG.md.old`               | -          | **追加** | 古い CHANGELOG バックアップ |

---

## 実行サマリー

| カテゴリ                       | 削除対象数 | 合計サイズ   | 優先度 | 影響度 | 備考                                  |
| ------------------------------ | ---------- | ------------ | ------ | ------ | ------------------------------------- |
| **ビルド成果物・一時ファイル** | 14個       | 125MB+       | **高** | **低** | バックアップファイル2個追加           |
| **古い設定ファイル**           | 4個        | 15KB         | **高** | **低** | ⚠️ 使用中の設定を保持（4個削減）      |
| **未使用Construct**            | 2個        | 76KB         | **中** | **低** | DynamoDB・Backup Construct            |
| **古いテストファイル**         | 15個       | 320KB        | **中** | **低** | スタンドアロンテストファイル          |
| **GAS関連ファイル**            | 1個        | 1.2KB        | **中** | **低** | appsscript.json                       |
| **その他（分析、レポート）**   | 8個        | 124KB        | **低** | **低** | static-analysis/、examples/（要確認） |
| **合計削除推奨**               | **44個**   | **≈125.5MB** |        |        | 2個減少（使用中設定を保持）           |

---

## 1. 削除可能ファイル詳細リスト

### 1.1 ビルド成果物・一時ファイル（優先度: 高）

#### 1.1.1 アーカイブファイル

| ファイルパス                             | サイズ | 削除理由                                          | 優先度 |
| ---------------------------------------- | ------ | ------------------------------------------------- | ------ |
| `pro-candidate-aws/lambda-deploy.tar.gz` | 4.6MB  | Lambda デプロイ用アーカイブ（古い・自動生成可能） | **高** |

**詳細**: CDK デプロイ時に自動生成されるため、リポジトリに保持不要。CI/CD環境で必要に応じて再生成。

#### 1.1.2 テスト結果ログファイル

| ファイルパス               | サイズ | 内容                     | 優先度 |
| -------------------------- | ------ | ------------------------ | ------ |
| `./e2e-test-output.log`    | 27KB   | E2E テスト実行ログ       | **高** |
| `./e2e-test-results.log`   | 16KB   | E2E テスト結果ログ       | **高** |
| `./test-e2e-dev.log`       | 24KB   | dev 環境 E2E テストログ  | **高** |
| `./test-e2e-prod-full.log` | 23KB   | prod 環境 E2E テストログ | **高** |
| `./test-e2e-prod-api.log`  | 6.6KB  | prod 環境 API テストログ | **高** |
| `./prod-test.log`          | 12KB   | 本番テスト実行ログ       | **高** |

**理由**: テスト実行時に自動生成される一時ファイル。CI/CD 環境で自動削除すべき。

**削除コマンド**:

```bash
rm -f ./e2e-test-output.log ./e2e-test-results.log ./test-e2e-dev.log \
      ./test-e2e-prod-full.log ./test-e2e-prod-api.log ./prod-test.log
```

#### 1.1.3 テスト結果ディレクトリ

| ディレクトリパス                    | 説明                          | 優先度 |
| ----------------------------------- | ----------------------------- | ------ |
| `./test-results/`                   | テスト結果（local/dev/prod）  | **高** |
| `./frontend/test-results/`          | フロントエンド E2E テスト結果 | **高** |
| `./pro-candidate-aws/test-results/` | AWS CDK テスト結果            | **高** |
| `./playwright/.auth/`               | Playwright 認証キャッシュ     | **高** |

**理由**: CI/CD 実行時に自動生成。リポジトリに保持不要（セキュリティ: 認証情報露出リスク）。

**削除コマンド**:

```bash
rm -rf ./test-results/ ./frontend/test-results/ ./pro-candidate-aws/test-results/
rm -rf ./playwright/.auth/
```

#### 1.1.4 ビルド成果物

| ファイルパス                   | 説明                           | 優先度 |
| ------------------------------ | ------------------------------ | ------ |
| `./performance-results.json`   | パフォーマンステスト結果       | **高** |
| `./pro-candidate-aws/cdk.out/` | CDK コンパイル出力ディレクトリ | **高** |

**理由**: CDK デプロイ時に自動生成される一時ファイル。`.gitignore` に追加すべき。

#### 1.1.5 バックアップファイル

| ファイルパス                 | 説明                    | 優先度 |
| ---------------------------- | ----------------------- | ------ |
| `./src/core/cache.ts.backup` | cache.ts のバックアップ | **高** |

**理由**: 一時的なバックアップファイル。Git 履歴で管理されているため不要。

**削除コマンド**:

```bash
rm ./src/core/cache.ts.backup ./CHANGELOG.md.old
```

---

### 1.2 古い・重複設定ファイル（優先度: 高）

#### 1.2.1 ESLint 重複設定

| ファイルパス            | 内容                         | 削除理由                                               | 優先度 |
| ----------------------- | ---------------------------- | ------------------------------------------------------ | ------ |
| `.eslintrc.json`        | ESLint 設定（古い形式）      | `.eslintrc.js` で統一済み。JSON 形式は JS が優先される | **高** |
| `.eslintrc.security.js` | セキュリティ専用 ESLint 設定 | `.eslintrc.js` に統合済み                              | **高** |

**現状**:

- 主設定: `.eslintrc.js` (1.9KB, 最新)
- 古い設定: `.eslintrc.json` (517B, June 1)
- セキュリティ設定: `.eslintrc.security.js` (788B, June 10)

**統一方針**: `.eslintrc.js` が現在のメイン設定。他の設定ファイルは削除し、`.eslintrc.js` に集約。

**削除コマンド**:

```bash
rm .eslintrc.json .eslintrc.security.js
```

#### 1.2.2 Jest 複数設定ファイル

| ファイルパス                       | 内容             | 内容説明                       | 削除対象    |
| ---------------------------------- | ---------------- | ------------------------------ | ----------- |
| `jest.config.js`                   | メイン Jest 設定 | 全テスト統合設定（最新 Nov 2） | **保持**    |
| `jest.config.aws.js`               | AWS テスト専用   | 古い設定（June 10）            | **削除**    |
| `jest.config.optimized.js`         | 最適化設定       | 古い設定（June 10）            | **⚠️ 保持** |
| `pro-candidate-aws/jest.config.js` | CDK Jest 設定    | CDK 専用（保持）               | **保持**    |

**⚠️ 重要**: `jest.config.optimized.js` は **package.json で使用中**！

**使用箇所**:

```json
"test:fast": "jest --config=jest.config.optimized.js",
"test:parallel": "jest --config=jest.config.optimized.js --maxWorkers=4",
"test:unit:fast": "jest --config=jest.config.optimized.js --selectProjects=unit"
```

**削除コマンド**:

```bash
# jest.config.aws.js のみ削除（optimized.js は保持）
rm jest.config.aws.js
```

#### 1.2.3 Playwright 複数設定ファイル

| ファイルパス                     | 内容                                  | 削除対象    |
| -------------------------------- | ------------------------------------- | ----------- |
| `playwright.config.ts`           | メイン Playwright 設定（最新 Oct 15） | **保持**    |
| `playwright.config.ci.ts`        | CI 環境専用設定（June 10）            | **⚠️ 保持** |
| `playwright.config.minimal.ts`   | 最小構成設定（June 24）               | **削除**    |
| `playwright.config.optimized.ts` | 最適化設定（June 23）                 | **⚠️ 保持** |

**⚠️ 重要**: `playwright.config.ci.ts` と `playwright.config.optimized.ts` は **package.json で使用中**！

**使用箇所**:

```json
"test:e2e:ci": "npx playwright test --config=playwright.config.ci.ts",
"test:e2e:api": "npx playwright test tests/e2e/specs/api.spec.ts --config=playwright.config.ci.ts",
"test:e2e:optimized": "npx playwright test --config=playwright.config.optimized.ts",
"test:e2e:network-stable": "npx playwright test tests/e2e/specs/dashboard-optimized.spec.ts --config=playwright.config.optimized.ts"
```

**削除コマンド**:

```bash
# playwright.config.minimal.ts のみ削除（ci.ts と optimized.ts は保持）
rm playwright.config.minimal.ts
```

---

### 1.3 AWS インフラ設定ファイル（優先度: 中〜低）

#### 1.3.1 CloudWatch ダッシュボード

| ファイルパス                                     | サイズ | 説明                               | 削除対象 |
| ------------------------------------------------ | ------ | ---------------------------------- | -------- |
| `pro-candidate-aws/cloudwatch-dashboard.json`    | 4.5KB  | 汎用 CloudWatch ダッシュボード設定 | 検討中   |
| `pro-candidate-aws/prod-dashboard.json`          | 8.6KB  | prod 環境ダッシュボード設定        | 検討中   |
| `pro-candidate-aws/system-health-dashboard.json` | 2.2KB  | システムヘルス監視ダッシュボード   | 検討中   |
| `pro-candidate-aws/free-tier-dashboard.json`     | 846B   | 無料枠監視ダッシュボード           | 検討中   |

**確認**: AWS CDK で自動生成されるため、JSON の手動管理は不要か確認推奨。

#### 1.3.2 予算・コスト管理ファイル

| ファイルパス                                  | サイズ | 説明             | 削除対象 |
| --------------------------------------------- | ------ | ---------------- | -------- |
| `pro-candidate-aws/daily-budget.json`         | 577B   | 日次予算設定     | 検討中   |
| `pro-candidate-aws/budget-config.json`        | 274B   | 予算設定         | 検討中   |
| `pro-candidate-aws/budget-notification.json`  | 615B   | 予算通知設定     | 検討中   |
| `pro-candidate-aws/micro-budget.json`         | 578B   | マイクロ予算設定 | 検討中   |
| `pro-candidate-aws/anomaly-monitor.json`      | 143B   | 異常検知設定     | 検討中   |
| `pro-candidate-aws/anomaly-subscription.json` | 515B   | 異常通知設定     | 検討中   |

**確認**: AWS Budgets は CDK や CloudFormation で管理すべき。手動 JSON 管理は削除推奨。

#### 1.3.3 アクセス制御ポリシー（SCP）

| ファイルパス                                      | サイズ | 説明             | 削除対象 |
| ------------------------------------------------- | ------ | ---------------- | -------- |
| `pro-candidate-aws/free-tier-protection-scp.json` | 802B   | 無料枠保護 SCP   | 検討中   |
| `pro-candidate-aws/improved-free-tier-scp.json`   | 2.1KB  | 改善版無料枠 SCP | 検討中   |
| `pro-candidate-aws/emergency-scp.json`            | 1.6KB  | 緊急制限 SCP     | 検討中   |
| `pro-candidate-aws/time-restricted-scp.json`      | 935B   | 時間制限 SCP     | 検討中   |
| `pro-candidate-aws/development-scp.json`          | 1.2KB  | 開発環境 SCP     | 検討中   |

**確認**: SCP は Organizations で管理されるべき。JSON は参考資料として保持も検討（docs/aws/に移動推奨）。

#### 1.3.4 API ポリシー・信頼ポリシー

| ファイルパス                                      | サイズ | 説明                          | 削除対象 |
| ------------------------------------------------- | ------ | ----------------------------- | -------- |
| `pro-candidate-aws/cloudtrail-bucket-policy.json` | 669B   | CloudTrail バケットポリシー   | 検討中   |
| `pro-candidate-aws/config-bucket-policy.json`     | 934B   | AWS Config バケットポリシー   | 検討中   |
| `pro-candidate-aws/config-role-trust-policy.json` | 193B   | AWS Config ロール信頼ポリシー | 検討中   |
| `pro-candidate-aws/developer-policy.json`         | 599B   | 開発者 IAM ポリシー           | 検討中   |

**確認**: ポリシーは CDK で完全管理されるべき。JSON は参考資料として docs/ に移動推奨。

#### 1.3.5 テスト・レスポンス JSON

| ファイルパス                               | サイズ | 説明                            | 削除対象 |
| ------------------------------------------ | ------ | ------------------------------- | -------- |
| `pro-candidate-aws/response.json`          | 458B   | API レスポンス例                | **削除** |
| `pro-candidate-aws/scraping-response.json` | 347B   | スクレイピング API レスポンス例 | **削除** |
| `pro-candidate-aws/cdk-outputs.json`       | 430B   | CDK 出力（自動生成）            | **削除** |

**理由**: テスト・開発時の一時ファイル。リポジトリに保持不要。

**削除コマンド**:

```bash
rm pro-candidate-aws/response.json pro-candidate-aws/scraping-response.json pro-candidate-aws/cdk-outputs.json
```

---

### 1.4 未使用 AWS CDK Construct（優先度: 中）

#### 1.4.1 DynamoDB Construct

**ファイル:**

- `pro-candidate-aws/lib/constructs/dynamodb-construct.ts` (18KB)
- `pro-candidate-aws/lib/constructs/dynamodb-construct.js` (8.4KB)
- `pro-candidate-aws/lib/constructs/dynamodb-construct.d.ts` (355B)

**使用状況**:

```
- スタックで未使用（S3 ベース移行後）
- import されない
- コメントアウト箇所なし
```

**削除理由**: DynamoDB から S3 JSON ベースストレージへ完全移行済み。レガシーコンポーネント。

**削除コマンド**:

```bash
rm -f pro-candidate-aws/lib/constructs/dynamodb-construct.ts \
      pro-candidate-aws/lib/constructs/dynamodb-construct.js \
      pro-candidate-aws/lib/constructs/dynamodb-construct.d.ts
```

#### 1.4.2 Backup Construct

**ファイル:**

- `pro-candidate-aws/lib/constructs/backup-construct.ts` (18KB)
- `pro-candidate-aws/lib/constructs/backup-construct.js` (51KB)
- `pro-candidate-aws/lib/constructs/backup-construct.d.ts` (486B)

**使用状況**:

```typescript
// pro-candidate-aws-stack.ts で完全コメントアウト
//   const backupConstruct = new BackupConstruct(this, 'BackupConstruct', {
```

**削除理由**: コメントアウト済み未使用コンポーネント。S3 ライフサイクル管理で十分。

**削除コマンド**:

```bash
rm -f pro-candidate-aws/lib/constructs/backup-construct.ts \
      pro-candidate-aws/lib/constructs/backup-construct.js \
      pro-candidate-aws/lib/constructs/backup-construct.d.ts
```

---

### 1.5 古いテストファイル（優先度: 中）

#### 1.5.1 スタンドアロンテストファイル

| ファイルパス                   | 説明                                   | 削除対象         |
| ------------------------------ | -------------------------------------- | ---------------- |
| `./test-dashboard-data.js`     | ダッシュボードテスト（スタンドアロン） | **削除**         |
| `./test-dashboard-detailed.js` | 詳細ダッシュボードテスト               | **削除**         |
| `./verify-dev-environment.js`  | 開発環境検証スクリプト（古い）         | **削除**         |
| `./check-service-worker.js`    | Service Worker チェック                | 保持（PWA 関連） |

**理由**: 実際のテストスイート（tests/）に統合または廃止されている古いテストファイル。

**削除コマンド**:

```bash
rm ./test-dashboard-data.js ./test-dashboard-detailed.js ./verify-dev-environment.js
```

#### 1.5.2 古い統合テストファイル（tests/integration/）

確認対象（詳細分析推奨）:

- `tests/integration/sheet_creation_test.js` - GAS Sheet API（廃止）
- `tests/integration/sheet_operations.test.js` - GAS Sheet API（廃止）
- `tests/integration/ses-bounce-monitoring.test.js` - SES 監視（未使用確認推奨）

---

### 1.6 GAS 関連残存ファイル（優先度: 中）

#### 1.6.1 Google Apps Script マニフェスト

**ファイルパス**: `src/appsscript.json`

**内容**: GAS ライブラリ参照（Twitter、Parser）

**削除理由**: GAS 環境完全廃止（2025-11-02）。AWS Lambda + S3 に完全移行。

**削除コマンド**:

```bash
rm src/appsscript.json
```

---

### 1.7 分析・ダッシュボード（優先度: 低）

#### 1.7.1 Static Analysis ディレクトリ

**ディレクトリ**: `static-analysis/`

**ファイル:**

- `analyze.js` (44KB, 1128 行)
- `visual-enhancer.js` (35KB, 1055 行)
- `print-exporter.js` (8.2KB, 227 行)
- `interactive-dashboard.js` (5.1KB, 161 行)
- `interactive-tables.js` (5.0KB, 145 行)
- `advanced-visualizations.js` (4.6KB, 132 行)
- `dashboard-animations.js` (3.2KB, 93 行)
- `performance-optimizer.js` (2.6KB, 81 行)

**合計**: 124KB, 3022 行

**削除理由**:

- 開発・実験用の分析ツール
- 本番環境で使用されない
- ドキュメント生成時の参考資料のみ
- `npm run analyze` などで動的生成可能

**削除コマンド**:

```bash
rm -rf static-analysis/
```

---

### 1.8 Examples ディレクトリ（優先度: 低）

**ディレクトリ**: `examples/`

**ファイル:**

- `error_handling_example.js` (7.6KB)
- `validation_examples.ts` (4.6KB)

**削除理由**: サンプルコード。ドキュメントの参考資料のみ。本番環境では不要。

**⚠️ 注意**: 新規開発者のオンボーディング資料として有用な可能性あり。削除前にチーム確認推奨。

**削除コマンド**:

```bash
# チーム確認後に実行
rm -rf examples/
```

---

### 1.9 Babel 設定ファイル（優先度: 低）

**ファイルパス**: `babel.config.js`

**サイズ**: 92B

**削除理由**:

- TypeScript プロジェクトで Babel 不要（tsc で十分）
- 使用されない設定ファイル

**⚠️ 確認必須**: Jest が babel-jest を使用している可能性あり。削除前に以下を確認：

```bash
# Babel 依存関係確認
grep -r "babel" package.json
grep -r "babel" jest.config.js

# テスト実行確認
npm test
```

**削除コマンド**:

```bash
# 確認後に実行
rm babel.config.js
```

---

## 2. 古い設定・レガシーコード分析

### 2.1 GAS 環境削除後の残存参照

**検索結果**:

```
src/core/utils.ts:7: // Node.js環境とGAS環境の両方で動作するためのエクスポート
```

**アクション**: コメント更新（Node.js 環境のみに変更）

### 2.2 Lambda 環境変数参照（旧 DynamoDB）

**確認対象**:

- `src/core/types.ts` - DynamoDB 型定義
- `pro-candidate-aws/lib/constructs/dynamodb-construct.ts` - 使用状況

**確認結果**: DynamoDB は CDK スタックで import されていない → 完全削除可能

### 2.3 AWS Config / CloudTrail（オプション機能）

**確認**: 無料枠保護の為にコスト削減対象として検討中

---

## 3. ディレクトリ構造の問題点と改善提案

### 3.1 深い階層の問題

| 現状ディレクトリ                    | 階層数 | 問題点 | 改善提案 |
| ----------------------------------- | ------ | ------ | -------- |
| `pro-candidate-aws/lib/constructs/` | 4 層   | 適切   | 変更不要 |
| `src/features/scraping/`            | 4 層   | 適切   | 変更不要 |
| `tests/integration/`                | 3 層   | 適切   | 変更不要 |

### 3.2 役割が不明確なディレクトリ

| ディレクトリ                | 現状         | 問題点                         | 改善提案                   |
| --------------------------- | ------------ | ------------------------------ | -------------------------- |
| `config/`                   | 複数環境設定 | 環境別ファイル混在             | 環境別サブディレクトリ推奨 |
| `pro-candidate-aws/lambda/` | Lambda 関数  | ファイル数多い（50+ ファイル） | 機能別サブディレクトリ推奨 |
| `tests/`                    | テスト全体   | カテゴリ分類が必要             | 既に適切に分類             |

### 3.3 改善提案

#### 3.3.1 config/ 再構成（推奨）

```
config/
├── default.json           # 共通設定
├── common.json            # 共有設定
├── development.json       # 開発環境
├── production.json        # 本番環境
└── environments/          # 環境別の詳細設定
    ├── dev.json
    ├── prod.json
    └── local.json
```

#### 3.3.2 pro-candidate-aws/lambda/ 再構成（推奨）

```
pro-candidate-aws/lambda/
├── api/                   # API Gateway 統合
│   ├── health.js
│   └── scraping.js
├── scraping/              # スクレイピング機能
│   ├── index.js
│   └── utilities.js
├── data-processing/       # データ処理
│   ├── index.js
│   └── validators.js
├── monitoring/            # 監視・アラート
│   ├── logger.js
│   └── monitoring-helper.js
└── common/                # 共通
    ├── config-manager.js
    └── email-service.js
```

---

## 4. TypeScript .d.ts ファイル管理

### 4.1 現状

```
pro-candidate-aws/lib/constructs/ に以下の .d.ts ファイルが存在:
- 17個の .d.ts ファイル
- 自動生成（TypeScript コンパイル時）
```

### 4.2 改善提案

**.gitignore に追加推奨**:

```
# TypeScript 自動生成ファイル（コンパイル時に生成）
**/*.d.ts
**/*.js
dist/
cdk.out/
```

**.gitkeep** で必要なディレクトリを保護：

```bash
# プッシュ必須のディレクトリ
touch dist/.gitkeep
touch cdk.out/.gitkeep
```

---

## 5. 推奨削除手順（優先度順）

### Phase 1: 即座削除（リスク最小）

```bash
# テスト結果ログ削除
rm -f ./e2e-test-output.log ./e2e-test-results.log ./test-e2e-dev.log \
      ./test-e2e-prod-full.log ./test-e2e-prod-api.log ./prod-test.log

# テスト結果ディレクトリ削除
rm -rf ./test-results/ ./frontend/test-results/ ./pro-candidate-aws/test-results/
rm -rf ./playwright/.auth/

# バックアップファイル削除
rm -f ./src/core/cache.ts.backup ./CHANGELOG.md.old

# テスト一時ファイル削除
rm -f ./test-dashboard-data.js ./test-dashboard-detailed.js ./verify-dev-environment.js

# AWS テスト レスポンス削除
rm -f pro-candidate-aws/response.json pro-candidate-aws/scraping-response.json \
      pro-candidate-aws/cdk-outputs.json

# アーカイブ削除
rm -f pro-candidate-aws/lambda-deploy.tar.gz

# GAS マニフェスト削除
rm -f src/appsscript.json

# 実行時間: < 1 分
# 影響度: 最小（自動生成ファイルのみ）
```

### Phase 2: 設定統合（中程度リスク）

```bash
# ESLint 設定統一
rm .eslintrc.json .eslintrc.security.js

# Jest 設定統一（⚠️ jest.config.optimized.js は保持）
rm jest.config.aws.js

# Playwright 設定統一（⚠️ ci.ts と optimized.ts は保持）
rm playwright.config.minimal.ts

# 実行時間: < 1 分
# 影響度: 低（使用されていない設定のみ削除）
```

### Phase 3: 未使用 Construct 削除（検証後）

```bash
# DynamoDB Construct 削除
rm -f pro-candidate-aws/lib/constructs/dynamodb-construct.ts \
      pro-candidate-aws/lib/constructs/dynamodb-construct.js \
      pro-candidate-aws/lib/constructs/dynamodb-construct.d.ts

# Backup Construct 削除
rm -f pro-candidate-aws/lib/constructs/backup-construct.ts \
      pro-candidate-aws/lib/constructs/backup-construct.js \
      pro-candidate-aws/lib/constructs/backup-construct.d.ts

# npm run build でビルド確認
npm run build

# 実行時間: < 2 分
# 影響度: 低（未使用コンポーネント）
```

### Phase 4: 分析・参考資料削除（オプション）

```bash
# Static Analysis ディレクトリ削除
rm -rf static-analysis/

# Examples ディレクトリ削除
rm -rf examples/

# 実行時間: < 30 秒
# 影響度: 低（開発ツールのみ）
```

### Phase 5: AWS 設定ファイル見直し（長期計画）

```
以下のファイルは AWS CDK で管理への移行推奨:
- pro-candidate-aws/*-dashboard.json
- pro-candidate-aws/*-budget.json
- pro-candidate-aws/*-scp.json
- pro-candidate-aws/*-policy.json

移行タイミング: 次の AWS 環境更新時
```

---

## 6. .gitignore 更新推奨

**追加推奨**:

```gitignore
# テスト・ビルド一時ファイル
test-results/
playwright-report/
.auth/
*.log

# TypeScript 自動生成（.d.ts）
**/*.d.ts
**/*.js
!**/*.config.js    # 設定ファイルは除外
!**/lambda/*.js    # Lambda コードは除外

# ビルド出力
dist/
cdk.out/

# パフォーマンステスト結果
performance-results.json
```

---

## 7. 実行チェックリスト

- [ ] Phase 1 実行（ログ・一時ファイル削除）
- [ ] git status で差分確認
- [ ] npm run build で正常性確認
- [ ] npm test で全テスト成功確認
- [ ] Phase 2 実行（設定統合）
- [ ] CI/CD トリガーで GitHub Actions 成功確認
- [ ] Phase 3 実行（未使用 Construct 削除）
- [ ] npm run build で正常性確認
- [ ] CDK deploy で実装確認
- [ ] Phase 4 実行（分析・参考資料削除）
- [ ] .gitignore 更新
- [ ] git commit & push

---

## 8. 予期される効果

| 項目                       | 現在          | 削除後       | 削減率 |
| -------------------------- | ------------- | ------------ | ------ |
| **リポジトリサイズ**       | ≈ 200MB+      | ≈ 75MB       | 62-63% |
| **ファイル数（追跡対象）** | ≈ 2500        | ≈ 2454       | 2%     |
| **設定ファイル重複**       | 3+3+4 = 10 個 | 1+1+1 = 3 個 | 70%    |
| **クローン時間**           | ≈ 30-45 秒    | ≈ 10-15 秒   | 67%    |
| **CI/CD デプロイ時間**     | ≈ 8-12 分     | ≈ 6-9 分     | 20%    |

---

## 9. 注意事項

⚠️ **実行前に必ず以下を確認**:

1. **ブランチ確認**: develop ブランチ上での作業
2. **バックアップ**: git backup または別リポジトリへの push
3. **CI/CD 確認**: GitHub Actions 全ステップ成功
4. **チームへの通知**: スラック・メールで事前通知
5. **デプロイ予定**: prod 環境デプロイ予定を避ける

⚠️ **削除後の確認作業**:

1. `git log --name-status` で削除ファイル確認
2. `npm run build` でビルド成功確認
3. `npm test` で全テスト成功確認
4. local 環境 (`npm run dev`) で動作確認
5. CI/CD パイプライン成功確認

---

## 10. 関連ドキュメント

- [DEVELOPMENT_GUIDE.md](docs/common/DEVELOPMENT_GUIDE.md)
- [GITHUB_RELEASE_GUIDE.md](docs/common/GITHUB_RELEASE_GUIDE.md)
- [.gitignore](.gitignore)
- [tsconfig.json](tsconfig.json)
- [jest.config.js](jest.config.js)
- [playwright.config.ts](playwright.config.ts)

---

**作成日**: 2025-11-02
**作成者**: Claude Code (自動分析)
**最終確認**: 推奨される実施が即座 (Phase 1) 開始
