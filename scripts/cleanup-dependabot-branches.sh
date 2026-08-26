#!/bin/bash

# Dependabotブランチ整理スクリプト
# 現在オープンなPR以外の古いDependabotブランチを削除

echo "=== Dependabotブランチ整理スクリプト ==="
echo "現在のDependabotブランチ数: $(git branch -r | grep dependabot | wc -l)"

# 現在オープンなPRのブランチを除外（最新3つ）
KEEP_BRANCHES=(
  "origin/dependabot/npm_and_yarn/frontend/eslint-9.29.0"
  "origin/dependabot/npm_and_yarn/frontend/eslint/js-9.29.0" 
  "origin/dependabot/npm_and_yarn/frontend/tanstack/react-query-5.80.7"
)

echo ""
echo "=== 保持するブランチ（現在のオープンPR） ==="
for branch in "${KEEP_BRANCHES[@]}"; do
  echo "✅ $branch"
done

echo ""
echo "=== 削除対象の古いDependabotブランチ ==="

# 削除対象ブランチをリストアップ
DELETE_BRANCHES=()
while IFS= read -r branch; do
  branch_name=$(echo "$branch" | xargs)
  
  # 保持対象に含まれていない場合は削除リストに追加
  if [[ ! " ${KEEP_BRANCHES[*]} " =~ " ${branch_name} " ]]; then
    DELETE_BRANCHES+=("$branch_name")
    echo "🗑️  $branch_name"
  fi
done < <(git branch -r | grep dependabot)

echo ""
echo "削除対象ブランチ数: ${#DELETE_BRANCHES[@]}"

# 確認プロンプト
read -p "これらのブランチを削除しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "=== ブランチ削除実行 ==="
  
  for branch in "${DELETE_BRANCHES[@]}"; do
    # origin/ プレフィックスを削除してリモートブランチとして削除
    remote_branch=$(echo "$branch" | sed 's/origin\///')
    echo "削除中: $remote_branch"
    
    # リモートブランチを削除
    git push origin --delete "$remote_branch" 2>/dev/null || echo "  ⚠️  削除失敗またはすでに削除済み: $remote_branch"
  done
  
  echo ""
  echo "=== リモート参照をクリーンアップ ==="
  git remote prune origin
  
  echo ""
  echo "✅ Dependabotブランチ整理完了"
  echo "残りのDependabotブランチ数: $(git branch -r | grep dependabot | wc -l)"
  
else
  echo "キャンセルされました。"
fi

echo ""
echo "=== 整理後の残存ブランチ ==="
git branch -r | grep dependabot