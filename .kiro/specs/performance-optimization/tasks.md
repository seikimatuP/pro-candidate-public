# Implementation Plan

このドキュメントは、パフォーマンス最適化機能の実装タスクリストです。各タスクは段階的に実装可能で、テスト駆動開発を重視しています。

## タスク概要

Phase 1のパフォーマンス最適化として、以下の順序で実装します：

1. ロガーユーティリティ実装（基盤）
2. APIキャッシュ戦略実装
3. フロントエンドコード分割
4. React最適化（メモ化）
5. 仮想スクロール実装
6. Service Worker削除・Amplify認証統合（認証安定化）
7. パフォーマンステスト・検証

---

## Implementation Tasks

- [ ] 1. ロガーユーティリティ実装
  - [ ] 1.1 Lambda用ロガー実装
    - `pro-candidate-aws/lambda/utils/logger.js` 作成
    - 環境別ログ出力制御（dev: 全ログ、prod: エラーのみ）
    - requestStart/requestEnd メソッド実装
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 1.2 フロントエンド用ロガー実装
    - `frontend/src/utils/logger.ts` 作成
    - 環境別ログ出力制御（development: 全ログ、production: エラーのみ）
    - debug/info/warn/error メソッド実装
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 1.3 既存console.logをロガーに置き換え（Lambda）
    - `pro-candidate-aws/lambda/api.js` の全console.logを logger.debug に置換
    - `pro-candidate-aws/lambda/scraping.js` の全console.logを logger.debug に置換
    - console.errorを logger.error に置換
    - _Requirements: 5.4, 5.5, 5.7_
  - [ ] 1.4 既存console.logをロガーに置き換え（Frontend）
    - `frontend/src/**/*.tsx` の全console.logを logger.debug に置換
    - console.errorを logger.error に置換
    - 135個のデバッグログを環境別に制御
    - _Requirements: 5.4, 5.5, 5.7_
  - [ ]\* 1.5 ロガーユニットテスト
    - Lambda用ロガーテスト作成
    - フロントエンド用ロガーテスト作成
    - 環境別動作確認
    - _Requirements: 5.1-5.7_

- [ ] 2. APIキャッシュ戦略実装
  - [ ] 2.1 CacheStrategyManager実装
    - `pro-candidate-aws/lambda/utils/cache-strategy.js` 作成
    - 環境別キャッシュヘッダー生成（dev: no-cache、prod: 5分）
    - エンドポイント別戦略定義（players, statistics, years, health, scrapingHistory）
    - ETag生成機能実装
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ] 2.2 API HandlerにCacheStrategyManager統合
    - `pro-candidate-aws/lambda/api.js` にCacheStrategyManager import
    - 各エンドポイントレスポンスにCache-Controlヘッダー追加
    - 環境変数（ENVIRONMENT）に基づいてキャッシュ制御
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ] 2.3 CacheInvalidationService実装
    - `pro-candidate-aws/lambda/utils/cache-invalidation.js` 作成
    - CloudFront SDK統合
    - invalidatePlayerData メソッド実装（/prod/players*, /prod/statistics*, /prod/years\*）
    - invalidateAll メソッド実装（/\*）
    - _Requirements: 1.7, 1.8_
  - [ ] 2.4 スクレイピング完了時のキャッシュ無効化
    - `pro-candidate-aws/lambda/scraping.js` にCacheInvalidationService統合
    - スクレイピング成功時にinvalidatePlayerData呼び出し
    - エラーハンドリング（無効化失敗時もスクレイピングは成功とする）
    - _Requirements: 1.7_
  - [ ] 2.5 キャッシュクリアAPI実装
    - `/cache/clear` エンドポイント追加（POST）
    - 管理者権限チェック（本番環境のみ）
    - invalidateAll呼び出し
    - _Requirements: 1.8_
  - [ ] 2.6 ETag/If-None-Match対応
    - ETagヘッダー生成（データハッシュベース）
    - If-None-Matchリクエストヘッダー処理
    - 304 Not Modified レスポンス実装
    - _Requirements: 1.9, 1.10_
  - [ ] 2.7 CloudFront環境変数設定
    - CDK StackにCLOUDFRONT_DISTRIBUTION_ID環境変数追加
    - Lambda関数に環境変数注入
    - _Requirements: 1.11_
  - [ ]\* 2.8 キャッシュ戦略ユニットテスト
    - CacheStrategyManager テスト作成
    - 環境別ヘッダー生成テスト
    - ETag生成テスト
    - _Requirements: 1.1-1.11_

