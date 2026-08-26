#!/bin/bash

# logger import パス修正スクリプト

set -e

cd frontend/src

echo "🔧 logger import パス修正中..."

# src直下のファイル (./utils/logger)
for file in *.tsx *.ts; do
  [ -f "$file" ] || continue
  if grep -q "from '@/utils/logger'" "$file"; then
    sed -i "s|from '@/utils/logger'|from './utils/logger'|g" "$file"
    echo "✅ $file"
  fi
done

# config/ ディレクトリ (../utils/logger)
for file in config/*.ts; do
  [ -f "$file" ] || continue
  if grep -q "from '@/utils/logger'" "$file"; then
    sed -i "s|from '@/utils/logger'|from '../utils/logger'|g" "$file"
    echo "✅ $file"
  fi
done

# contexts/ ディレクトリ (../utils/logger)
for file in contexts/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "from '@/utils/logger'" "$file"; then
    sed -i "s|from '@/utils/logger'|from '../utils/logger'|g" "$file"
    echo "✅ $file"
  fi
done

# services/ ディレクトリ (../utils/logger)
for file in services/*.ts; do
  [ -f "$file" ] || continue
  if grep -q "from '@/utils/logger'" "$file"; then
    sed -i "s|from '@/utils/logger'|from '../utils/logger'|g" "$file"
    echo "✅ $file"
  fi
done

# utils/ ディレクトリ (./logger)
for file in utils/*.ts; do
  [ -f "$file" ] || continue
  [ "$file" = "utils/logger.ts" ] && continue
  if grep -q "from '@/utils/logger'" "$file"; then
    sed -i "s|from '@/utils/logger'|from './logger'|g" "$file"
    echo "✅ $file"
  fi
done

# components/ ディレクトリ (../../utils/logger)
find components -name "*.tsx" -o -name "*.ts" | while read file; do
  if grep -q "from '@/utils/logger'" "$file"; then
    sed -i "s|from '@/utils/logger'|from '../../utils/logger'|g" "$file"
    echo "✅ $file"
  fi
done

# pages/ ディレクトリ (../utils/logger or ../../utils/logger)
for file in pages/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "from '@/utils/logger'" "$file"; then
    sed -i "s|from '@/utils/logger'|from '../utils/logger'|g" "$file"
    echo "✅ $file"
  fi
done

# pages/auth/ ディレクトリ (../../utils/logger)
for file in pages/auth/*.tsx; do
  [ -f "$file" ] || continue
  if grep -q "from '@/utils/logger'" "$file"; then
    sed -i "s|from '@/utils/logger'|from '../../utils/logger'|g" "$file"
    echo "✅ $file"
  fi
done

echo "✅ パス修正完了"
