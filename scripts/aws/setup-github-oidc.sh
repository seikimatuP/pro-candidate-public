#!/bin/bash

# GitHub Actions OIDC Provider セットアップスクリプト

echo "🔧 GitHub Actions OIDC Provider セットアップを開始します..."

# AWS アカウントID取得
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
    echo "❌ AWSアカウントIDを取得できませんでした。AWS CLIの設定を確認してください。"
    exit 1
fi

echo "📋 AWSアカウントID: $ACCOUNT_ID"

# 1. OIDC Provider作成
echo "1️⃣ OIDC Providerを作成中..."
aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
    2>/dev/null || echo "   ⚠️ OIDC Provider は既に存在します"

# 2. Trust Policy JSONファイル作成
echo "2️⃣ Trust Policyを作成中..."
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:seikimatuP/pro_candidate:*"
        }
      }
    }
  ]
}
EOF

# 3. 権限ポリシー作成
echo "3️⃣ 権限ポリシーを作成中..."
cat > permissions-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "arn:aws:s3:::pro-candidate-*",
        "arn:aws:s3:::pro-candidate-*/*",
        "arn:aws:s3:::cdk-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*"
      ],
      "Resource": "arn:aws:lambda:ap-northeast-1:${ACCOUNT_ID}:function:pro-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "apigateway:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*"
      ],
      "Resource": [
        "arn:aws:cloudformation:ap-northeast-1:${ACCOUNT_ID}:stack/ProBaseballStack-*/*",
        "arn:aws:cloudformation:ap-northeast-1:${ACCOUNT_ID}:stack/CDKToolkit/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:GetRole",
        "iam:PassRole",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRolePolicy",
        "iam:CreateServiceLinkedRole"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:PutParameter",
        "ssm:DeleteParameter"
      ],
      "Resource": "arn:aws:ssm:ap-northeast-1:${ACCOUNT_ID}:parameter/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-1:${ACCOUNT_ID}:table/pro-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# 4. ポリシー作成
echo "4️⃣ IAMポリシーを作成中..."
aws iam create-policy \
    --policy-name GitHubActionsPolicy \
    --policy-document file://permissions-policy.json \
    2>/dev/null || echo "   ⚠️ ポリシーは既に存在します"

# 5. IAM Role作成
echo "5️⃣ IAM Roleを作成中..."
aws iam create-role \
    --role-name GitHubActionsRole \
    --assume-role-policy-document file://trust-policy.json \
    2>/dev/null || echo "   ⚠️ Roleは既に存在します"

# 6. ポリシーをRoleにアタッチ
echo "6️⃣ ポリシーをRoleにアタッチ中..."
aws iam attach-role-policy \
    --role-name GitHubActionsRole \
    --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/GitHubActionsPolicy" \
    2>/dev/null || echo "   ⚠️ ポリシーは既にアタッチされています"

# 7. Role ARN取得
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/GitHubActionsRole"

# クリーンアップ
rm -f trust-policy.json permissions-policy.json

echo ""
echo "✅ セットアップ完了!"
echo ""
echo "📋 GitHubで設定するSecret:"
echo "   Name: AWS_ROLE_ARN"
echo "   Value: ${ROLE_ARN}"
echo ""
echo "🔐 GitHub設定手順:"
echo "   1. リポジトリの Settings → Secrets and variables → Actions"
echo "   2. 'New repository secret' をクリック"
echo "   3. Name: AWS_ROLE_ARN"
echo "   4. Value: ${ROLE_ARN}"
echo "   5. 'Add secret' をクリック"
echo ""
echo "🎉 これでGitHub ActionsからAWSへの認証が可能になります！"