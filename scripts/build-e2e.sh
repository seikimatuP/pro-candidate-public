#!/bin/bash

# E2Eテスト用のビルドスクリプト
# 認証をバイパスしてビルドする

echo "Building frontend with E2E test configuration..."

cd frontend

# 既存の環境変数を保存
if [ -f .env.production ]; then
    mv .env.production .env.production.backup
fi

# E2E用環境変数を設定
cat > .env.production << EOF
VITE_AUTH_REQUIRED=false
VITE_E2E_TEST=true
VITE_ENVIRONMENT=e2e
EOF

# ビルド実行
npm run build

# 環境変数を元に戻す
rm .env.production
if [ -f .env.production.backup ]; then
    mv .env.production.backup .env.production
fi

echo "E2E test build completed!"