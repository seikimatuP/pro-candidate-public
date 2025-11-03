#!/bin/bash

# SPA設定確認・修正スクリプト
# Usage: ./scripts/fix-spa-settings.sh [dev|prod|all]

set -e

ENVIRONMENT=${1:-"all"}

apply_spa_settings() {
    local env=$1
    local bucket="pro-candidate-frontend-${env}"
    
    echo "🔧 ${env}環境SPA設定適用中..."
    
    # S3バケット存在確認
    if aws s3api head-bucket --bucket "$bucket" &>/dev/null; then
        # SPA用RoutingRules設定
        aws s3api put-bucket-website \
            --bucket "$bucket" \
            --website-configuration '{
                "IndexDocument": {"Suffix": "index.html"},
                "ErrorDocument": {"Key": "index.html"},
                "RoutingRules": [{
                    "Condition": {"HttpErrorCodeReturnedEquals": "404"},
                    "Redirect": {"ReplaceKeyWith": "index.html"}
                }]
            }'
        
        echo "✅ ${env}環境SPA設定完了"
        
        # 設定確認
        echo "📋 設定確認中..."
        aws s3api get-bucket-website --bucket "$bucket" | jq '.RoutingRules // "RoutingRules未設定"'
    else
        echo "⚠️ ${env}環境バケット(${bucket})が存在しません"
    fi
    
    echo ""
}

check_spa_settings() {
    local env=$1
    local bucket="pro-candidate-frontend-${env}"
    
    echo "🔍 ${env}環境SPA設定確認中..."
    
    if aws s3api head-bucket --bucket "$bucket" &>/dev/null; then
        local routing_rules=$(aws s3api get-bucket-website --bucket "$bucket" 2>/dev/null | jq '.RoutingRules // empty')
        
        if [ -n "$routing_rules" ] && [ "$routing_rules" != "null" ]; then
            echo "✅ ${env}環境: SPA設定済み"
        else
            echo "❌ ${env}環境: SPA設定不足"
            return 1
        fi
    else
        echo "⚠️ ${env}環境バケット(${bucket})が存在しません"
        return 1
    fi
}

main() {
    echo "🚀 SPA設定管理スクリプト開始"
    echo "対象環境: $ENVIRONMENT"
    echo ""
    
    case $ENVIRONMENT in
        "dev")
            apply_spa_settings "dev"
            ;;
        "prod")
            apply_spa_settings "prod"
            ;;
        "all")
            apply_spa_settings "dev"
            apply_spa_settings "prod"
            ;;
        "check")
            echo "📋 全環境SPA設定確認"
            check_spa_settings "dev"
            check_spa_settings "prod"
            ;;
        *)
            echo "❌ 使用方法: $0 [dev|prod|all|check]"
            exit 1
            ;;
    esac
    
    echo "🎉 SPA設定管理完了"
}

main "$@"