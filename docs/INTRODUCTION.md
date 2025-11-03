# プロ野球志望届管理システム

**最終更新**: 2025-06-28 - 文章量削減最適化

## 🚀 クイックスタート（3分）

```bash
git clone <repository-url> && cd pro_candidate
npm install && npm run dev
npm test && npm run test:e2e:local
git push origin develop  # dev自動デプロイ
```

## 🏗️ アーキテクチャ

**AWS構成**: Lambda + S3 + API Gateway + CloudFront  
**Frontend**: React + TypeScript + PWA  
**コスト**: 月額$0.50以下

## 💻 開発フロー

```bash
git checkout -b feature/your-feature
code .                    # VSCode起動→自動でdev server & E2E起動
npm run ci-check          # 品質チェック
```

### 🚀 VSCode自動起動設定

**自動起動サーバー**（VSCode起動時）:

- 開発サーバー: http://localhost:5173
- Playwright E2E: http://localhost:9323

**手動制御**:

- `Ctrl+Shift+P` → `Tasks: Run Task`
- 🛑 全サーバー停止タスクで一括停止

## 🤖 AI統合

```bash
./scripts/gemini review "$(cat src/file.ts)"  # コードレビュー
./scripts/gemini debug "エラーメッセージ"        # エラー解析
```

## 📚 ドキュメント

- [アーキテクチャ](ARCHITECTURE.md)
- [デプロイ](development/DEPLOYMENT.md)
- [テスト](development/TESTING/E2E_TESTING.md)
- [トラブル対応](operation/TROUBLESHOOTING.md)

## 🔧 セットアップ詳細

### 基本セットアップ

```bash
# 前提条件: Node.js 18.x以上
node --version  # v18.x確認

# プロジェクト準備
git clone <repository-url> && cd pro_candidate
npm install

# 環境設定
cp .env.example .env.local
# AWS_REGION=ap-northeast-1
# GOOGLE_GEMINI_API_KEY=your-key
```

### AWS環境設定

```bash
# AWS CLI設定
aws configure
# AWS CDK準備
npm install -g aws-cdk
cdk bootstrap
```

### 開発環境確認

```bash
npm run dev              # Frontend: http://localhost:5173
npm test                 # Unit tests
npm run test:e2e:local   # E2E tests
npm run ci-check         # Quality check
```

**環境**: [dev](http://pro-candidate-frontend-dev.s3-website-ap-northeast-1.amazonaws.com) | [prod](http://pro-candidate-frontend-prod.s3-website-ap-northeast-1.amazonaws.com)

詳細は[DEPLOYMENT.md](development/DEPLOYMENT.md)参照
