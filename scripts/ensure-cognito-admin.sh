#!/bin/bash
#
# Cognito の admin グループと管理者ユーザーを冪等に用意する。
#
# 背景:
#   実名系API（GET /players など）は API Gateway の Cognito authorizer に加えて
#   Lambda 側で ID トークンの cognito:groups に 'admin' が含まれるかを検証する。
#   CDK は admin グループを作るだけで誰も所属させないため、デプロイ直後は
#   管理機能が全て403になる。このスクリプトでそのギャップを埋める。
#
# 使い方:
#   scripts/ensure-cognito-admin.sh <dev|prod>
#
# 環境変数:
#   COGNITO_USERNAME      対象ユーザー名（既定: admin）
#   COGNITO_PASSWORD      ユーザーが存在しない場合の初期パスワード（Doppler から注入）
#                         未設定でユーザーも居なければエラーで終了する
#   COGNITO_USER_POOL_ID  User Pool ID（未設定なら CloudFormation の出力から解決）
#   AWS_REGION            既定: ap-northeast-1
#
# 秘密情報はログに出さない（set -x を使わない／パスワードを echo しない）。

set -euo pipefail

# stderr を stdout と同じ出力先に束ねる。
# GitHub Actions は stdout と stderr を別パイプで読むため、プロセス終了直前に
# stderr へ書いた内容（＝エラー本文）が取りこぼされることがある。実際に
# prod の "Ensure Cognito admin user" では ❌ 行が丸ごと欠落した。
# ここで fd2 を fd1 に複製しておくと、以降の `>&2` は常にログ側へ流れる。
# コマンド置換 `$(...)` の中でも fd2 はこの時点の出力先を指し続けるため、
# エラー本文が変数に吸い込まれて消えることもない。
exec 2>&1

STAGE="${1:-}"
if [ "$STAGE" != "dev" ] && [ "$STAGE" != "prod" ]; then
  echo "Usage: $0 <dev|prod>" >&2
  exit 1
fi

REGION="${AWS_REGION:-ap-northeast-1}"
STACK_NAME="ProBaseballStack-${STAGE}"
USERNAME="${COGNITO_USERNAME:-admin}"
GROUP_NAME="admin"

USER_POOL_ID="${COGNITO_USER_POOL_ID:-}"
if [ -z "$USER_POOL_ID" ]; then
  echo "🔍 CloudFormation から User Pool ID を取得中 (${STACK_NAME})..."
  USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' \
    --output text 2>/dev/null || echo "")
fi

if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" = "None" ]; then
  echo "❌ User Pool ID を解決できませんでした（stack=${STACK_NAME}）" >&2
  exit 1
fi

echo "✅ User Pool: ${USER_POOL_ID} (stage=${STAGE}, user=${USERNAME})"

# AWS CLI をエラー本文込みで実行する。stderr を握り潰すと
# 「exit 1 だけ出て理由が分からない」状態になるため、失敗時は本文を表示する。
run_aws() {
  local label="$1"
  shift
  local out
  local status=0
  out=$("$@" 2>&1) || status=$?
  if [ "$status" -eq 0 ]; then
    printf '%s' "$out"
    return 0
  fi
  echo "❌ ${label} に失敗しました (exit=${status}, cmd=${1:-} ${2:-} ${3:-}):" >&2
  echo "$out" >&2
  return "$status"
}

# 1) 既に admin グループへ所属していれば、書き込み権限を使わずに終了する
CURRENT_GROUPS=$(run_aws "所属グループの取得" \
  aws cognito-idp admin-list-groups-for-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$USERNAME" \
  --region "$REGION" \
  --query 'Groups[].GroupName' \
  --output text) || CURRENT_GROUPS=""

case " $CURRENT_GROUPS " in
  *" $GROUP_NAME "*)
    echo "✅ '${USERNAME}' は既に '${GROUP_NAME}' グループに所属（変更不要）"
    exit 0
    ;;
esac

echo "ℹ️ '${USERNAME}' は '${GROUP_NAME}' グループに未所属。セットアップを続行する"

# 2) admin グループの存在確認（無ければ作る）
if aws cognito-idp get-group \
  --user-pool-id "$USER_POOL_ID" \
  --group-name "$GROUP_NAME" \
  --region "$REGION" >/dev/null 2>&1; then
  echo "✅ group '${GROUP_NAME}' は既に存在"
else
  echo "➕ group '${GROUP_NAME}' を作成"
  run_aws "グループ作成" \
    aws cognito-idp create-group \
    --user-pool-id "$USER_POOL_ID" \
    --group-name "$GROUP_NAME" \
    --description "システム管理者グループ" \
    --precedence 1 \
    --region "$REGION" >/dev/null
fi

# 3) ユーザーの存在確認（無ければ作成。パスワードは環境変数からのみ受け取る）
if aws cognito-idp admin-get-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$USERNAME" \
  --region "$REGION" >/dev/null 2>&1; then
  echo "✅ user '${USERNAME}' は既に存在（パスワードは変更しない）"
else
  if [ -z "${COGNITO_PASSWORD:-}" ]; then
    echo "❌ user '${USERNAME}' が存在せず、COGNITO_PASSWORD も未設定のため作成できません" >&2
    echo "   Doppler の e2e_${STAGE} config に COGNITO_PASSWORD を設定し、doppler run 経由で実行してください" >&2
    exit 1
  fi
  echo "➕ user '${USERNAME}' を作成"
  run_aws "ユーザー作成" \
    aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$USERNAME" \
    --message-action SUPPRESS \
    --region "$REGION" >/dev/null
  # 一時パスワード状態（FORCE_CHANGE_PASSWORD）だとログインできないため恒久化する
  run_aws "パスワード設定" \
    aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$USERNAME" \
    --password "$COGNITO_PASSWORD" \
    --permanent \
    --region "$REGION" >/dev/null
  echo "✅ user '${USERNAME}' を作成しました"
fi

# 4) admin グループへ追加（既に所属済みでもエラーにならない）
run_aws "グループへの追加" \
  aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$USER_POOL_ID" \
  --username "$USERNAME" \
  --group-name "$GROUP_NAME" \
  --region "$REGION" >/dev/null

# 5) 検証
GROUPS=$(run_aws "所属グループの再取得" \
  aws cognito-idp admin-list-groups-for-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$USERNAME" \
  --region "$REGION" \
  --query 'Groups[].GroupName' \
  --output text)

echo "📋 '${USERNAME}' の所属グループ: ${GROUPS}"
case " $GROUPS " in
  *" $GROUP_NAME "*)
    echo "✅ admin グループ所属を確認"
    ;;
  *)
    echo "❌ admin グループへの追加を確認できませんでした" >&2
    exit 1
    ;;
esac