- [ ] 3. フロントエンドコード分割
  - [ ] 3.1 LoadingSpinnerコンポーネント作成
    - `frontend/src/components/common/LoadingSpinner.tsx` 作成
    - fullScreen/size props対応
    - Material-UI CircularProgress使用
    - _Requirements: 2.6_
  - [ ] 3.2 React.lazy + Suspense実装
    - `frontend/src/App.tsx` 修正
    - Dashboard, HighschoolPlayers, UniversityPlayers, ScrapingHistory, PlayerManagement, SchoolManagement を React.lazy でインポート
    - ⚠️ **重要**: LoginPage は除外（認証エントリポイントのため即座読み込み必須）
    - Suspense でラップ、fallbackにLoadingSpinner設定
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [ ] 3.3 LazyLoadErrorBoundary実装
    - `frontend/src/components/common/LazyLoadErrorBoundary.tsx` 作成
    - エラー時の再読み込みUI実装
    - logger統合
    - _Requirements: 2.6_
  - [ ] 3.4 Viteビルド設定最適化
    - `frontend/vite.config.ts` 修正
    - manualChunks設定（vendor, mui, react-router分離）
    - chunkSizeWarningLimit調整
    - _Requirements: 2.1, 2.7_
  - [ ] 3.5 バンドルサイズ検証
    - `npm run build` 実行
    - dist/assets/\*.js ファイルサイズ確認
    - 初回バンドル300-400KB以下を確認
    - _Requirements: 2.1, 2.7_
  - [ ]\* 3.6 コード分割動作テスト
    - 各ページ遷移時のネットワークタブ確認
    - Lazy loadチャンク読み込み確認
    - LoadingSpinner表示確認
    - _Requirements: 2.1-2.7_

- [ ] 4. React最適化（メモ化）
  - [ ] 4.1 OptimizedPlayerTableコンポーネント作成
    - `frontend/src/components/players/OptimizedPlayerTable.tsx` 作成
    - React.memo でコンポーネントラップ
    - useMemo でソート処理メモ化
    - useCallback でコールバック関数メモ化
    - カスタム比較関数実装
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ] 4.2 PlayerRowコンポーネントメモ化
    - OptimizedPlayerTable内にPlayerRow作成
    - React.memo でメモ化
    - useCallback でクリックハンドラメモ化
    - _Requirements: 3.1, 3.4_
  - [ ] 4.3 HighschoolPlayersページ最適化
    - `frontend/src/pages/HighschoolPlayers.tsx` 修正
    - OptimizedPlayerTable使用
    - useMemo でフィルタリング処理メモ化
    - useCallback でイベントハンドラメモ化
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ] 4.4 UniversityPlayersページ最適化
    - `frontend/src/pages/UniversityPlayers.tsx` 修正
    - OptimizedPlayerTable使用
    - useMemo でフィルタリング処理メモ化
    - useCallback でイベントハンドラメモ化
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ] 4.5 Dashboardページ最適化
    - `frontend/src/pages/Dashboard.tsx` 修正
    - useMemo で統計計算メモ化
    - useCallback でイベントハンドラメモ化
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]\* 4.6 React最適化ユニットテスト
    - OptimizedPlayerTable レンダリングテスト
    - メモ化動作確認テスト
    - 再レンダリング回数測定テスト
    - _Requirements: 3.1-3.6_

- [ ] 5. 仮想スクロール実装
  - [ ] 5.1 react-windowインストール
    - `cd frontend && npm install react-window @types/react-window`
    - package.json更新確認
    - _Requirements: 4.1, 4.2_
  - [ ] 5.2 VirtualizedPlayerTableコンポーネント作成
    - `frontend/src/components/players/VirtualizedPlayerTable.tsx` 作成
    - FixedSizeList使用
    - テーブルヘッダー実装
    - 行レンダリング関数実装
    - height/itemSize props対応
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7_
  - [ ] 5.3 HighschoolPlayersページに仮想スクロール統合
    - `frontend/src/pages/HighschoolPlayers.tsx` 修正
    - VirtualizedPlayerTable使用（OptimizedPlayerTableから切り替え）
    - ソート・フィルタリング機能維持
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_
  - [ ] 5.4 UniversityPlayersページに仮想スクロール統合
    - `frontend/src/pages/UniversityPlayers.tsx` 修正
    - VirtualizedPlayerTable使用（OptimizedPlayerTableから切り替え）
    - ソート・フィルタリング機能維持
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_
  - [ ] 5.5 仮想スクロールスタイリング調整
    - テーブルヘッダー固定
    - 行ホバー効果追加
    - レスポンシブ対応
    - _Requirements: 4.7_
  - [ ]\* 5.6 仮想スクロール動作テスト
    - 321行データ表示確認
    - スクロール性能測定
    - DOM要素数確認（約20個）
    - ソート・フィルタリング動作確認
    - _Requirements: 4.1-4.7_

