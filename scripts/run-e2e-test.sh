#!/bin/bash

# E2Eテストを動的CloudFrontドメインで実行するスクリプト

set -e

# 使用方法の表示
usage() {
    echo "Usage: $0 <environment> [options] [-- <playwright-args>]"
    echo ""
    echo "Environments:"
    echo "  local  - ローカル開発環境 (localhost:5173)"
    echo "  dev    - 開発環境 (CloudFront/S3 Website)"
    echo "  prod   - 本番環境 (CloudFront/S3 Website)"
    echo ""
    echo "Options:"
    echo "  --headed     - ヘッドありモードで実行"
    echo "  --debug      - デバッグモードで実行"
    echo "  --api-only   - API専用テストのみ実行"
    echo "  --optimized  - 最適化設定で実行"
    echo "  --help       - このヘルプを表示"
    echo ""
    echo "Examples:"
    echo "  $0 dev                    # dev環境でE2Eテスト実行"
    echo "  $0 prod --headed          # prod環境でヘッドありモード実行"
    echo "  $0 dev --api-only         # dev環境でAPI専用テスト実行"
    echo "  $0 prod -- --grep login   # prod環境でloginテストのみ実行"
    exit 1
}

# 引数の解析
if [ $# -eq 0 ] || [ "$1" = "--help" ]; then
    usage
fi

ENV="$1"
shift

# 環境の検証
if [ "$ENV" != "local" ] && [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
    echo "ERROR: Invalid environment '$ENV'. Must be 'local', 'dev', or 'prod'."
    exit 1
fi

# オプションの解析
HEADED=""
DEBUG=""
API_ONLY=""
OPTIMIZED=""
PLAYWRIGHT_ARGS=""

while [ $# -gt 0 ]; do
    case $1 in
        --headed)
            HEADED="--headed"
            shift
            ;;
        --debug)
            DEBUG="--debug"
            shift
            ;;
        --api-only)
            API_ONLY="true"
            shift
            ;;
        --optimized)
            OPTIMIZED="true"
            shift
            ;;
        --)
            shift
            PLAYWRIGHT_ARGS="$*"
            break
            ;;
        *)
            echo "ERROR: Unknown option '$1'"
            usage
            ;;
    esac
done

echo "Starting E2E tests for $ENV environment..."

# ローカル環境の場合は環境変数設定をスキップ
if [ "$ENV" = "local" ]; then
    echo "Using local environment (localhost:5173)"
    BASE_URL="http://localhost:5173"
    # local環境でもdev環境の実際のAPIを使用（サーバーレスアーキテクチャのため）
    API_URL="https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev/"
else
    echo "Getting dynamic environment variables..."
    
    # 環境変数を動的に取得
    ENV_VARS=$(scripts/get-e2e-env.sh "$ENV" --quiet)
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to get environment variables for $ENV"
        exit 1
    fi
    
    # 環境変数を設定
    eval "$ENV_VARS"
    
    # 取得した環境変数を表示
    echo "Environment variables:"
    echo "  E2E_BASE_URL: $E2E_BASE_URL"
    echo "  E2E_API_URL: ${E2E_API_URL:-'Not set'}"
    echo "  E2E_ENVIRONMENT: $E2E_ENVIRONMENT"
    
    BASE_URL="$E2E_BASE_URL"
    API_URL="$E2E_API_URL"
fi

# Playwrightコマンドの構築
PLAYWRIGHT_CMD="npx playwright test"

# 設定ファイルの選択
if [ "$OPTIMIZED" = "true" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --config=playwright.config.optimized.ts"
else
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --config=playwright.config.ts"
fi

# API専用テストの場合
if [ "$API_ONLY" = "true" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD tests/e2e/specs/api.spec.ts"
fi

# デバッグ・ヘッドモードの追加
if [ -n "$DEBUG" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $DEBUG"
elif [ -n "$HEADED" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $HEADED"
fi

# 追加のPlaywrightオプション
if [ -n "$PLAYWRIGHT_ARGS" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $PLAYWRIGHT_ARGS"
fi

echo "Executing Playwright command:"
echo "  $PLAYWRIGHT_CMD"
echo ""

# 環境変数を設定してPlaywrightを実行
if [ "$ENV" = "local" ]; then
    # ローカル環境
    exec env E2E_BASE_URL="$BASE_URL" E2E_API_URL="$API_URL" E2E_ENVIRONMENT="$ENV" $PLAYWRIGHT_CMD
else
    # リモート環境
    exec env E2E_BASE_URL="$BASE_URL" E2E_API_URL="$API_URL" E2E_ENVIRONMENT="$ENV" $PLAYWRIGHT_CMD
fi