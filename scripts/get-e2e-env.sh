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

# CloudFrontドメインを取得（動的OutputKey対応）
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?contains(OutputKey, `CloudFrontDistributionUrl`)].OutputValue' \
    --output text 2>/dev/null || echo "")

# API URLを取得
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

# S3 Websiteをフォールバックとして取得
S3_WEBSITE_URL="http://pro-candidate-frontend-${ENV}.s3-website-ap-northeast-1.amazonaws.com"

# CloudFrontが利用可能な場合はそれを使用、そうでなければS3 Websiteを使用
if [ -n "$CLOUDFRONT_URL" ]; then
    BASE_URL="$CLOUDFRONT_URL"
    if [ "$QUIET_MODE" != "true" ]; then
        echo "✅ Retrieved environment variables:"
        echo "  CloudFront URL: ${CLOUDFRONT_URL:-'Not found'}"
        echo "  API URL: ${API_URL:-'Not found'}"
        echo "  S3 Website URL (fallback): ${S3_WEBSITE_URL}"
        echo "🌐 Using CloudFront URL: $BASE_URL"
    fi
else
    BASE_URL="$S3_WEBSITE_URL"
    if [ "$QUIET_MODE" != "true" ]; then
        echo "✅ Retrieved environment variables:"
        echo "  CloudFront URL: ${CLOUDFRONT_URL:-'Not found'}"
        echo "  API URL: ${API_URL:-'Not found'}"
        echo "  S3 Website URL (fallback): ${S3_WEBSITE_URL}"
        echo "⚠️ CloudFront URL not found, using S3 Website URL: $BASE_URL"
    fi
fi

# Cognito認証情報を設定
if [ "$ENV" = "dev" ]; then
    COGNITO_USER_POOL_ID="ap-northeast-1_yRTv0CRfz"
    COGNITO_CLIENT_ID="6cfk60qf91r0qch7nfjops0scd"
    COGNITO_USERNAME="admin"
    COGNITO_PASSWORD="AdminPass123!"
elif [ "$ENV" = "prod" ]; then
    COGNITO_USER_POOL_ID="ap-northeast-1_5m7pnXzt8"
    COGNITO_CLIENT_ID="3vuipnf467d9q43k40fo480fdk"
    COGNITO_USERNAME="admin"
    COGNITO_PASSWORD="AdminPass123!"
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