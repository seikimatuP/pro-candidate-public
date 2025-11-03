# Requirements Document

## Introduction

このドキュメントは、プロ野球志望届データ管理システムのパフォーマンス最適化に関する要件を定義します。現在のシステムは機能的には完成していますが、以下の課題があります：

- すべてのAPIレスポンスがキャッシュなし（`no-cache`）設定
- 初回バンドルサイズが1.2MBと大きく、初回ロード時間が3-5秒
- 不要な再レンダリングによるパフォーマンス低下
- 321行のテーブルデータを一度にレンダリング
- 本番環境に135個のデバッグログが残存
- **VitePWA Service WorkerとAmplify認証の競合**（testブランチ検証で判明）
- **カスタムCognito SDKのブラウザ互換性問題**（`Cannot set properties of undefined`エラー）

Phase 1として、投資対効果が最も高いパフォーマンス最適化を実施し、ユーザー体験を劇的に改善します。

## Requirements

### Requirement 1: APIレスポンスキャッシュ戦略

**User Story:** システム管理者として、APIレスポンスに適切なキャッシュ戦略を実装することで、不要なAPI呼び出しを削減し、レスポンス時間を短縮したい

#### Acceptance Criteria

1. WHEN 選手データAPIが本番環境で呼び出された THEN システムは `Cache-Control: public, max-age=300` ヘッダーを返却する SHALL
2. WHEN 選手データAPIが開発環境で呼び出された THEN システムは `Cache-Control: no-cache` ヘッダーを返却する SHALL
3. WHEN 統計情報APIが本番環境で呼び出された THEN システムは `Cache-Control: public, max-age=300` ヘッダーを返却する SHALL
4. WHEN 年度リストAPIが本番環境で呼び出された THEN システムは `Cache-Control: public, max-age=300` ヘッダーを返却する SHALL
5. WHEN ヘルスチェックAPIが呼び出された THEN システムは環境に関わらず `Cache-Control: no-cache` ヘッダーを返却する SHALL
6. WHEN スクレイピング履歴APIが呼び出された THEN システムは `Cache-Control: private, max-age=300` ヘッダーを返却する SHALL
7. WHEN スクレイピングが完了した THEN システムはCloudFrontキャッシュを無効化する SHALL
8. WHEN 管理者がキャッシュクリアAPIを呼び出した THEN システムは即座にすべてのキャッシュを無効化する SHALL
9. WHEN APIレスポンスにETagヘッダーが含まれる THEN クライアントは条件付きリクエスト（If-None-Match）を送信できる SHALL
10. IF キャッシュされたデータが最新の THEN システムは304 Not Modifiedを返却する SHALL
11. WHEN CloudFrontを経由してAPIが呼び出された THEN CloudFrontはCache-Controlヘッダーに従ってキャッシュする SHALL

### Requirement 2: フロントエンドコード分割

**User Story:** エンドユーザーとして、初回ページロード時間を短縮し、必要なコードのみを読み込むことで、快適にアプリケーションを利用したい

#### Acceptance Criteria

1. WHEN アプリケーションが初回ロードされた THEN システムは初回バンドルサイズを300-400KB以下にする SHALL
2. WHEN ユーザーがダッシュボードページにアクセスした THEN システムはダッシュボードコンポーネントのみを遅延ロードする SHALL
3. WHEN ユーザーが高校生選手ページにアクセスした THEN システムは高校生選手コンポーネントのみを遅延ロードする SHALL
4. WHEN ユーザーが大学生選手ページにアクセスした THEN システムは大学生選手コンポーネントのみを遅延ロードする SHALL
5. WHEN ユーザーがスクレイピング履歴ページにアクセスした THEN システムはスクレイピング履歴コンポーネントのみを遅延ロードする SHALL
6. WHEN コンポーネントがロード中の THEN システムはローディングスピナーを表示する SHALL
7. WHEN コード分割が実装された THEN 初回ロード時間は1-2秒以内になる SHALL

### Requirement 3: React最適化（メモ化）

**User Story:** 開発者として、不要な再レンダリングを削減し、アプリケーションのパフォーマンスを向上させたい

#### Acceptance Criteria

1. WHEN 選手テーブルコンポーネントがレンダリングされた THEN システムは `React.memo` を使用して不要な再レンダリングを防ぐ SHALL
2. WHEN 高コストな計算（ソート、フィルタリング）が実行される THEN システムは `useMemo` を使用して結果をメモ化する SHALL
3. WHEN コールバック関数が子コンポーネントに渡される THEN システムは `useCallback` を使用して関数をメモ化する SHALL
4. WHEN 親コンポーネントが再レンダリングされた AND 子コンポーネントのpropsが変更されていない THEN 子コンポーネントは再レンダリングされない SHALL
5. WHEN 最適化が実装された THEN 再レンダリング回数は50-70%削減される SHALL
6. WHEN テーブルデータが表示される THEN 表示速度は最適化前の2-3倍高速になる SHALL

### Requirement 4: 仮想スクロール実装

**User Story:** エンドユーザーとして、大量の選手データ（321行以上）を快適にスクロールし、閲覧したい

#### Acceptance Criteria

1. WHEN 選手テーブルが表示された THEN システムは可視範囲のDOM要素のみをレンダリングする SHALL
2. WHEN ユーザーがスクロールした THEN システムは動的に表示範囲を更新する SHALL
3. WHEN 仮想スクロールが実装された THEN DOM要素数は約20個（可視範囲のみ）に制限される SHALL
4. WHEN 321行のデータが表示される THEN スクロール性能は最適化前の10-20倍高速になる SHALL
5. WHEN 1000行以上のデータが表示される THEN システムは高速なスクロールを維持する SHALL
6. IF ユーザーが特定の行にジャンプした THEN システムは即座にその行を表示する SHALL
7. WHEN 仮想スクロールが有効な THEN すべてのテーブル機能（ソート、フィルタリング）は正常に動作する SHALL

