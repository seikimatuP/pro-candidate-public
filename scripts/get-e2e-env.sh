#!/bin/bash

# E2Eテスト環境変数を動的に取得するスクリプト
# CloudFrontドメインとAPIエンドポイントをCDK Outputsから取得

set -e

# 引数の解析
QUIET_MODE=""
WRITE_ENV=""
while [ $# -gt 0 ]; do
    case $1 in
        --quiet)
            QUIET_MODE="true"
            shift
            ;;
        --write-env)
            WRITE_ENV="true"
            shift
            ;;
        dev|prod)
            ENV="$1"
            shift
            ;;
        *)
            echo "Usage: $0 [--quiet] <environment> [--write-env]"
            echo "  --quiet: 環境変数のみ出力（evalで使用可能）"
            echo "  environment: dev or prod"
            echo "  --write-env: .envファイルに書き出し"
            exit 1
            ;;
    esac
done

# 環境名の引数チェック
if [ -z "$ENV" ]; then
    echo "Usage: $0 [--quiet] <environment> [--write-env]"
    echo "  environment: dev or prod"
    exit 1
fi
STACK_NAME="ProBaseballStack-${ENV}"

if [ "$QUIET_MODE" != "true" ]; then
    echo "🔍 Getting E2E environment variables for ${ENV} environment..."
    echo "📡 Retrieving CloudFormation outputs..."
fi

# CloudFrontドメインを取得（動的OutputKey対応 - FrontendUrlも検索）
# まずFrontendUrl（優先）を検索、見つからない場合はCloudFront関連のキーを検索
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
    --output text 2>/dev/null || echo "")

# FrontendUrlが見つからない場合はCloudFrontDistributionUrlを検索
if [ -z "$CLOUDFRONT_URL" ] || [ "$CLOUDFRONT_URL" = "None" ]; then
    CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?contains(OutputKey, `CloudFrontDistributionUrl`)].OutputValue' \
        --output text 2>/dev/null | tr '\t' '\n' | head -n 1 || echo "")
fi

# API URLを取得
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

# CloudFront URLのハードコードフォールバック（CI環境でCloudFormationクエリが失敗する場合用）
# これらのURLはCDKで作成された実際のCloudFrontディストリビューションのURL
if [ "$ENV" = "dev" ]; then
    CLOUDFRONT_FALLBACK_URL="https://d3brmn978dqs63.cloudfront.net"
elif [ "$ENV" = "prod" ]; then
    CLOUDFRONT_FALLBACK_URL="https://dh2yk8y9mj9wl.cloudfront.net"
fi

# S3 Websiteをフォールバックとして取得（最終手段、非推奨）
S3_WEBSITE_URL="http://pro-candidate-frontend-${ENV}.s3-website-ap-northeast-1.amazonaws.com"

