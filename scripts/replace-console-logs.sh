#!/bin/bash

# フロントエンドのconsole.logをロガーに一括置き換えスクリプト

set -e

echo "🔍 フロントエンドconsole.log置き換えスクリプト開始"

# 作業対象ディレクトリ
TARGET_DIR="frontend/src"

# console使用ファイルをリストアップ
echo "📋 console使用ファイルをリストアップ中..."
FILES=$(find "$TARGET_DIR" -name "*.tsx" -o -name "*.ts" | grep -v "logger.ts" | xargs grep -l "console\." || true)

if [ -z "$FILES" ]; then
  echo "✅ 置き換え対象のファイルが見つかりませんでした"
  exit 0
fi

echo "📝 対象ファイル数: $(echo "$FILES" | wc -l)"

# 各ファイルを処理
for file in $FILES; do
  echo "🔧 処理中: $file"

  # バックアップ作成
  cp "$file" "$file.backup"

  # 1. console.debug → log.debug
  sed -i 's/console\.debug(/log.debug(/g' "$file"

  # 2. console.log → log.debug
  sed -i 's/console\.log(/log.debug(/g' "$file"

  # 3. console.info → log.info
  sed -i 's/console\.info(/log.info(/g' "$file"

  # 4. console.warn → log.warn
  sed -i 's/console\.warn(/log.warn(/g' "$file"

  # 5. console.error → log.error
  sed -i 's/console\.error(/log.error(/g' "$file"

  # 6. import文追加（ファイルの先頭付近に）
  # すでにloggerのimportがあるかチェック
  if ! grep -q "from.*logger" "$file"; then
    # React import の後に追加
    if grep -q "^import.*React" "$file"; then
      sed -i "/^import.*React/a import { log } from '@/utils/logger';" "$file"
    # その他のimportがある場合は最後のimportの後に追加
    elif grep -q "^import" "$file"; then
      # 最後のimport行を見つけて、その後に追加
      last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
      sed -i "${last_import_line}a import { log } from '@/utils/logger';" "$file"
    # importがない場合はファイルの先頭に追加
    else
      sed -i "1i import { log } from '@/utils/logger';" "$file"
    fi
  fi

  echo "  ✅ 完了"
done

echo ""
echo "🎉 全ファイルの置き換え完了"
echo ""
echo "📊 置き換え結果確認:"
echo "  - 対象ファイル数: $(echo "$FILES" | wc -l)"
echo "  - バックアップ: *.backup として保存"
echo ""
echo "⚠️  次の作業:"
echo "  1. 置き換え結果をレビュー: git diff frontend/src"
echo "  2. TypeScriptコンパイルエラー確認: cd frontend && npm run build"
echo "  3. 問題なければバックアップ削除: find frontend/src -name '*.backup' -delete"
echo "  4. 問題あれば復元: find frontend/src -name '*.backup' -exec bash -c 'mv \"\$0\" \"\${0%.backup}\"' {} \;"
