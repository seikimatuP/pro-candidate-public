#!/bin/bash

# Lambda環境変数検証・スクレイピング機能テストスクリプト
# Usage: verify-lambda-environment.sh <environment>
# 
# Options:
#   environment      : dev または prod (デフォルト: dev)

set -euo pipefail

# ヘルプ表示
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "Lambda環境変数検証・スクレイピング機能テストスクリプト"
    echo ""
    echo "使用方法:"
    echo "  $0 <environment>"
    echo ""
    echo "引数:"
    echo "  environment      : dev または prod (デフォルト: dev)"
    echo ""
    echo "例:"
    echo "  $0 dev                    # dev環境の完全検証"
    echo "  $0 prod                   # prod環境の完全検証"
    echo ""
    echo "実行内容:"
    echo "  1. Lambda関数の環境変数検証（Critical/Warning変数）"
    echo "  2. S3バケット接続テスト"
    echo "  3. スクレイピング実行前後のS3データファイル更新確認"
    echo ""
    exit 0
fi

ENVIRONMENT=${1:-dev}
LOG_FILE="/tmp/lambda-env-verification-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"

# ログ関数
log() {
    local level="$1"
    shift
    echo "[$level] $*" | tee -a "$LOG_FILE"
}

log "INFO" "🔍 Lambda環境変数検証開始: $ENVIRONMENT"

# 検証対象Lambda関数
FUNCTIONS=(
    "pro-baseball-api-${ENVIRONMENT}"
    "pro-baseball-scraping-${ENVIRONMENT}"
    "pro-baseball-processing-${ENVIRONMENT}"
)

# 必須環境変数（Critical）
CRITICAL_VARS=(
    "S3_DATA_BUCKET"
    "ENVIRONMENT"
)

# 重要環境変数（Warning）
WARNING_VARS=(
    "LOG_LEVEL"
    "NODE_ENV"
)

CRITICAL_ISSUES=0
WARNING_ISSUES=0
TOTAL_CHECKED=0

