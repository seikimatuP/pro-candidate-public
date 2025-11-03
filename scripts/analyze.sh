#!/bin/bash

echo "==== 静的解析を開始します ===="

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# Node.js がインストールされているか確認
if ! command -v node &> /dev/null; then
    echo "Node.js がインストールされていません。setup_environment.sh を実行してインストールしてください。"
    exit 1
fi

# package.json から analyze スクリプトを実行するのと同等の処理
echo "静的解析を実行しています..."
if [ -f "node_modules/.bin/eslint" ]; then
    # ESLint が利用可能な場合
    node_modules/.bin/eslint --ext .js,.ts,.jsx,.tsx .
else
    # 直接メインの解析スクリプトを実行
    node static-analysis/main.js
fi

# ビジュアル強化スクリプトの実行
if [ -f "static-analysis/visual-enhancer.js" ]; then
    echo "レポートの視覚効果を強化しています..."
    node static-analysis/visual-enhancer.js
fi

# 高度なビジュアライゼーションの適用
if [ -f "static-analysis/advanced-visualizations.js" ]; then
    echo "高度なビジュアライゼーションを適用しています..."
    node static-analysis/advanced-visualizations.js
fi

echo "==== 静的解析が完了しました ===="
echo "レポートは reports ディレクトリに生成されています"
