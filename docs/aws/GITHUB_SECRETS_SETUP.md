# GitHub リポジトリシークレット設定ガイド

このドキュメントでは、CI/CD パイプラインに必要な GitHub シークレットの設定方法について説明します。

## 必要なシークレット

このプロジェクトの CI/CD パイプラインでは、以下のシークレットが必要です：

| シークレット名       | 説明                            | 取得方法                                    |
| -------------------- | ------------------------------- | ------------------------------------------- |
| `CLASPRC_JSON`       | Google Apps Script への認証情報 | clasp ログイン時に生成される.clasprc の内容 |
| `SCRIPT_ID`          | GAS プロジェクトの ID           | .clasp.json から取得                        |
| `SONAR_TOKEN`        | SonarQube 分析用のトークン      | SonarQube プロジェクト設定から取得          |
| `NOTIFICATION_EMAIL` | CI/CD 通知メールの送信先        | プロジェクト管理者のメールアドレス          |

## シークレットの設定方法

1. GitHub リポジトリページにアクセスします
2. `Settings` タブをクリックします
3. 左側のメニューから `Secrets and variables` → `Actions` を選択します
4. `New repository secret` ボタンをクリックします
5. 各シークレットの名前と値を入力し、`Add secret` ボタンをクリックします

## シークレットごとの設定詳細

### CLASPRC_JSON

1. ローカル環境で `clasp login` を実行します
2. `~/.clasprc.json` ファイルの内容を取得します:
   ```bash
   cat ~/.clasprc.json
   ```
3. 出力内容をコピーし、GitHub シークレットとして設定します

### SCRIPT_ID

1. プロジェクトの `.clasp.json` ファイルを確認します:
   ```bash
   cat .clasp.json
   ```
2. `scriptId` の値をコピーし、GitHub シークレットとして設定します

### SONAR_TOKEN

1. SonarQube の管理画面にログインします
2. プロジェクト設定で新しいトークンを生成します
3. トークンを GitHub シークレットとして設定します

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
User: arn:aws:iam::131492497870:user/github-actions-user is not authorized to perform: iam:PassRole
```

**解決方法**:

1. IAM権限修正スクリプトを実行：

   ```bash
   ./scripts/fix-github-actions-iam.sh
   ```

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
