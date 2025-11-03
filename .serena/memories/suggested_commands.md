# 推奨コマンド一覧

## 開発ワークフロー

```bash
# ローカル開発
npm run dev                    # Vite開発サーバー起動 (localhost:5173)
npm run build                  # 本番ビルド (16.96s)
npm run preview               # ビルド確認

# デプロイ（GitHub Actions推奨）
git push origin develop       # dev環境自動デプロイ
git tag v1.x.x && git push origin v1.x.x  # prod環境自動デプロイ
```

## テスト実行

```bash
# ローカルE2Eテスト
npm run test:e2e:local       # localhost:5173対象（認証スキップ）

# 環境別E2Eテスト
npm run test:e2e:dev         # dev環境フロントエンド（AWS Cognito認証）
npm run test:e2e:prod        # prod環境フロントエンド（AWS Cognito認証）
npm run test:e2e:api:dev     # dev環境API専用（認証不要・高速3.2秒）
npm run test:e2e:api:prod    # prod環境API専用

# デバッグモード（ブラウザ表示）
npm run test:e2e:dev:headed  # dev環境ヘッドありモード
npm run test:e2e:dev:debug   # dev環境ステップ実行

# ユニットテスト
npm test                      # 全テスト
npm run test:unit            # 単体テストのみ
npm run test:integration     # 統合テストのみ
npm run test:coverage        # カバレッジレポート付き

# HTMLレポート配信
npm run e2e:server           # http://localhost:9323（環境選択画面）
```

## コード品質管理

```bash
# リンティング
npm run lint                 # ESLint実行
npm run lint:fix             # 自動修正
npm run format               # Prettier実行
npm run typecheck            # TypeScript型チェック

# 静的解析
npm run analyze              # 包括的解析
npm run analyze:visual       # ビジュアルダッシュボード生成
npm run ci-check             # CI環境同等の厳密チェック
```

## Lambda/AWS関連

```bash
# スクレイピング実行確認
scripts/verify-lambda-environment.sh dev   # dev環境検証
scripts/verify-lambda-environment.sh prod  # prod環境検証

# CloudFront/ドメイン動的取得
scripts/get-e2e-env.sh dev --write-env    # .env.e2e.dev生成
scripts/run-e2e-test.sh dev --headed      # 動的ドメイン取得してE2E実行

# 環境変数確認
echo $E2E_BASE_URL            # 環境変数表示
echo $REACT_APP_API_GATEWAY   # API Gateway URL
```

## Gemini/AI統合

```bash
# 直接Gemini API利用（Claude Code推奨）
./scripts/gemini chat "質問"              # チャット
./scripts/gemini review "$(cat file.ts)"  # コードレビュー
./scripts/gemini explain "概念"           # 解説
./scripts/gemini debug "エラー"           # デバッグ
./scripts/gemini docs "$(cat src/)"       # ドキュメント生成
./scripts/gemini test "$(cat utils.ts)"   # テストコード生成

# npmスクリプト経由
npm run gemini chat "質問"
npm run gemini:review "コード"
```

## その他

```bash
# Git操作
git status                           # 状態確認
git diff                             # 差分確認
git log --oneline -10                # コミット履歴

# ドキュメント確認
cat CLAUDE.md                        # プロジェクトガイドライン
cat docs/work_logs/20251102.md      # 本日の作業日誌
```

## 重要なルール

- ✅ 推奨: GitHub Actions自動デプロイ (手動CDKデプロイ禁止)
- ✅ 推奨: 環境変数は動的取得 (ハードコード禁止)
- ✅ 推奨: E2Eテスト実行前に環境確認
- ❌ 禁止: CDK手動デプロイ (緊急時のみ、事前協議)
- ❌ 禁止: 本番環境へのdevelop直接マージ