- [ ] 6. Service Worker削除・Amplify認証統合
  - [ ] 6.1 Service Worker完全削除処理実装
    - `frontend/src/App.tsx` 修正
    - useEffect でService Worker削除処理追加
    - `navigator.serviceWorker.getRegistrations()` で全Service Worker取得
    - `registration.unregister()` で個別削除
    - `caches.keys()` で全キャッシュストレージ取得・削除
    - コンソールログ出力（削除成功・失敗）
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.7_
  - [ ] 6.2 Amplify設定ファイル作成
    - `frontend/src/config/amplify.ts` 作成
    - CognitoConfig interface定義
    - defaultCognitoConfig実装（環境変数ベース）
    - configureAmplify関数実装（Amplify.configure呼び出し）
    - isLocalhost関数実装（localhost判定ヘルパー）
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.12_
  - [ ] 6.3 AuthContext Amplify統合
    - `frontend/src/contexts/AuthContext.tsx` 修正
    - カスタムCognito SDK削除
    - Amplify Auth API統合（signIn/signOut/getCurrentUser）
    - localStorage認証状態管理削除（Amplify自動管理）
    - リトライメカニズム実装（最大3回）
    - visibility change handler実装（認証状態再確認）
    - _Requirements: 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_
  - [ ] 6.4 App.tsx Amplify初期化
    - `frontend/src/App.tsx` 修正
    - configureAmplify呼び出し追加（Service Worker削除後）
    - localhost判定実装（認証スキップ）
    - dev/prod環境でCognito設定取得
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [ ] 6.5 VitePWA完全無効化確認
    - `frontend/vite.config.ts` 確認
    - VitePWAプラグインコメントアウト確認
    - manifest.json生成無効化確認
    - _Requirements: 8.3_
  - [ ] 6.6 E2Eテスト認証統合検証
    - `tests/e2e/helpers/auth-helper.ts` 確認
    - Amplify signIn使用確認
    - dev/prod環境自動ログイン動作確認
    - local環境認証スキップ確認
    - Service Worker非存在確認テスト実行
    - _Requirements: 8.8, 9.11_
  - [ ]\* 6.7 Service Worker削除・Amplify認証ユニットテスト
    - Service Worker削除処理テスト
    - Amplify設定テスト
    - localhost判定テスト
    - 認証成功率98%以上確認
    - _Requirements: 8.1-8.8, 9.1-9.12_

- [ ] 7. パフォーマンステスト・検証
  - [ ] 7.1 Lighthouse CI設定
    - `.github/workflows/performance-test.yml` 作成
    - treosh/lighthouse-ci-action統合
    - dev環境URL設定（/, /highschool, /university）
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7_
  - [ ] 7.2 パフォーマンスベンチマークテスト作成
    - `frontend/src/__tests__/performance.test.ts` 作成
    - 初回バンドルサイズテスト（<400KB）
    - レンダリング時間テスト（<100ms）
    - 再レンダリング回数テスト（<5回）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - [ ] 7.3 dev環境デプロイ・検証
    - `npm run deploy:dev` 実行
    - E2Eテスト実行（`npm run test:e2e:dev`）
    - Lighthouse CI実行
    - パフォーマンススコア確認（>80）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.3_
  - [ ] 7.4 パフォーマンス指標測定
    - 初回ロード時間測定（目標: 1-2秒）
    - 初回バンドルサイズ測定（目標: 300-400KB）
    - API呼び出し回数測定（最適化前比60-80%削減）
    - 再レンダリング回数測定（最適化前比50-70%削減）
    - DOM要素数測定（目標: 約20個）
    - _Requirements: 6.1, 6.2_
  - [ ] 7.5 CloudWatchパフォーマンスダッシュボード作成
    - `pro-candidate-aws/lib/constructs/monitoring-construct.ts` 修正
    - API Response Time ウィジェット追加
    - CloudFront Cache Hit Rate ウィジェット追加
    - Lambda Invocation Count ウィジェット追加
    - _Requirements: 6.1, 6.2_
  - [ ] 7.6 パフォーマンスアラート設定
    - Slow Response Alarm作成（>1秒）
    - Low Cache Hit Rate Alarm作成（<50%）
    - SNS通知設定
    - _Requirements: 6.1, 6.2_
  - [ ] 7.7 運用ドキュメント更新
    - `docs/PERFORMANCE_OPTIMIZATION.md` 作成
    - 最適化内容・効果まとめ
    - パフォーマンス監視方法
    - トラブルシューティング
    - _Requirements: 7.6_