# 各Lambda関数の環境変数をチェック
for FUNCTION_NAME in "${FUNCTIONS[@]}"; do
    log "INFO" "📋 チェック中: $FUNCTION_NAME"
    
    # Lambda関数の存在確認
    if ! aws lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
        log "WARN" "⚠️ Lambda関数が存在しません: $FUNCTION_NAME"
        WARNING_ISSUES=$((WARNING_ISSUES + 1))
        continue
    fi
    
    # 環境変数取得
    ENV_JSON=$(aws lambda get-function-configuration --function-name "$FUNCTION_NAME" --query 'Environment.Variables' --output json 2>/dev/null || echo '{}')
    
    if [ "$ENV_JSON" = "null" ] || [ "$ENV_JSON" = "{}" ]; then
        log "ERROR" "❌ 環境変数が設定されていません: $FUNCTION_NAME"
        CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
        continue
    fi
    
    # Critical変数のチェック
    for VAR in "${CRITICAL_VARS[@]}"; do
        VALUE=$(echo "$ENV_JSON" | jq -r ".$VAR // \"NOT_SET\"")
        TOTAL_CHECKED=$((TOTAL_CHECKED + 1))
        
        if [ "$VALUE" = "NOT_SET" ]; then
            log "ERROR" "❌ $VAR: NOT SET (Critical)"
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
        else
            log "INFO" "✅ $VAR: $VALUE"
        fi
    done
    
    # Warning変数のチェック
    for VAR in "${WARNING_VARS[@]}"; do
        VALUE=$(echo "$ENV_JSON" | jq -r ".$VAR // \"NOT_SET\"")
        TOTAL_CHECKED=$((TOTAL_CHECKED + 1))
        
        if [ "$VALUE" = "NOT_SET" ]; then
            log "WARN" "⚠️ $VAR: NOT SET (Warning)"
            WARNING_ISSUES=$((WARNING_ISSUES + 1))
        else
            log "INFO" "✅ $VAR: $VALUE"
        fi
    done
    
    # S3バケット接続テスト（API Lambda関数のみ）
    if [[ "$FUNCTION_NAME" == *"api"* ]]; then
        S3_BUCKET=$(echo "$ENV_JSON" | jq -r '.S3_DATA_BUCKET // "NOT_SET"')
        if [ "$S3_BUCKET" != "NOT_SET" ]; then
            if aws s3 ls "s3://$S3_BUCKET/" >/dev/null 2>&1; then
                log "INFO" "✅ S3バケット接続OK: $S3_BUCKET"
            else
                log "ERROR" "❌ S3バケット接続失敗: $S3_BUCKET"
                CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
            fi
        fi
    fi
    
    # スクレイピング機能テスト（scraping Lambda関数のみ）
    if [[ "$FUNCTION_NAME" == *"scraping"* ]]; then
        S3_BUCKET=$(echo "$ENV_JSON" | jq -r '.S3_DATA_BUCKET // "NOT_SET"')
        if [ "$S3_BUCKET" != "NOT_SET" ]; then
            log "INFO" "🔄 スクレイピング実行前後のS3データファイル更新確認を開始"
            
            # スクレイピング実行前のタイムスタンプ取得
            BEFORE_TIMESTAMPS=""
            DATA_FILES=(
                "players/highschool/2024.json"
                "players/university/2024.json"
            )
            
            for DATA_FILE in "${DATA_FILES[@]}"; do
                if TIMESTAMP=$(aws s3api head-object --bucket "$S3_BUCKET" --key "$DATA_FILE" --query 'LastModified' --output text 2>/dev/null); then
                    BEFORE_TIMESTAMPS="${BEFORE_TIMESTAMPS}${DATA_FILE}:${TIMESTAMP}\n"
                    log "INFO" "📄 実行前タイムスタンプ: $DATA_FILE -> $TIMESTAMP"
                else
                    log "WARN" "⚠️ データファイルが存在しません: s3://$S3_BUCKET/$DATA_FILE"
                fi
            done
            
            # スクレイピング実行（リトライ付き）
            log "INFO" "🚀 スクレイピング実行中..."
            SCRAPING_SUCCESS=false
            for attempt in {1..3}; do
                log "INFO" "📝 実行試行 $attempt/3..."
                
                # JSONペイロード準備（Base64エンコードで文字化け問題を完全回避）
                JSON_PAYLOAD='{"type": "both", "year": 2024}'
                ENCODED_PAYLOAD=$(echo -n "$JSON_PAYLOAD" | base64)
                
                # ペイロードの内容確認（デバッグ用）
                log "INFO" "📄 ペイロード内容: $JSON_PAYLOAD"
                log "INFO" "🔐 Base64エンコード: $ENCODED_PAYLOAD"
                log "INFO" "💻 実行コマンド: aws lambda invoke --function-name '$FUNCTION_NAME' --payload '$ENCODED_PAYLOAD'"
                
                # ログファイルに詳細出力を記録
                LAMBDA_LOG="/tmp/lambda-invoke-${attempt}.log"
                if aws lambda invoke \
                    --function-name "$FUNCTION_NAME" \
                    --payload "$ENCODED_PAYLOAD" \
                    --cli-read-timeout 300 \
                    --cli-connect-timeout 60 \
                    /tmp/scraping-response.json > "$LAMBDA_LOG" 2>&1; then
                    
                    # レスポンスファイル存在確認
                    if [ -f "/tmp/scraping-response.json" ]; then
                        RESPONSE_SIZE=$(wc -c < /tmp/scraping-response.json)
                        if [ "$RESPONSE_SIZE" -gt 10 ]; then
                            SCRAPING_SUCCESS=true
                            log "INFO" "✅ スクレイピング実行成功（試行 $attempt）"
                            log "INFO" "📄 Lambda出力: $(cat "$LAMBDA_LOG")"
                            break
                        else
                            log "WARN" "⚠️ レスポンスが空です（試行 $attempt）- サイズ: ${RESPONSE_SIZE}bytes"
                            log "WARN" "📄 Lambda出力: $(cat "$LAMBDA_LOG")"
                            log "WARN" "📄 レスポンス内容: $(cat /tmp/scraping-response.json)"
                        fi
                    else
                        log "WARN" "⚠️ レスポンスファイルが作成されませんでした（試行 $attempt）"
                        log "WARN" "📄 Lambda出力: $(cat "$LAMBDA_LOG")"
                    fi
                else
                    log "ERROR" "❌ スクレイピング実行失敗（試行 $attempt）"
                    log "ERROR" "📄 Lambda出力: $(cat "$LAMBDA_LOG")"
                    log "ERROR" "🔍 エラー詳細確認: $LAMBDA_LOG"
                fi
                
                if [ $attempt -lt 3 ]; then
                    log "INFO" "⏳ 次回試行前の待機（10秒）..."
                    sleep 10
                fi
            done
            
            if [ "$SCRAPING_SUCCESS" = true ]; then
                
                log "INFO" "✅ スクレイピング実行完了"
                
                # 30秒待機してS3への反映を待つ
                log "INFO" "⏳ S3反映待機中（30秒）..."
                sleep 30
                
                # スクレイピング実行後のタイムスタンプ確認
                DATA_UPDATED=false
                for DATA_FILE in "${DATA_FILES[@]}"; do
                    if AFTER_TIMESTAMP=$(aws s3api head-object --bucket "$S3_BUCKET" --key "$DATA_FILE" --query 'LastModified' --output text 2>/dev/null); then
                        BEFORE_TIMESTAMP=$(echo -e "$BEFORE_TIMESTAMPS" | grep "^$DATA_FILE:" | cut -d: -f2-)
                        
                        log "INFO" "📄 実行後タイムスタンプ: $DATA_FILE -> $AFTER_TIMESTAMP"
                        
                        if [ "$BEFORE_TIMESTAMP" != "$AFTER_TIMESTAMP" ]; then
                            log "INFO" "✅ データファイル更新確認: $DATA_FILE"
                            log "INFO" "  実行前: $BEFORE_TIMESTAMP"
                            log "INFO" "  実行後: $AFTER_TIMESTAMP"
                            DATA_UPDATED=true
                        else
                            log "WARN" "⚠️ データファイル未更新: $DATA_FILE"
                            log "INFO" "  実行前後同一: $AFTER_TIMESTAMP"
                        fi
                    else
                        log "ERROR" "❌ データファイル取得失敗: $DATA_FILE"
                    fi
                done
                
                if [ "$DATA_UPDATED" = true ]; then
                    log "INFO" "✅ スクレイピングによるS3データ更新確認完了"
                else
                    log "ERROR" "❌ スクレイピング実行後もS3データが更新されていません"
                    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
                fi
                
                # レスポンス内容確認
                if [ -f "/tmp/scraping-response.json" ]; then
                    RESPONSE_SIZE=$(wc -c < /tmp/scraping-response.json)
                    log "INFO" "📊 スクレイピングレスポンスサイズ: ${RESPONSE_SIZE} bytes"
                    if [ "$RESPONSE_SIZE" -gt 100 ]; then
                        log "INFO" "✅ スクレイピングレスポンス正常"
                    else
                        log "WARN" "⚠️ スクレイピングレスポンスが小さすぎます"
                    fi
                    rm -f /tmp/scraping-response.json
                fi
                
            else
                log "ERROR" "❌ スクレイピング実行失敗"
                CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
            fi
            
            # 一時ファイルのクリーンアップ
            rm -f /tmp/lambda-payload-*.json /tmp/lambda-invoke-*.log
        fi
    fi
