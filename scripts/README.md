# Scripts ディレクトリ

## 概要

このディレクトリには、プロジェクトの開発・運用・保守で使用するスクリプトが含まれています。

## カテゴリ別スクリプト一覧

### 🚀 必須・頻繁に使用するスクリプト

| スクリプト名                     | 用途                             | 使用頻度 |
| -------------------------------- | -------------------------------- | -------- |
| `verify-lambda-environment.sh`   | Lambda環境検証・S3データ更新確認 | 高       |
| `run-e2e-test.sh`                | E2Eテスト実行（環境別）          | 高       |
| `get-e2e-env.sh`                 | E2E環境変数取得                  | 中       |
| `serve-e2e-reports.js`           | E2Eレポート配信サーバー          | 中       |
| `cleanup-dependabot-branches.sh` | Dependabotブランチ整理           | 中       |
| `gemini-direct-client.js`        | Gemini AI直接実行                | 中       |
| `mcp-client.js`                  | MCPクライアント                  | 中       |

### 🔧 AWS管理・最適化

| スクリプト名                    | 用途                   | 状態 |
| ------------------------------- | ---------------------- | ---- |
| `aws-free-tier-optimization.sh` | 無料枠最適化           | 現役 |
| `cloudwatch-optimize.sh`        | CloudWatch最適化       | 現役 |
| `aws-health-monitor.js`         | AWSヘルスモニター      | 現役 |
| `fix-spa-settings.sh`           | SPA設定修正            | 保留 |
| `verify-s3-website-config.sh`   | S3ウェブサイト設定確認 | 現役 |

### 🧪 テスト・品質管理

| スクリプト名            | 用途               | 状態 |
| ----------------------- | ------------------ | ---- |
| `run-sonar.js`          | SonarQube分析実行  | 現役 |
| `quality-gate-check.js` | 品質ゲートチェック | 現役 |
| `analyze.sh`            | コード分析         | 現役 |
| `memory-test.js`        | メモリテスト       | 保留 |
| `optimize-tests.js`     | テスト最適化       | 保留 |

### 🔍 experimental（実験的）

| スクリプト名                  | 用途                   | 状態 |
| ----------------------------- | ---------------------- | ---- |
| `markitdown-direct.js`        | Markdownダイレクト変換 | 実験 |
| `playwright-advanced-test.js` | Playwright高度テスト   | 実験 |
| `voicevox-test.js`            | VOICEVOX音声合成テスト | 実験 |
| `youtube-info.js`             | YouTube情報取得        | 実験 |
| `yahoo-test.js`               | Yahoo APIテスト        | 実験 |

### 📦 整理・削除候補

以下のスクリプトは重複、古い、または一時的な目的で作成されたため、削除を検討：

1. **重複するSonarQube関連**:

   - `debug-sonar.js` → `run-sonar.js`に統合可能
   - `fix-jest-sonar.js` → 一時修正用、不要
   - `run-sonar-with-errors.js` → `run-sonar.js`のオプションで対応可能
   - `generate-sonar-test-report.js` → `run-sonar.js`に含まれる
   - `clear-sonar-env.js` → 一時的な環境クリア、不要

2. **一時的な修正スクリプト**:

   - `fix-security-warnings.sh` → 一度実行済み、不要
   - `fix-github-actions-iam.sh` → 初期設定済み、不要

3. **古い/未使用**:

   - `archive_js_files.js` → 既に実行済み、不要
   - `cleanup_repository.js` → 一度だけ実行、不要
   - `generate_docs.sh` → npm run docsで代替
   - `generate_analysis_report.js` → analyze.shに統合
   - `setup_environment.sh` → 初期設定済み、不要
   - `install-dependencies.sh` → npm installで十分
   - `run_e2e_tests.js` → run-e2e-test.shで代替

4. **AWS一時スクリプト**:

   - `aws-config-optimization.sh` → aws-free-tier-optimization.shに統合
   - `cloudtrail-cost-optimization.sh` → 一度実行済み、不要
   - `s3-lifecycle-optimization.sh` → 設定済み、不要
   - `github-artifacts-cleanup.sh` → 定期実行不要
   - `cleanup-cdk-assets.sh` → 必要時のみ手動実行
   - `add-s3-frontend-permissions.sh` → 設定済み、不要
   - `setup-log-rotation.sh` → 設定済み、不要

5. **その他**:
   - `claude-code-mcp-client.js` → mcp-client.jsで十分
   - `mcp-http-server.js` → 使用していない
   - `mcp-gemini-manager.sh` → systemdで管理
   - `deploy-checks.js` → pre-deploy-check.jsに統合
   - `performance-monitor.js` → 使用していない
   - `data-profiler.js` → 使用していない
   - `update-scraping-config.sh` → 手動で更新
   - `test-email-notification.sh` → テスト済み、不要
   - `notify-env-verification-result.sh` → verify-lambda-environment.shに統合

## 整理方針

1. **保持**: 頻繁に使用する必須スクリプト（7個）
2. **AWS管理**: 現役のAWS管理スクリプト（5個）
3. **品質管理**: 必要最小限のテスト・品質スクリプト（5個）
4. **experimental**: 実験的スクリプトはそのまま保持（5個）
5. **削除**: 重複・一時的・未使用のスクリプト（約30個）

## 使用方法

### Lambda環境検証

```bash
scripts/verify-lambda-environment.sh dev
scripts/verify-lambda-environment.sh prod
```

### E2Eテスト実行

```bash
scripts/run-e2e-test.sh dev
scripts/run-e2e-test.sh prod --headed
```

### 品質チェック

```bash
scripts/analyze.sh
npm run sonar
```

### Gemini AI連携

```bash
scripts/gemini-direct-client.js chat "質問内容"
```