- [ ] 8. prod環境デプロイ
  - [ ] 8.1 カナリアデプロイ設定
    - `pro-candidate-aws/lib/pro-candidate-aws-stack.ts` 修正
    - Lambda Alias作成
    - CodeDeploy DeploymentGroup設定（CANARY_10PERCENT_5MINUTES）
    - エラーアラーム連携
    - _Requirements: 7.4_
  - [ ] 8.2 prod環境カナリアデプロイ実行
    - `npm run deploy:prod` 実行
    - 10%トラフィック監視（5分間）
    - エラー率確認
    - _Requirements: 7.4, 7.5_
  - [ ] 8.3 prod環境フルデプロイ
    - カナリアデプロイ成功確認後、100%展開
    - E2Eテスト実行（`npm run test:e2e:prod`）
    - パフォーマンス指標確認
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ] 8.4 本番環境検証
    - Lighthouse CI実行（prod環境）
    - パフォーマンススコア確認（>80）
    - キャッシュ動作確認（Cache-Control: public, max-age=300）
    - デバッグログ非表示確認
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3_
  - [ ] 8.5 ロールバック手順確認
    - ロールバックコマンド準備
    - 問題発生時の対応手順確認
    - _Requirements: 7.5_

---

## 注意事項

- **オプションタスク（\*印）**: ユニットテスト・統合テストは品質保証のため推奨されますが、MVP構築では省略可能です
- **実装順序**: タスクは依存関係を考慮して順序付けされています。基本的に上から順に実装してください
- **環境分離**: dev環境で十分にテストしてからprod環境にデプロイしてください
- **パフォーマンス測定**: 各タスク完了後、パフォーマンス指標を測定し、目標達成を確認してください
- **後方互換性**: 既存機能を壊さないよう、慎重に実装してください
- **⚠️ 認証フローの特殊性**: LoginPageやAuthContextなど認証関連コンポーネントは、lazy loadingせず即座読み込みが必須です。これらをlazy loadingすると認証フローが破壊され、「読み込み中...」で止まる問題が発生します

## 実装工数見積もり

| タスク                                 | 工数      |
| -------------------------------------- | --------- |
| 1. ロガーユーティリティ実装            | 0.5日     |
| 2. APIキャッシュ戦略実装               | 0.5日     |
| 3. フロントエンドコード分割            | 0.5日     |
| 4. React最適化（メモ化）               | 1日       |
| 5. 仮想スクロール実装                  | 1日       |
| 6. Service Worker削除・Amplify認証統合 | 1日       |
| 7. パフォーマンステスト・検証          | 0.5日     |
| 8. prod環境デプロイ                    | 0.5日     |
| **合計**                               | **5.5日** |

## 期待効果

### パフォーマンス改善

- ✅ 初回ロード時間: 67-75%短縮（3-5秒 → 1-2秒）
- ✅ 初回バンドルサイズ: 67-75%削減（1.2MB → 300-400KB）
- ✅ API呼び出し: 60-80%削減
- ✅ 再レンダリング: 50-70%削減
- ✅ DOM要素数: 約94%削減（321個 → 約20個）

### 品質改善

- ✅ Lighthouse Performance Score: 80以上
- ✅ 本番環境デバッグログ: 0件
- ✅ セキュリティリスク: 削減
- ✅ 後方互換性: 100%維持

### ユーザー体験

- ✅ ページ読み込み高速化
- ✅ スムーズなスクロール
- ✅ 快適な操作感
- ✅ データ鮮度向上（5分キャッシュ）