# CloudFrontが利用可能な場合はそれを使用
if [ -n "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "None" ]; then
    BASE_URL="$CLOUDFRONT_URL"
    if [ "$QUIET_MODE" != "true" ]; then
        echo "✅ Retrieved environment variables:"
        echo "  CloudFront URL: ${CLOUDFRONT_URL}"
        echo "  API URL: ${API_URL:-'Not found'}"
        echo "🌐 Using CloudFront URL from CloudFormation: $BASE_URL"
    fi
elif [ -n "$CLOUDFRONT_FALLBACK_URL" ]; then
    # CloudFormationからの取得に失敗した場合、ハードコードされたCloudFront URLを使用
    BASE_URL="$CLOUDFRONT_FALLBACK_URL"
    if [ "$QUIET_MODE" != "true" ]; then
        echo "⚠️ CloudFormation query failed, using hardcoded CloudFront URL"
        echo "  CloudFront URL (fallback): ${CLOUDFRONT_FALLBACK_URL}"
        echo "  API URL: ${API_URL:-'Not found'}"
        echo "🌐 Using fallback CloudFront URL: $BASE_URL"
    fi
else
    # 最終手段としてS3 Website URL（非推奨、HTTP接続問題の可能性あり）
    BASE_URL="$S3_WEBSITE_URL"
    if [ "$QUIET_MODE" != "true" ]; then
        echo "❌ CloudFront URL not available, using S3 Website URL (not recommended)"
        echo "  S3 Website URL: ${S3_WEBSITE_URL}"
        echo "  API URL: ${API_URL:-'Not found'}"
        echo "⚠️ Using S3 Website URL: $BASE_URL"
    fi
fi

# Cognito設定（User Pool ID / Client ID は公開情報なので既定値を持たせる）
if [ "$ENV" = "dev" ]; then
    COGNITO_USER_POOL_ID="${COGNITO_USER_POOL_ID:-ap-northeast-1_devPoolId}"
    COGNITO_CLIENT_ID="${COGNITO_CLIENT_ID:-devclientidxxxxxxxxxxxxxxx}"
elif [ "$ENV" = "prod" ]; then
    COGNITO_USER_POOL_ID="${COGNITO_USER_POOL_ID:-ap-northeast-1_prodPoolId}"
    COGNITO_CLIENT_ID="${COGNITO_CLIENT_ID:-prodclientidxxxxxxxxxxxxxx}"
fi

# 認証情報は Doppler（e2e_dev / e2e_prod config）から注入する。
# ユーザー名は秘密情報ではないので既定値 admin を許容するが、
# パスワードはフォールバックを持たず、未設定なら明確なエラーで終了する。
COGNITO_USERNAME="${COGNITO_USERNAME:-${E2E_USERNAME:-admin}}"
COGNITO_PASSWORD="${COGNITO_PASSWORD:-${E2E_PASSWORD:-}}"

if [ -z "$COGNITO_PASSWORD" ]; then
    echo "❌ COGNITO_PASSWORD が未設定です（${ENV} 環境）" >&2
    echo "   Doppler の e2e_${ENV} config に COGNITO_PASSWORD を設定し、doppler run 経由で実行してください:" >&2
    echo "     doppler run --project pro-candidate --config e2e_${ENV} -- $0 ${ENV}" >&2
    echo "   通常は pnpm run test:e2e:${ENV} から呼ばれます（doppler run を内包）。" >&2
    exit 1
fi

# 環境変数を出力（evalで使用可能）
if [ "$QUIET_MODE" != "true" ]; then
    echo ""
    echo "# Environment variables for E2E tests:"
fi
echo "export E2E_BASE_URL='$BASE_URL'"
if [ -n "$API_URL" ]; then
    echo "export E2E_API_URL='$API_URL'"
fi
echo "export E2E_ENVIRONMENT='$ENV'"
echo "export E2E_COGNITO_USER_POOL_ID='$COGNITO_USER_POOL_ID'"
echo "export E2E_COGNITO_CLIENT_ID='$COGNITO_CLIENT_ID'"
echo "export E2E_USERNAME='$COGNITO_USERNAME'"
echo "export E2E_PASSWORD='$COGNITO_PASSWORD'"

# .envファイルとして出力（オプション）
if [ "$WRITE_ENV" = "true" ]; then
    ENV_FILE=".env.e2e.${ENV}"
    if [ "$QUIET_MODE" != "true" ]; then
        echo "📝 Writing environment variables to $ENV_FILE"
    fi
    cat > "$ENV_FILE" << EOF
# E2E Test Environment Variables for ${ENV}
# Generated on $(date)
E2E_BASE_URL=$BASE_URL
EOF
    if [ -n "$API_URL" ]; then
        echo "E2E_API_URL=$API_URL" >> "$ENV_FILE"
    fi
    echo "E2E_ENVIRONMENT=$ENV" >> "$ENV_FILE"
    echo "E2E_COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID" >> "$ENV_FILE"
    echo "E2E_COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID" >> "$ENV_FILE"
    echo "E2E_USERNAME=$COGNITO_USERNAME" >> "$ENV_FILE"
    echo "E2E_PASSWORD=$COGNITO_PASSWORD" >> "$ENV_FILE"
    if [ "$QUIET_MODE" != "true" ]; then
        echo "✅ Environment file created: $ENV_FILE"
    fi
fi