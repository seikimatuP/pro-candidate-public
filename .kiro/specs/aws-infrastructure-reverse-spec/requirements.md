# Requirements Document

## Introduction

このドキュメントは、プロ野球候補選手データ収集・分析ツールのAWS環境における既存機能をリバースエンジニアリングして作成した要件定義書です。現在稼働中のAWSサーバーレスアーキテクチャの機能、データフロー、および運用要件を明確化します。

## Requirements

### Requirement 1: データストレージ基盤

**User Story:** システム管理者として、プロ野球志望届データを安全かつ効率的に保存・管理できるようにしたい。これにより、データの永続性と可用性を確保できる。

#### Acceptance Criteria

1. WHEN システムが選手データを保存する THEN S3バケットに環境別（dev/prod）でデータが格納される SHALL
2. WHEN データが保存される THEN JSON形式でメタデータ（年度、タイプ、更新日時）を含む SHALL
3. IF データが高校生タイプの場合 THEN `players/highschool/{year}.json` パスに保存される SHALL
4. IF データが大学生タイプの場合 THEN `players/university/{year}.json` パスに保存される SHALL
5. WHEN データが保存される THEN AES-256暗号化が適用される SHALL
6. WHEN データが保存される THEN バージョニングが有効化されている SHALL
7. WHEN 古いデータが存在する THEN ライフサイクルポリシーにより自動的にアーカイブされる SHALL

### Requirement 2: データ収集機能（スクレイピング）

**User Story:** データ管理者として、高校生・大学生のプロ志望届データを自動的に収集したい。これにより、手動作業を削減し、最新データを常に保持できる。

#### Acceptance Criteria

1. WHEN スクレイピングが実行される THEN Lambda関数が起動される SHALL
2. WHEN 高校生データを収集する THEN `https://www.jhbf.or.jp/pro-aspiring/{year}.html` からデータを取得する SHALL
3. WHEN 大学生データを収集する THEN `https://www.jubf.net/system/prog/procandidate.php?kind=all&year={year}` からデータを取得する SHALL
4. WHEN HTMLを解析する THEN cheerioライブラリを使用してデータを抽出する SHALL
5. WHEN 高校生データを解析する THEN 2番目のテーブル（ドラフト対象者）のみを抽出する SHALL
6. WHEN 大学生データを解析する THEN 最初のテーブル（ドラフト対象者）のみを抽出する SHALL
7. WHEN ※印の選手が存在する THEN その選手を除外する SHALL
8. WHEN データ収集が完了する THEN S3に自動保存される SHALL
9. WHEN prod環境でフロントエンドから実行される AND 当日既に実行済みの場合 THEN スキップメッセージを返す SHALL
10. WHEN EventBridgeから定期実行される THEN 1日1回制限を適用しない SHALL
11. WHEN スクレイピングが成功する THEN 履歴データを記録する SHALL
12. WHEN スクレイピングが失敗する THEN 履歴データを記録しない SHALL

### Requirement 3: RESTful API機能

**User Story:** フロントエンド開発者として、選手データにアクセスするためのAPIエンドポイントが必要である。これにより、ユーザーインターフェースからデータを取得・表示できる。

#### Acceptance Criteria

1. WHEN `/health` エンドポイントにアクセスする THEN システムの稼働状況を返す SHALL
2. WHEN `/players` エンドポイントにアクセスする THEN 選手データを返す SHALL
3. WHEN `/players?type=highschool&year=2024` にアクセスする THEN 2024年度の高校生データを返す SHALL
4. WHEN `/players?type=university&year=2024` にアクセスする THEN 2024年度の大学生データを返す SHALL
5. WHEN `/players` にtypeパラメータなしでアクセスする THEN 高校生と大学生の統合データを返す SHALL
6. WHEN `/years/available` にアクセスする THEN 利用可能な年度リストを返す SHALL
7. WHEN `/schools` にアクセスする THEN 学校一覧を返す SHALL
8. WHEN `/statistics` にアクセスする THEN 統計情報（タイプ別、年度別、ポジション別、都道府県別）を返す SHALL
9. WHEN `/scraping/trigger` にPOSTリクエストを送信する THEN スクレイピングを実行する SHALL
10. WHEN `/scraping/history` にアクセスする THEN スクレイピング実行履歴を返す SHALL
11. WHEN APIリクエストが送信される THEN CORSヘッダーが設定される SHALL
12. WHEN APIレスポンスが返される THEN キャッシュ制御ヘッダー（no-cache）が設定される SHALL

