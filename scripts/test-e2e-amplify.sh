#!/bin/bash

# E2Eテスト実行スクリプト（AWS Amplify認証使用）

# 第一引数で環境を指定（dev or prod）
ENVIRONMENT=${1:-dev}

# 環境別の変数ファイルを読み込み
if [ "$ENVIRONMENT" == "prod" ]; then
    echo "🔐 Production環境のE2Eテストを実行します..."
    export $(cat .env.e2e.prod | grep -v '^#' | xargs)
elif [ "$ENVIRONMENT" == "dev" ]; then
    echo "🔐 Development環境のE2Eテストを実行します..."
    export $(cat .env.e2e.dev | grep -v '^#' | xargs)
else
    echo "❌ 無効な環境: $ENVIRONMENT"
    echo "使用方法: $0 [dev|prod]"
    exit 1
fi

# 認証ディレクトリの作成
AUTH_DIR="playwright/.auth"
mkdir -p "$AUTH_DIR"

echo "🚀 E2E_ENVIRONMENT=$E2E_ENVIRONMENT"
echo "🌐 E2E_BASE_URL=$E2E_BASE_URL"
echo "📡 E2E_API_BASE_URL=$E2E_API_BASE_URL"

# 既存の認証ファイルをクリア（新しい認証を強制）
AUTH_FILE="$AUTH_DIR/${ENVIRONMENT}.json"
if [ -f "$AUTH_FILE" ]; then
    echo "🗑️ 既存の認証ファイルを削除: $AUTH_FILE"
    rm "$AUTH_FILE"
fi

# Playwrightテストの実行
echo "🎭 Playwrightテストを開始します..."
npx playwright test

# テスト結果の確認
if [ $? -eq 0 ]; then
    echo "✅ E2Eテスト成功！"
else
    echo "❌ E2Eテスト失敗"
    exit 1
fi