done

# 結果サマリー
log "INFO" "📊 検証結果サマリー:"
log "INFO" "  - 検証済み変数: $TOTAL_CHECKED"
log "INFO" "  - Critical問題: $CRITICAL_ISSUES"
log "INFO" "  - Warning問題: $WARNING_ISSUES"

# スクレイピングテスト結果の判定
SCRAPING_FOUND=false
for FUNCTION_NAME in "${FUNCTIONS[@]}"; do
    if [[ "$FUNCTION_NAME" == *"scraping"* ]]; then
        SCRAPING_FOUND=true
        break
    fi
done

if [ "$SCRAPING_FOUND" = true ]; then
    if [ $CRITICAL_ISSUES -eq 0 ]; then
        log "INFO" "  - スクレイピングテスト: ✅ 成功"
    else
        log "INFO" "  - スクレイピングテスト: ❌ 失敗"
    fi
else
    log "INFO" "  - スクレイピングテスト: スキップ（関数不存在）"
fi

log "INFO" "  - ログファイル: $LOG_FILE"

# 終了コード決定
if [ $CRITICAL_ISSUES -gt 0 ]; then
    log "ERROR" "🚨 CRITICAL: Essential environment variables missing!"
    log "ERROR" "Deployment should be rolled back!"
    exit 2  # Critical error
elif [ $WARNING_ISSUES -gt 0 ]; then
    log "WARN" "⚠️ Some environment variables have issues but deployment can continue"
    log "WARN" "Please review the verification results"
    exit 1  # Warning
else
    log "INFO" "✅ All environment variables verification passed"
    exit 0  # Success
fi