### Requirement 4: 認証・認可機能

**User Story:** セキュリティ管理者として、システムへのアクセスを制御したい。これにより、認可されたユーザーのみがデータにアクセスできる。

#### Acceptance Criteria

1. WHEN prod環境でAPIにアクセスする THEN Cognito認証が必要である SHALL
2. WHEN dev環境でAPIにアクセスする THEN 認証なしでアクセスできる SHALL
3. WHEN ユーザーがログインする THEN Cognitoユーザープールで認証される SHALL
4. WHEN 認証が成功する THEN JWTトークンが発行される SHALL
5. WHEN 認証トークンが無効な場合 THEN 401エラーを返す SHALL
6. WHEN ユーザープールが作成される THEN MFA設定が可能である SHALL

### Requirement 5: フロントエンド配信

**User Story:** エンドユーザーとして、Webブラウザから選手データを閲覧したい。これにより、いつでもどこでもデータにアクセスできる。

#### Acceptance Criteria

1. WHEN フロントエンドがビルドされる THEN S3バケットに静的ファイルが配置される SHALL
2. WHEN ユーザーがURLにアクセスする THEN CloudFront経由でコンテンツが配信される SHALL
3. WHEN HTTPSでアクセスする THEN 自動的にHTTPSで配信される SHALL
4. WHEN SPAルーティングを使用する THEN 404エラーが発生せずindex.htmlにリダイレクトされる SHALL
5. WHEN 静的アセットにアクセスする THEN 31536000秒のキャッシュが適用される SHALL
6. WHEN HTML/JSファイルにアクセスする THEN 300秒のキャッシュが適用される SHALL
7. WHEN CloudFrontディストリビューションが作成される THEN 無料枠内（100GB/月、200万リクエスト/月）で運用される SHALL

### Requirement 6: 監視・アラート機能

**User Story:** 運用担当者として、システムの健全性を監視し、問題が発生した際に通知を受け取りたい。これにより、迅速に対応できる。

#### Acceptance Criteria

1. WHEN Lambda関数が実行される THEN CloudWatchにログが記録される SHALL
2. WHEN Lambda関数でエラーが発生する THEN CloudWatchアラームが発火する SHALL
3. WHEN API Gatewayでエラーが発生する THEN CloudWatchメトリクスに記録される SHALL
4. WHEN コスト閾値（$0.50）を超える THEN アラートメールが送信される SHALL
5. WHEN Lambda関数のメモリ使用量が記録される THEN CloudWatchメトリクスに送信される SHALL
6. WHEN スクレイピングが完了する AND EventBridgeから実行された場合 THEN 完了メールが送信される SHALL
7. WHEN 新規選手が検出される THEN メールに新規選手情報が含まれる SHALL

### Requirement 7: コスト最適化

**User Story:** 財務担当者として、AWS運用コストを最小限に抑えたい。これにより、無料枠内での運用を実現できる。

#### Acceptance Criteria

1. WHEN Lambda関数が実行される THEN メモリ使用量が最適化されている（Scraping: 512MB、API: 128MB）SHALL
2. WHEN S3にデータが保存される THEN ライフサイクルポリシーにより古いデータがアーカイブされる SHALL
3. WHEN CloudWatch Logsが記録される THEN 保持期間が設定されている SHALL
4. WHEN 月額コストが計算される THEN $0.50以下である SHALL
5. WHEN Config RulesとSecurity Hubが評価される THEN 無効化されている（開発環境では不要）SHALL
6. WHEN コスト監視アラームが設定される THEN dev/prod各環境で$0.50閾値が設定されている SHALL

### Requirement 8: 環境分離

**User Story:** DevOps担当者として、開発環境と本番環境を分離したい。これにより、安全にテストと本番運用ができる。

#### Acceptance Criteria

