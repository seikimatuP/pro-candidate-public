# GitHub リポジトリシークレット設定ガイド

このドキュメントでは、CI/CD パイプラインに必要な GitHub シークレットの設定方法について説明します。

## 必要なシークレット

このプロジェクトの CI/CD パイプラインでは、以下のシークレットが必要です：

| シークレット名           | 説明                                           | 取得方法                                            |
| ------------------------ | ---------------------------------------------- | --------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`      | CDK デプロイ用 IAM ユーザーのアクセスキー      | IAM コンソール                                      |
| `AWS_SECRET_ACCESS_KEY`  | 上記に対応するシークレットキー                 | IAM コンソール                                      |
| `DOPPLER_TOKEN_DEV`      | フロントエンドビルド用（`dev` config）         | Doppler の Service Token                            |
| `DOPPLER_TOKEN_PRD`      | フロントエンドビルド用（`prd` config）         | Doppler の Service Token                            |
| `DOPPLER_TOKEN_E2E_DEV`  | E2E・Cognito admin 保証用（`e2e_dev` config）  | Doppler の Service Token                            |
| `DOPPLER_TOKEN_E2E_PROD` | E2E・Cognito admin 保証用（`e2e_prod` config） | Doppler の Service Token                            |
| `GMAIL_USER`             | 通知メールの送信元 Gmail アドレス              | 送信に使う Gmail アカウント                         |
| `GMAIL_APP_PASSWORD`     | Gmail のアプリパスワード                       | Google アカウント → セキュリティ → アプリパスワード |
| `NOTIFICATION_EMAIL`     | CI/CD 通知メールの送信先                       | プロジェクト管理者のメールアドレス                  |
| `CODECOV_TOKEN`          | カバレッジアップロード用（任意）               | Codecov プロジェクト設定                            |

`e2e_dev` / `e2e_prod` の config には E2E ログイン用の `COGNITO_USERNAME` /
`COGNITO_PASSWORD` が入っている。リポジトリや `.env` に実値を置かないこと
（[Cognito 管理者セットアップ](COGNITO_ADMIN_SETUP.md)）。

> **注**: 以前使っていた `CLASPRC_JSON` / `SCRIPT_ID`（Google Apps Script 用）と
> `SONAR_TOKEN` は、現在のワークフローからは参照していない。

## シークレットの設定方法

1. GitHub リポジトリページにアクセスします
2. `Settings` タブをクリックします
3. 左側のメニューから `Secrets and variables` → `Actions` を選択します
4. `New repository secret` ボタンをクリックします
5. 各シークレットの名前と値を入力し、`Add secret` ボタンをクリックします

## シークレットごとの設定詳細

### AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY

1. CDK デプロイ用の IAM ユーザー（`github-actions-user`）でアクセスキーを発行します
2. 2 つの値をそれぞれ GitHub シークレットとして設定します
3. 必要権限は後述の「IAM 権限エラーの対処法」を参照します

### DOPPLER_TOKEN\_\*

1. Doppler の `pro-candidate` プロジェクトで、対象 config（`dev` / `prd` / `e2e_dev` /
   `e2e_prod`）の **Service Token** を発行します
2. config ごとに別のシークレット名で設定します
   （`DOPPLER_TOKEN_DEV` / `DOPPLER_TOKEN_PRD` / `DOPPLER_TOKEN_E2E_DEV` / `DOPPLER_TOKEN_E2E_PROD`）
3. `e2e_*` の Service Token は Cognito のログイン情報を読むため、取り扱いに注意します

### GMAIL_USER / GMAIL_APP_PASSWORD

Gmail の通常パスワードではなくアプリパスワードを使います。手順は
[メール通知設定ガイド](../cicd/EMAIL_NOTIFICATION_SETUP.md) を参照してください。

### NOTIFICATION_EMAIL

通知を受け取りたいメールアドレスを GitHub シークレットとして設定します。

## シークレット使用のテスト

シークレットが正しく設定されているか確認するには：

1. GitHub Actions ワークフローを手動で実行します
2. ワークフロー実行ログでエラーがないことを確認します
3. デプロイステップが正常に完了することを確認します

## IAM権限エラーの対処法

### CDKデプロイ時の`iam:PassRole`エラー

GitHub ActionsでCDKデプロイ時に以下のエラーが発生する場合：

```
User: arn:aws:iam::123456789012:user/github-actions-user is not authorized to perform: iam:PassRole
```

**解決方法**:

1. 対象の IAM ユーザーに `iam:PassRole` を許可するポリシー（`CDKPassRolePolicy`）を追加する
   （以前あった `scripts/fix-github-actions-iam.sh` は現在リポジトリに無い。
   IAM コンソールまたは `aws iam put-user-policy` で付与する）

2. 権限確認：

   ```bash
   aws iam list-attached-user-policies --user-name github-actions-user
   ```

3. `CDKPassRolePolicy`が追加されていることを確認

4. GitHub Actionsワークフローを再実行

### 追加された権限

- `iam:PassRole` - CDKがCloudFormationロールを引き受けるために必要
- `sts:AssumeRole` - CDKデプロイロールへのアクセス

## セキュリティ上の注意

- シークレットはログや出力に表示しないでください
- シークレットは Git コミットに含めないようにしてください
- 定期的にシークレット（特に認証トークン）をローテーションしてください

## GitHub Actions の実行内容

> ⚠️ **以下は AWS 移行前（Google Apps Script 時代）の記述で、現行のワークフローとは異なる**。
> ここで説明している `ci-cd.yml` と `static-analysis-report.yml` は
> `.github/workflows/` に既に存在しない。現行の構成は
> [CI/CD パイプライン全体概要](CI_CD.md) を参照すること。

このプロジェクトでは、主に 2 つの GitHub Actions ワークフローが設定されています。それぞれの実行内容を説明します。

### 1. CI/CD パイプライン (ci-cd.yml)

このワークフローは、コードの検証とデプロイを自動化するものです。

#### 実行タイミング

- develop ブランチへのプッシュ時
- プルリクエスト作成/更新時
- 手動実行（Actions タブから「Run workflow」ボタンで実行可能）

#### デプロイ環境

このパイプラインでは、以下の 2 つのデプロイ環境を選択できます：

1. **development（開発環境）**:

   - 開発中の機能をテストするための環境
   - テスト用の GAS プロジェクトにデプロイされます
   - AWS API開発環境のテストデータを使用
   - 開発者とテスターのみがアクセス可能

2. **production（本番環境）**:
   - エンドユーザー向けの実運用環境
   - 本番用の GAS プロジェクトにデプロイされます
   - AWS API本番環境データを使用
   - すべてのユーザーがアクセス可能
   - 厳格な品質基準が適用されます

#### 実行内容

1. **テストジョブ**:

   - Node.js 環境のセットアップ（v18 を使用）
   - 依存パッケージのインストール（npm ci）
   - テストの実行（npm run test:ci）
   - テストレポートの生成
   - SonarQube によるコード品質分析
   - カバレッジレポートのアーティファクトとしての保存

2. **デプロイジョブ**:
   - テストジョブが成功した場合のみ実行
   - push イベントまたは手動実行の場合のみ実行
   - Node.js 環境のセットアップ
   - Clasp の設定（GitHub Secrets からシークレット情報を取得）
   - ビルドと GAS へのデプロイ（npm run deploy）
   - develop ブランチの場合は新バージョンも作成
   - メールによるデプロイ結果通知（成功/失敗にかかわらず）

### 2. コード品質レポート (static-analysis-report.yml)

このワークフローは、定期的にコード品質の分析を行いレポートを生成します。

#### 実行タイミング

- 毎週月曜日の午前 2 時（cron: '0 2 \* \* 1'）
- 手動実行（workflow_dispatch）

#### 実行内容

1. Node.js 環境のセットアップ
2. 依存パッケージのインストール
3. Lint によるコード解析（エラーが発生しても続行）
4. テスト実行とカバレッジ計測（エラーが発生しても続行）
5. SonarQube 用テストレポートの生成
6. SonarQube による詳細なコード品質分析
7. 品質レポートの生成
8. メールによる品質レポートの送信
   - 分析結果の HTML 添付
   - 週次の品質状況がわかるサマリー情報
