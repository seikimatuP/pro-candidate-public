# CI/CD メール通知設定ガイド

GitHub Actionsのテスト結果・デプロイ結果をメールで通知する機能の設定手順。

## 概要

以下の2つのワークフローでメール通知が有効です：

### 1. テスト結果通知 (quality-check.yml)

`develop`/`main`ブランチへのpush時に自動でテストを実行し、**失敗した場合のみ**結果をメールで通知します。

**送信条件**: `if: failure() && github.event_name == 'push'`

> 以前は `always()` で成功時も通知していましたが、push 毎に1通送信されるため
> Dependabot のマージが重なる日に通知が大量発生していました。
> 成功時の通知は情報価値が低いことから、2026-08-06 に `failure()` へ変更しています。
> 成功も含めて把握したい場合は GitHub Actions の実行履歴を参照してください。

**件名形式**: `【dev環境】テスト結果 - 失敗 - owner/repo`

**通知内容**:

- **ビルド情報**: リポジトリ、ブランチ、コミット、実行日時
- **総合結果**: 全テストの成功/失敗
- **各ジョブの詳細**:
  - Lint & TypeScript Check（実行時間）
  - Backend Tests（テストファイル数、テストケース数、失敗詳細）
  - Frontend Tests（実行時間）
  - Frontend Build（実行時間、バンドルサイズ）
  - CDK Syntax Check（実行時間）
- **詳細ログへのリンク**

### 2. デプロイ結果通知 (deploy-infra.yml)

インフラストラクチャデプロイ完了時に、環境名を含む結果をメールで通知します。

**送信条件**: `if: always()`（成功・失敗とも通知）

デプロイは実行頻度が低く、prod リリースの成否把握に有用なため成功時も通知しています。

**件名形式**: `【dev環境】デプロイ結果 - 成功/失敗 - owner/repo`

**通知内容**:

- **ビルド情報**: リポジトリ、ブランチ、コミット、実行日時
- **総合結果**: デプロイの成功/失敗
- **デプロイ情報**:
  - 環境名（dev/prod）
  - API URL
  - Frontend URL
  - スタック名
- **E2Eテスト結果**
- **詳細ログへのリンク**

**環境別トリガー**:

| トリガー                      | 環境         | 件名例                          |
| ----------------------------- | ------------ | ------------------------------- |
| `develop`ブランチへのpush     | dev          | 【dev環境】デプロイ結果 - 成功  |
| リリース作成                  | prod         | 【prod環境】デプロイ結果 - 成功 |
| 手動実行（workflow_dispatch） | 選択した環境 | 【dev/prod環境】デプロイ結果    |

## 必要なGitHub Secrets

以下の3つのSecretsをリポジトリに設定する必要があります。

| Secret名             | 説明                  | 例                      |
| -------------------- | --------------------- | ----------------------- |
| `GMAIL_USER`         | 送信元Gmailアドレス   | `your-email@gmail.com`  |
| `GMAIL_APP_PASSWORD` | Gmailアプリパスワード | `xxxx xxxx xxxx xxxx`   |
| `NOTIFICATION_EMAIL` | 通知先メールアドレス  | `recipient@example.com` |

## 設定手順

### 1. Gmailアプリパスワードの取得

Gmailの通常パスワードではなく、**アプリパスワード**が必要です。

1. [Googleアカウント](https://myaccount.google.com/)にアクセス
2. 左メニューから「**セキュリティ**」を選択
3. 「**2段階認証プロセス**」を有効化（未設定の場合）
4. 「**アプリパスワード**」を選択
5. アプリ名を入力（例: `GitHub Actions`）
6. 「**作成**」をクリック
7. 表示された16文字のパスワードをコピー（例: `abcd efgh ijkl mnop`）

> ⚠️ **注意**: アプリパスワードは一度しか表示されません。必ずコピーしてください。

### 2. GitHub Secretsの設定

1. GitHubリポジトリにアクセス
2. **Settings** → **Secrets and variables** → **Actions** を選択
3. **New repository secret** をクリック

#### GMAIL_USER の設定

- **Name**: `GMAIL_USER`
- **Secret**: `your-email@gmail.com`（送信元Gmailアドレス）

#### GMAIL_APP_PASSWORD の設定

- **Name**: `GMAIL_APP_PASSWORD`
- **Secret**: `abcdefghijklmnop`（スペースなしで16文字）

#### NOTIFICATION_EMAIL の設定

- **Name**: `NOTIFICATION_EMAIL`
- **Secret**: `recipient@example.com`（通知を受け取るメールアドレス）

### 3. 動作確認

設定完了後、`develop`ブランチにpushしてワークフローが正常に動作することを確認します。

```bash
git push origin develop
```

GitHub Actions画面で `Send Email Notification` ジョブが成功していれば、メールが届きます。

## メール通知例

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【CI/CD テスト結果レポート】owner/repo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ ビルド情報
  リポジトリ: owner/repo
  ブランチ:   develop
  コミット:   abc1234 (feat: add new feature)
  実行日時:   2026-01-14 12:00:00 JST
  トリガー:   push by username

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 総合結果: ✅ 全テスト成功

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ Lint & TypeScript Check
  結果: ✅ success
  実行時間: 45s

■ Backend Tests (Vitest)
  結果: ✅ success
  実行時間: 120s

  テストファイル: 14/14 passed
  テストケース: 303 passed, 5 skipped, 0 failed

■ Frontend Tests
  結果: ✅ success
  実行時間: 30s

■ Frontend Build
  結果: ✅ success
  実行時間: 60s
  バンドルサイズ: 1.2M

■ CDK Syntax Check
  結果: ✅ success
  実行時間: 45s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 詳細ログ
  https://github.com/owner/repo/actions/runs/123456789

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## トラブルシューティング

### メールが届かない場合

1. **Secretsの確認**: 名前とスペルが正確か確認
2. **アプリパスワード**: 通常のGmailパスワードではなくアプリパスワードを使用しているか確認
3. **2段階認証**: Googleアカウントで2段階認証が有効か確認
4. **迷惑メールフォルダ**: 迷惑メールに振り分けられていないか確認
5. **GitHub Actions ログ**: `Send Email Notification`ジョブのログを確認

### アプリパスワードが作成できない場合

- 2段階認証が有効になっているか確認
- 組織のGoogleアカウントの場合、管理者の許可が必要な場合があります

### エラー: "Authentication failed"

- `GMAIL_APP_PASSWORD`にスペースが含まれていないか確認
- アプリパスワードが正しいか再確認
- アプリパスワードを再生成して再設定

## セキュリティ考慮事項

- アプリパスワードは**絶対にコードにハードコードしない**
- GitHub Secretsに保存されたパスワードはログに出力されません
- 定期的にアプリパスワードをローテーションすることを推奨
- 不要になったアプリパスワードはGoogleアカウントから削除

## 関連ファイル

- `.github/workflows/quality-check.yml` - テスト品質チェックワークフロー
- `.github/workflows/deploy-infra.yml` - インフラデプロイワークフロー
- `.github/templates/email-template.txt` - テスト結果メールテンプレート
- `.github/templates/deploy-email-template.txt` - デプロイ結果メールテンプレート
- `docs/aws/CI_CD.md` - CI/CD全体ガイド