1. WHEN インフラがデプロイされる THEN dev環境とprod環境が分離される SHALL
2. WHEN S3バケットが作成される THEN 環境別の命名規則（`pro-candidate-data-{stage}`）が適用される SHALL
3. WHEN Lambda関数が作成される THEN 環境別の命名規則（`pro-baseball-{function}-{stage}`）が適用される SHALL
4. WHEN 環境変数が設定される THEN `ENVIRONMENT`変数でdev/prodが識別される SHALL
5. WHEN CloudFormationスタックが作成される THEN 環境別のスタック名（`ProBaseballStack-{stage}`）が使用される SHALL
6. WHEN タグが設定される THEN `Environment`タグで環境が識別される SHALL

### Requirement 9: Infrastructure as Code

**User Story:** インフラエンジニアとして、インフラをコードで管理したい。これにより、再現性と保守性を確保できる。

#### Acceptance Criteria

1. WHEN インフラを構築する THEN AWS CDK（TypeScript）を使用する SHALL
2. WHEN リソースを作成する THEN Constructパターンを使用する SHALL
3. WHEN S3リソースを作成する THEN S3Constructを使用する SHALL
4. WHEN Lambdaリソースを作成する THEN LambdaConstructを使用する SHALL
5. WHEN API Gatewayリソースを作成する THEN ApiGatewayConstructを使用する SHALL
6. WHEN Cognitoリソースを作成する THEN CognitoConstructを使用する SHALL
7. WHEN CloudFrontリソースを作成する THEN CloudFrontConstructを使用する SHALL
8. WHEN 監視リソースを作成する THEN MonitoringConstructを使用する SHALL
9. WHEN デプロイする THEN `cdk deploy`コマンドを使用する SHALL
10. WHEN 差分を確認する THEN `cdk diff`コマンドを使用する SHALL

### Requirement 10: CI/CD自動化

**User Story:** 開発者として、コードをプッシュすると自動的にデプロイされるようにしたい。これにより、デプロイ作業を効率化できる。

#### Acceptance Criteria

1. WHEN developブランチにプッシュする THEN dev環境に自動デプロイされる SHALL
2. WHEN タグ（v1.x.x）をプッシュする THEN prod環境に自動デプロイされる SHALL
3. WHEN GitHub Actionsワークフローが実行される THEN TypeScriptコンパイルチェックが実行される SHALL
4. WHEN GitHub Actionsワークフローが実行される THEN ESLintチェックが実行される SHALL
5. WHEN インフラがデプロイされる THEN CDK deployが実行される SHALL
6. WHEN フロントエンドがデプロイされる THEN Viteビルドが実行される SHALL
7. WHEN フロントエンドがデプロイされる THEN S3に直接アップロードされる SHALL
8. WHEN デプロイが完了する THEN CloudFormation Outputsが記録される SHALL

### Requirement 11: データ履歴管理

**User Story:** データアナリストとして、スクレイピング実行履歴を確認したい。これにより、データ更新状況を把握できる。

#### Acceptance Criteria

1. WHEN スクレイピングが正常終了する THEN 履歴データがS3に保存される SHALL
2. WHEN スクレイピングが失敗する THEN 履歴データは保存されない SHALL
3. WHEN 履歴データが保存される THEN 実行日時、タイプ、件数、差分情報が含まれる SHALL
4. WHEN 差分が計算される THEN 新規選手と削除選手が識別される SHALL
5. WHEN 履歴APIにアクセスする THEN 環境別（dev/prod）の履歴が取得できる SHALL
6. WHEN 履歴APIにアクセスする THEN limit/offsetパラメータでページネーションができる SHALL
7. WHEN 前回実行日が記録される THEN 経過日数が計算される SHALL

### Requirement 12: 設定管理

**User Story:** システム管理者として、設定を一元管理したい。これにより、設定変更を容易にできる。

#### Acceptance Criteria

1. WHEN スクレイピング設定が必要な場合 THEN S3の`config/{stage}/app-config.json`から読み込む SHALL
2. WHEN 設定ファイルが存在しない場合 THEN 環境変数からフォールバックする SHALL
3. WHEN 設定が変更される THEN S3ファイルを更新するだけで反映される SHALL
4. WHEN Lambda関数が起動する THEN ConfigManagerが設定を読み込む SHALL
5. WHEN スクレイピングURLが設定される THEN 高校生・大学生それぞれのURLが定義される SHALL
6. WHEN タイムアウト設定が定義される THEN デフォルト30秒が設定される SHALL
7. WHEN User-Agent設定が定義される THEN カスタムUser-Agentが設定される SHALL
