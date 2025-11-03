/**
 * デプロイ前チェックスクリプト
 * リリース前に品質基準をクリアしているか確認します
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('デプロイ前チェックを実行中...');

try {
  // 1. ESLint実行
  console.log('\n1. 静的解析を実行中...');
  execSync('npm run lint', { stdio: 'inherit' });
  
  // 2. テスト実行
  console.log('\n2. テストを実行中...');
  execSync('npm run test:coverage', { stdio: 'inherit' });
  
  // 3. 静的解析レポート生成
  console.log('\n3. 静的解析レポートを生成中...');
  execSync('npm run generate-report', { stdio: 'inherit' });
  
  // 4. 品質ゲートチェック
  console.log('\n4. 品質ゲートチェックを実行中...');
  execSync('npm run quality-check', { stdio: 'inherit' });
  
  console.log('\n✅ デプロイ前チェックに合格しました！デプロイを続行できます。');
  process.exit(0);
} catch (error) {
  console.error('\n❌ デプロイ前チェックに失敗しました。');
  console.error('詳細エラー:', error.message);
  console.error('デプロイを中止します。問題を修正してから再度お試しください。');
  process.exit(1);
}
