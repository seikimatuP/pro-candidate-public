/**
 * 品質ゲートの自動チェックを行うスクリプト
 * 分析結果が一定の基準を満たしているか確認し、満たさない場合はエラー終了します
 */
const fs = require('fs');
const path = require('path');

// 設定値
const QUALITY_GATE = {
  minScore: 80,                  // 最小品質スコア
  maxErrors: 0,                  // 許容ESLintエラー数
  maxWarnings: 10,               // 許容ESLint警告数
  minCoverage: 70,               // 最小テストカバレッジ
  maxComplexFunctions: 5,        // 許容高複雑度関数数
};

// 最新のレポートを取得
function getLatestReport() {
  try {
    const reportsDir = path.resolve(__dirname, '..', 'reports');
    
    // reportsディレクトリが存在しない場合
    if (!fs.existsSync(reportsDir)) {
      console.error('レポートディレクトリが見つかりません。先に解析を実行してください。');
      process.exit(1);
    }
    
    // 日付ディレクトリを取得して最新のものを選択
    const dateDirs = fs.readdirSync(reportsDir)
      .filter(dir => fs.statSync(path.join(reportsDir, dir)).isDirectory())
      .sort()
      .reverse();
    
    if (dateDirs.length === 0) {
      console.error('レポートが見つかりません。先に解析を実行してください。');
      process.exit(1);
    }
    
    const latestDir = dateDirs[0];
    const reportPath = path.join(reportsDir, latestDir, 'analysis-report.json');
    
    if (!fs.existsSync(reportPath)) {
      console.error(`レポートファイルが見つかりません: ${reportPath}`);
      process.exit(1);
    }
    
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    console.error('レポート読み込み中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// 品質ゲートのチェック
function checkQualityGate(report) {
  const issues = [];
  let passed = true;
  
  // 品質スコアのチェック
  if (report.summary.qualityScore < QUALITY_GATE.minScore) {
    issues.push(`品質スコアが基準値を下回っています: ${report.summary.qualityScore}/${QUALITY_GATE.minScore}`);
    passed = false;
  }
  
  // ESLintエラーのチェック
  if (report.eslint.errorCount > QUALITY_GATE.maxErrors) {
    issues.push(`ESLintエラー数が基準値を超えています: ${report.eslint.errorCount}/${QUALITY_GATE.maxErrors}`);
    passed = false;
  }
  
  // ESLint警告のチェック
  if (report.eslint.warningCount > QUALITY_GATE.maxWarnings) {
    issues.push(`ESLint警告数が基準値を超えています: ${report.eslint.warningCount}/${QUALITY_GATE.maxWarnings}`);
    passed = false;
  }
  
  // テストカバレッジのチェック
  if (report.tests.success && report.tests.coverage.overall < QUALITY_GATE.minCoverage) {
    issues.push(`テストカバレッジが基準値を下回っています: ${report.tests.coverage.overall}%/${QUALITY_GATE.minCoverage}%`);
    passed = false;
  }
  
  // 複雑度のチェック
  if (report.complexity.highComplexityFunctions.length > QUALITY_GATE.maxComplexFunctions) {
    issues.push(`高複雑度関数の数が基準値を超えています: ${report.complexity.highComplexityFunctions.length}/${QUALITY_GATE.maxComplexFunctions}`);
    passed = false;
  }
  
  return { passed, issues };
}

// メイン処理
function main() {
  console.log('品質ゲートチェックを開始します...');
  
  // 最新のレポートを取得
  const report = getLatestReport();
  console.log(`レポート日付: ${report.date}`);
  
  // 品質ゲートのチェック
  const { passed, issues } = checkQualityGate(report);
  
  if (passed) {
    console.log('✅ 品質ゲートチェックに合格しました!');
    process.exit(0);
  } else {
    console.error('❌ 品質ゲートチェックに失敗しました:');
    issues.forEach(issue => console.error(`  - ${issue}`));
    process.exit(1);
  }
}

// スクリプト実行
main();