### Requirement 5: 本番環境デバッグログ削除

**User Story:** セキュリティ担当者として、本番環境から不要なデバッグログを削除し、機密情報漏洩リスクを排除したい

#### Acceptance Criteria

1. WHEN アプリケーションが本番環境で実行される THEN システムは `console.log` を出力しない SHALL
2. WHEN アプリケーションが開発環境で実行される THEN システムは `console.log` を出力する SHALL
3. WHEN エラーが発生した THEN システムは構造化されたエラーログを出力する SHALL
4. WHEN ロガーユーティリティが実装された THEN すべての既存の `console.log` は `logger.debug` に置き換えられる SHALL
5. WHEN ロガーユーティリティが実装された THEN すべての既存の `console.error` は `logger.error` に置き換えられる SHALL
6. IF 本番環境でエラーが発生した THEN システムはエラー情報を適切にログに記録する SHALL
7. WHEN 本番環境のブラウザコンソールを開いた THEN デバッグログは表示されない SHALL

### Requirement 6: パフォーマンス測定と検証

**User Story:** 開発者として、最適化の効果を定量的に測定し、目標達成を確認したい

#### Acceptance Criteria

1. WHEN 最適化が実装された THEN 初回ロード時間は67-75%短縮される SHALL
2. WHEN 最適化が実装された THEN API呼び出し回数は60-80%削減される SHALL
3. WHEN 最適化が実装された THEN Lighthouse Performance Scoreは80以上になる SHALL
4. WHEN 最適化が実装された THEN First Contentful Paint (FCP)は1.5秒以内になる SHALL
5. WHEN 最適化が実装された THEN Time to Interactive (TTI)は3秒以内になる SHALL
6. WHEN 最適化が実装された THEN Total Blocking Time (TBT)は200ms以内になる SHALL
7. WHEN パフォーマンステストが実行された THEN すべての指標が目標値を満たす SHALL

### Requirement 7: 後方互換性とデプロイ

**User Story:** 運用担当者として、既存機能を壊さずに最適化を段階的にデプロイしたい

#### Acceptance Criteria

1. WHEN 最適化が実装された THEN すべての既存APIエンドポイントは変更されない SHALL
2. WHEN 最適化が実装された THEN すべての既存機能は正常に動作する SHALL
3. WHEN dev環境にデプロイされた THEN すべてのE2Eテストが成功する SHALL
4. WHEN prod環境にデプロイされた THEN カナリアデプロイ戦略を使用する SHALL
5. IF 問題が発生した THEN システムは即座にロールバック可能である SHALL
6. WHEN デプロイが完了した THEN 運用ドキュメントが更新される SHALL
7. WHEN デプロイが完了した THEN パフォーマンス監視ダッシュボードが更新される SHALL

### Requirement 8: PWA無効化とService Worker削除

**User Story:** 開発者として、Service WorkerとAmplify認証の競合を解決し、認証フローを安定化させたい

#### Acceptance Criteria

1. WHEN アプリケーションが起動する THEN Service Workerが完全に削除される SHALL
2. WHEN Service Worker削除処理が実行される THEN すべてのキャッシュストレージも削除される SHALL
3. WHEN ViteがビルドされるTHEN PWA機能（VitePWAプラグイン）は無効化されている SHALL
4. WHEN Service Worker削除が成功した THEN コンソールに削除ログが出力される SHALL
5. WHEN Service Worker削除が失敗した THEN エラーログが出力されるがアプリケーションは起動する SHALL
6. WHEN local環境でアプリケーションが起動する THEN Service Worker削除処理は実行されるが認証はスキップされる SHALL
7. WHEN Service Worker削除後にアプリケーションがリロードされる THEN 再度Service Worker削除処理が実行される SHALL
8. WHEN E2Eテストが実行される THEN Service Workerが存在しないことが確認される SHALL

### Requirement 9: AWS Amplify認証統合

**User Story:** 開発者として、ブラウザ互換性が高く、認証フロー自動化されたAmplify認証を使用したい

#### Acceptance Criteria

1. WHEN アプリケーションが起動する THEN Amplify認証が環境別設定で初期化される SHALL
2. WHEN dev環境でアプリケーションが起動する THEN dev環境のCognito User Poolに接続される SHALL
3. WHEN prod環境でアプリケーションが起動する THEN prod環境のCognito User Poolに接続される SHALL
4. WHEN local環境でアプリケーションが起動する THEN 認証はスキップされダミーユーザーが設定される SHALL
5. WHEN ユーザーがログインする THEN Amplify signIn APIが使用される SHALL
6. WHEN ユーザーがログアウトする THEN Amplify signOut APIが使用される SHALL
7. WHEN 認証状態を確認する THEN Amplify getCurrentUser APIが使用される SHALL
8. WHEN ページがリロードされる THEN 認証状態が復元される SHALL
9. WHEN ブラウザがfocus/visibleになる THEN 認証状態が再確認される SHALL
10. WHEN 認証確認が失敗した THEN 最大3回まで自動リトライされる SHALL
11. WHEN E2Eテストが実行される THEN 認証フローを含むテストの成功率が98%以上である SHALL
12. WHEN Amplify初期化が失敗した THEN 警告ログが出力されアプリケーションは起動する SHALL
