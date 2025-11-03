#!/bin/bash

# S3 Website設定検証・修復スクリプト
# Usage: ./scripts/verify-s3-website-config.sh [environment]

set -e

ENVIRONMENT=${1:-dev}
BUCKET_NAME="pro-candidate-frontend-${ENVIRONMENT}"

echo "🔍 S3 Website Configuration Verification"
echo "=========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Bucket Name: ${BUCKET_NAME}"
echo ""

# バケット存在確認
echo "1. Checking bucket existence..."
if aws s3 ls "s3://${BUCKET_NAME}" > /dev/null 2>&1; then
    echo "✅ Bucket exists: ${BUCKET_NAME}"
else
    echo "❌ Bucket not found: ${BUCKET_NAME}"
    exit 1
fi

# Website設定確認
echo ""
echo "2. Checking Website configuration..."
WEBSITE_CONFIG=$(aws s3api get-bucket-website --bucket "${BUCKET_NAME}" 2>/dev/null || echo "NONE")

if [ "$WEBSITE_CONFIG" = "NONE" ]; then
    echo "❌ No Website configuration found"
    HAS_WEBSITE_CONFIG=false
else
    echo "✅ Website configuration found:"
    echo "$WEBSITE_CONFIG" | python3 -m json.tool
    
    # ErrorDocumentの確認
    if echo "$WEBSITE_CONFIG" | grep -q '"Key": "index.html"'; then
        echo "✅ ErrorDocument correctly set to index.html (SPA support)"
        HAS_SPA_CONFIG=true
    else
        echo "⚠️ ErrorDocument not set to index.html (SPA support missing)"
        HAS_SPA_CONFIG=false
    fi
    HAS_WEBSITE_CONFIG=true
fi

# バケットポリシー確認
echo ""
echo "3. Checking bucket policy..."
BUCKET_POLICY=$(aws s3api get-bucket-policy --bucket "${BUCKET_NAME}" 2>/dev/null || echo "NONE")

if [ "$BUCKET_POLICY" = "NONE" ]; then
    echo "⚠️ No bucket policy found"
    HAS_BUCKET_POLICY=false
else
    echo "✅ Bucket policy found"
    HAS_BUCKET_POLICY=true
fi

# パブリックアクセス設定確認
echo ""
echo "4. Checking public access settings..."
PUBLIC_ACCESS=$(aws s3api get-public-access-block --bucket "${BUCKET_NAME}" 2>/dev/null || echo "NONE")

if [ "$PUBLIC_ACCESS" = "NONE" ]; then
    echo "⚠️ No public access block configuration found"
else
    echo "ℹ️ Public access block configuration:"
    echo "$PUBLIC_ACCESS" | python3 -m json.tool
fi

# Webサイトアクセステスト
echo ""
echo "5. Testing website access..."
WEBSITE_URL="http://${BUCKET_NAME}.s3-website-ap-northeast-1.amazonaws.com"
echo "Website URL: ${WEBSITE_URL}"

if curl -f "${WEBSITE_URL}" -o /dev/null -s -w "%{http_code}\n" | grep -q "200"; then
    echo "✅ Website is accessible (HTTP 200)"
    WEBSITE_ACCESSIBLE=true
else
    echo "❌ Website is not accessible"
    WEBSITE_ACCESSIBLE=false
fi

# SPA直接アクセステスト
echo ""
echo "6. Testing SPA direct access..."
SPA_TEST_URL="${WEBSITE_URL}/highschool-players"
echo "SPA Test URL: ${SPA_TEST_URL}"

HTTP_CODE=$(curl -s -w "%{http_code}\n" "${SPA_TEST_URL}" -o /dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SPA direct access works (HTTP 200)"
    SPA_DIRECT_ACCESS=true
else
    echo "❌ SPA direct access failed (HTTP ${HTTP_CODE})"
    SPA_DIRECT_ACCESS=false
fi

# 総合判定
echo ""
echo "=========================================="
echo "📊 Summary Report"
echo "=========================================="
echo "Bucket Exists: $([ "$HAS_WEBSITE_CONFIG" = true ] && echo "✅ Yes" || echo "❌ No")"
echo "Website Config: $([ "$HAS_WEBSITE_CONFIG" = true ] && echo "✅ Yes" || echo "❌ No")"
echo "SPA Config: $([ "$HAS_SPA_CONFIG" = true ] && echo "✅ Yes" || echo "❌ No")"
echo "Bucket Policy: $([ "$HAS_BUCKET_POLICY" = true ] && echo "✅ Yes" || echo "⚠️ No")"
echo "Website Access: $([ "$WEBSITE_ACCESSIBLE" = true ] && echo "✅ Yes" || echo "❌ No")"
echo "SPA Direct Access: $([ "$SPA_DIRECT_ACCESS" = true ] && echo "✅ Yes" || echo "❌ No")"

# 修復オプション
if [ "$HAS_WEBSITE_CONFIG" = false ] || [ "$HAS_SPA_CONFIG" = false ]; then
    echo ""
    echo "🔧 Repair Options"
    echo "=================="
    
    read -p "Do you want to configure Website settings for SPA support? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Configuring Website settings..."
        
        aws s3api put-bucket-website --bucket "${BUCKET_NAME}" \
            --website-configuration '{
                "IndexDocument": {"Suffix": "index.html"},
                "ErrorDocument": {"Key": "index.html"}
            }'
        
        echo "✅ Website configuration updated"
        
        # 再テスト
        echo "🔄 Re-testing website access..."
        sleep 5
        
        HTTP_CODE=$(curl -s -w "%{http_code}\n" "${SPA_TEST_URL}" -o /dev/null)
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ SPA direct access now works!"
        else
            echo "⚠️ SPA direct access still failing (HTTP ${HTTP_CODE})"
            echo "   This may take a few minutes to propagate"
        fi
    fi
fi

echo ""
echo "🏁 Verification completed"
echo "For issues, check: https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html"