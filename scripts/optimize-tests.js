/**
 * テスト実行の最適化を支援するスクリプト
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue('テスト実行の最適化分析を開始します...'));

// テストの実行時間を計測する関数
function measureTestExecutionTime(command) {
  console.log(chalk.cyan(`実行: ${command}`));
  
  const startTime = new Date().getTime();
  let output;
  
  try {
    output = execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(chalk.red('テスト実行エラー:'), error.message);
    return { success: false, duration: 0, error: error.message };
  }
  
  const endTime = new Date().getTime();
  const duration = endTime - startTime;
  
  return { success: true, duration, output };
}

// テスト実行時間を分析する関数
function analyzeTestPerformance() {
  const results = {};
  
  // 1. 標準設定でのテスト実行
  console.log(chalk.green('\n1. 標準設定でのテスト実行'));
  results.standard = measureTestExecutionTime('npm test');
  
  // 2. 最適化設定でのテスト実行
  console.log(chalk.green('\n2. 最適化設定でのテスト実行'));
  results.optimized = measureTestExecutionTime('npm run test:fast');
  
  // 3. 並列実行でのテスト実行
  console.log(chalk.green('\n3. 並列実行でのテスト実行'));
  results.parallel = measureTestExecutionTime('npm run test:parallel');
  
  // 4. ユニットテストのみ実行
  console.log(chalk.green('\n4. ユニットテストのみ実行'));
  results.unitOnly = measureTestExecutionTime('npm run test:unit:fast');
  
  // 結果の保存
  const resultsDir = path.resolve(__dirname, '../reports');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const resultsFile = path.join(resultsDir, `test-performance-${timestamp}.json`);
  
  const summary = {
    timestamp,
    results: {
      standard: results.standard.success ? results.standard.duration : null,
      optimized: results.optimized.success ? results.optimized.duration : null,
      parallel: results.parallel.success ? results.parallel.duration : null,
      unitOnly: results.unitOnly.success ? results.unitOnly.duration : null
    },
    improvements: {}
  };
  
  // 改善率の計算
  if (results.standard.success && results.optimized.success) {
    summary.improvements.optimizedVsStandard = 
      ((results.standard.duration - results.optimized.duration) / results.standard.duration * 100).toFixed(2);
  }
  
  if (results.standard.success && results.parallel.success) {
    summary.improvements.parallelVsStandard = 
      ((results.standard.duration - results.parallel.duration) / results.standard.duration * 100).toFixed(2);
  }
  
  fs.writeFileSync(resultsFile, JSON.stringify(summary, null, 2));
  
  // 結果表示
  console.log(chalk.blue('\n===== テスト実行パフォーマンス分析 ====='));
  console.log(chalk.cyan('標準テスト実行時間:'), `${results.standard.success ? results.standard.duration : '失敗'}ms`);
  console.log(chalk.cyan('最適化テスト実行時間:'), `${results.optimized.success ? results.optimized.duration : '失敗'}ms`);
  console.log(chalk.cyan('並列テスト実行時間:'), `${results.parallel.success ? results.parallel.duration : '失敗'}ms`);
  console.log(chalk.cyan('ユニットテストのみ実行時間:'), `${results.unitOnly.success ? results.unitOnly.duration : '失敗'}ms`);
  
  // 改善率表示
  if (summary.improvements.optimizedVsStandard) {
    console.log(chalk.green(`最適化設定による改善率: ${summary.improvements.optimizedVsStandard}%`));
  }
  
  if (summary.improvements.parallelVsStandard) {
    console.log(chalk.green(`並列実行による改善率: ${summary.improvements.parallelVsStandard}%`));
  }
  
  console.log(chalk.cyan(`\n結果は ${resultsFile} に保存されました`));
}

// 分析を実行
analyzeTestPerformance();
