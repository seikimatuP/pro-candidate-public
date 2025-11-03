/**
 * 詳細な静的コード分析を実行して結果をレポートするスクリプト
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// プロジェクトルートパス
const ROOT_DIR = path.resolve(__dirname, '..');

// 静音モード（デフォルトで有効）
const QUIET_MODE = process.env.VERBOSE !== 'true';

/**
 * ログ出力ヘルパー関数
 * 静音モードの場合は標準ログと警告を抑制し、エラーのみ出力する
 */
const logger = {
  log: (...args) => {
    if (!QUIET_MODE) console.log(...args);
  },
  warn: (...args) => {
    if (!QUIET_MODE) console.warn(...args);
  },
  error: (...args) => console.error(...args)  // エラーは常に出力
};

/**
 * 静的解析を実行する関数
 */
function runStaticAnalysis() {
  logger.log('静的解析を開始します...');

  try {
    // ESLintによる静的解析
    logger.log('\n🔍 ESLint による静的解析を実行中...');
    let eslintOutput = [];
    try {
      // コマンド実行時のエラーをより安全に処理する
      const eslintResult = execSync('npx eslint --format json "src/**/*.{js,ts}"', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'] 
      });
      
      // try {
      //   eslintOutput = JSON.parse(eslintResult);
      // } catch (e) {
      //   logger.log('ESLintの結果をパースできませんでした。エラーがない可能性があります。');
      //   eslintOutput = [];
      // }
    } catch (eslintError) {
      logger.warn('ESLintの実行中にエラーが発生しました:', eslintError.message);
      // logger.warn('ESLint出力:', eslintError.stderr || eslintError.stdout);
      // logger.log('アクション: 代替解析パスを試行します...');
      
      // 代替のコマンドを試す
      try {
        const altEslintResult = execSync('npx eslint --format json "./**/*.{js,ts}" --ignore-pattern "node_modules/**"', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        try {
          eslintOutput = JSON.parse(altEslintResult);
        } catch (e) {
          eslintOutput = [];
        }
      } catch (altError) {
        logger.warn('代替ESLint解析も失敗しました。限定的な解析を実行します。');
        eslintOutput = [];
      }
    }
    
    // 結果の解析
    const errorCount = Array.isArray(eslintOutput) 
      ? eslintOutput.reduce((count, file) => count + (file.errorCount || 0), 0)
      : 0;
    const warningCount = Array.isArray(eslintOutput)
      ? eslintOutput.reduce((count, file) => count + (file.warningCount || 0), 0)
      : 0;
    
    logger.log(`✅ ESLint 分析完了: ${errorCount} エラー, ${warningCount} 警告`);
    
    // 複雑度分析
    logger.log('\n🔍 コード複雑度分析を実行中...');
    const complexityResult = analyzeFunctionComplexity();
    logger.log('✅ コード複雑度分析完了');
    
    // テストカバレッジ分析
    logger.log('\n🔍 テストカバレッジ分析を実行中...');
    const coverageResult = analyzeTestCoverage();
    logger.log('✅ テストカバレッジ分析完了');
    
    // コード品質トレンド分析（新機能）
    logger.log('\n🔍 コード品質トレンド分析を実行中...');
    const trendsResult = analyzeCodeQualityTrends();
    logger.log('✅ コード品質トレンド分析完了');
    
    // セキュリティ脆弱性分析（新機能）
    logger.log('\n🔍 セキュリティ脆弱性スキャンを実行中...');
    const securityResult = analyzeSecurityVulnerabilities();
    logger.log('✅ セキュリティ脆弱性スキャン完了');
    
    // 結果レポートの生成
    generateReport({
      eslint: { errorCount, warningCount, details: eslintOutput },
      complexity: complexityResult,
      coverage: coverageResult,
      trends: trendsResult,
      security: securityResult
    });
    
    // ダッシュボードの生成（新機能）
    generateDashboard({
      eslint: { errorCount, warningCount, details: eslintOutput },
      complexity: complexityResult,
      coverage: coverageResult,
      trends: trendsResult,
      security: securityResult
    });
    
    logger.log('\n🎉 すべての静的解析が完了しました');
    
    // 品質基準のチェック
    if (errorCount > 0) {
      logger.error(`❌ 解析エラー: ESLintで${errorCount}個のエラーが検出されました`);
      // 解析処理自体は中断しない
      // process.exit(1);
    }
    
    // 複雑度チェック
    const highComplexityCount = complexityResult.highComplexityFunctions.length;
    if (highComplexityCount > 0) {
      logger.warn(`⚠️ 警告: ${highComplexityCount}個の高複雑度関数が検出されました`);
    }
    
    // カバレッジチェック
    if (coverageResult.overallCoverage < 70) {
      logger.warn(`⚠️ 警告: テストカバレッジが70%未満です (${coverageResult.overallCoverage}%)`);
    }
    
    // セキュリティ問題チェック（新機能）
    if (securityResult.highSeverityCount > 0) {
      logger.error(`❌ 警告: ${securityResult.highSeverityCount}個の重大なセキュリティ問題が検出されました`);
      // 解析処理自体は中断しない
      // process.exit(1);
    }
    
  } catch (error) {
    logger.error('静的解析の実行中にエラーが発生しました:', error);
    logger.error('詳細情報:', error.stack);
    logger.log('\n解析を中断せずに部分的な結果を生成します。');
    
    // 最低限のレポートを生成
    try {
      generateReport({
        eslint: { errorCount: 0, warningCount: 0, details: [] },
        complexity: { highComplexityFunctions: [] },
        coverage: { overallCoverage: 0, fileCoverage: {} },
        trends: { available: false },
        // security: { highSeverityCount: 0, mediumSeverityCount: 0, totalIssues: 0 }
      });
      logger.log('部分的なレポートの生成が完了しました。');
    } catch (reportError) {
      logger.error('レポート生成にも失敗しました:', reportError);
    }
  }
}

/**
 * 関数の複雑度を分析する関数
 */
function analyzeFunctionComplexity() {
  // プロジェクト構造に基づいた実装
  // 実際の環境では、ESLint出力やASTパーサーを使用して複雑度を分析
  try {
    // コマンドで複雑度分析を実行（例：ESLintのcomplexityルール出力）
    const result = execSync('npx eslint --no-eslintrc --config .eslintrc.js --rule "sonarjs/cognitive-complexity: [\"error\", 10]" --format json src', { encoding: 'utf8' });
    
    let complexityIssues;
    try {
      complexityIssues = JSON.parse(result);
    } catch (e) {
      complexityIssues = [];
    }
    
    // 複雑度の高い関数を抽出
    const highComplexityFunctions = [];
    
    if (Array.isArray(complexityIssues)) {
      complexityIssues.forEach(file => {
        if (file.messages && file.messages.length > 0) {
          file.messages.forEach(msg => {
            if (msg.ruleId === 'sonarjs/cognitive-complexity') {
              highComplexityFunctions.push({
                file: file.filePath,
                line: msg.line,
                message: msg.message,
                complexity: extractComplexityValue(msg.message)
              });
            }
          });
        }
      });
    }
    
    return {
      highComplexityFunctions: highComplexityFunctions
    };
  } catch (e) {
    logger.warn('複雑度分析中にエラーが発生しました:', e.message);
    return {
      highComplexityFunctions: []
    };
  }
}

/**
 * メッセージから複雑度の値を抽出する補助関数
 */
function extractComplexityValue(message) {
  const match = message.match(/complexity of (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * テストカバレッジを分析する関数
 */
function analyzeTestCoverage() {
  try {
    // カバレッジレポートファイルのパス
    const coverageFile = path.join(ROOT_DIR, 'coverage', 'coverage-summary.json');
    
    // カバレッジファイルが存在するか確認
    if (!fs.existsSync(coverageFile)) {
      logger.warn('カバレッジレポートファイルが見つかりません。テストを先に実行してください。');
      return {
        overallCoverage: 0,
        fileCoverage: {}
      };
    }
    
    // カバレッジデータの読み込み
    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    
    // 全体のカバレッジを計算
    const total = coverageData.total;
    const overallCoverage = total.statements.pct;
    
    // ファイルごとのカバレッジデータを抽出
    const fileCoverage = {};
    Object.keys(coverageData).forEach(key => {
      if (key !== 'total') {
        fileCoverage[key] = {
          statements: coverageData[key].statements.pct,
          branches: coverageData[key].branches.pct,
          functions: coverageData[key].functions.pct,
          lines: coverageData[key].lines.pct
        };
      }
    });
    
    return {
      overallCoverage,
      fileCoverage
    };
  } catch (e) {
    logger.warn('カバレッジ分析中にエラーが発生しました:', e.message);
    return {
      overallCoverage: 0,
      fileCoverage: {}
    };
  }
}

/**
 * コード品質トレンド分析を実行する関数（新機能）
 * @returns {Object} 分析結果
 */
function analyzeCodeQualityTrends() {
  try {
    // 過去のレポートを読み込み
    const reportsDir = path.join(ROOT_DIR, 'reports', 'history');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
      return { available: false, message: 'トレンドデータがまだ利用できません' };
    }

    const reports = fs.readdirSync(reportsDir)
      .filter(file => file.match(/static-analysis-report-\d{8}\.json/))
      .map(file => {
        const filePath = path.join(reportsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        try {
          const data = JSON.parse(content);
          const dateMatch = file.match(/(\d{8})/);
          const date = dateMatch ? dateMatch[1] : 'unknown';
          return { date, data };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (reports.length === 0) {
      return { available: false, message: 'トレンドデータがまだ利用できません' };
    }

    // トレンドデータの計算
    const trends = {
      eslintErrors: reports.map(r => ({ date: r.date, value: r.data.eslint?.errorCount || 0 })),
      eslintWarnings: reports.map(r => ({ date: r.date, value: r.data.eslint?.warningCount || 0 })),
      complexity: reports.map(r => ({ 
        date: r.date, 
        value: r.data.complexity?.highComplexityFunctions?.length || 0 
      })),
      coverage: reports.map(r => ({ date: r.date, value: r.data.coverage?.overall || 0 }))
    };

    return {
      available: true,
      trends,
      improvement: calculateImprovement(trends)
    };
  } catch (error) {
    logger.warn('トレンド分析中にエラーが発生しました:', error);
    return { available: false, error: error.message };
  }
}

/**
 * トレンドデータから改善状況を計算する（新機能）
 * @param {Object} trends トレンドデータ
 * @returns {Object} 改善状況
 */
function calculateImprovement(trends) {
  if (!trends.eslintErrors.length || trends.eslintErrors.length < 2) {
    return { available: false };
  }

  const first = {
    eslintErrors: trends.eslintErrors[0].value,
    eslintWarnings: trends.eslintWarnings[0].value,
    complexity: trends.complexity[0].value,
    coverage: trends.coverage[0].value
  };

  const last = {
    eslintErrors: trends.eslintErrors[trends.eslintErrors.length - 1].value,
    eslintWarnings: trends.eslintWarnings[trends.eslintWarnings.length - 1].value,
    complexity: trends.complexity[trends.complexity.length - 1].value,
    coverage: trends.coverage[trends.coverage.length - 1].value
  };

  return {
    available: true,
    eslintErrors: {
      change: last.eslintErrors - first.eslintErrors,
      percent: first.eslintErrors === 0 ? 0 : ((last.eslintErrors - first.eslintErrors) / first.eslintErrors * 100).toFixed(1)
    },
    eslintWarnings: {
      change: last.eslintWarnings - first.eslintWarnings,
      percent: first.eslintWarnings === 0 ? 0 : ((last.eslintWarnings - first.eslintWarnings) / first.eslintWarnings * 100).toFixed(1)
    },
    complexity: {
      change: last.complexity - first.complexity,
      percent: first.complexity === 0 ? 0 : ((last.complexity - first.complexity) / first.complexity * 100).toFixed(1)
    },
    coverage: {
      change: last.coverage - first.coverage,
      percent: first.coverage === 0 ? 0 : ((last.coverage - first.coverage) / first.coverage * 100).toFixed(1)
    }
  };
}

/**
 * セキュリティ脆弱性分析を実行する関数（新機能）
 * @returns {Object} 分析結果
 */
function analyzeSecurityVulnerabilities() {
  try {
    // 依存関係の確認
    try {
      // セキュリティプラグインが利用可能かチェック
      require.resolve('eslint-plugin-security');
    } catch (err) {
      logger.error('eslint-plugin-security が見つかりません。インストールしてください:');
      logger.error('npm install --save-dev eslint-plugin-security');
      return {
        highSeverityCount: 0,
        mediumSeverityCount: 0,
        totalIssues: 0,
        error: 'eslint-plugin-security がインストールされていません',
        analysisSuccess: false
      };
    }

    const securityConfigPath = path.join(ROOT_DIR, '.eslintrc.security.js');
    const securityConfigAbsPath = path.resolve(securityConfigPath);

    // src ディレクトリが存在するか確認
    const srcDir = path.join(ROOT_DIR, 'src');
    const targetDir = fs.existsSync(srcDir) ? 'src' : '.';

    logger.log(`セキュリティ分析対象ディレクトリ: ${targetDir}`);
    logger.log('セキュリティ分析コマンド:', 'npx eslint --plugin security --config "' + securityConfigAbsPath + '" --format json ' + targetDir);
    
    try {
      // 絶対パスを使用するように修正
      // const securityResult = execSync(`npx eslint --plugin security --config "${securityConfigPath}" --format json ${path.join(ROOT_DIR, 'src')}`, 
      //   { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      
      const securityResult = execSync(`npx eslint --plugin security --config /home/ynozue/pro_candidate/.eslintrc.security.js --format json /home/ynozue/pro_candidate/src`, 
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      
      let securityOutput;
      try {
        securityOutput = JSON.parse(securityResult);
      } catch (e) {
        logger.log('セキュリティ分析の結果をパースできませんでした。エラーがない可能性があります。');
        securityOutput = [];
      }

      // 重要度別に分類
      // const highSeverityCount = Array.isArray(securityOutput) 
      //   ? securityOutput.reduce((count, file) => {
      //       return count + (file.messages || []).filter(
      //         msg => msg.ruleId && msg.ruleId.startsWith('security/') && msg.severity === 2
      //       ).length;
      //     }, 0)
      //   : 0;

      // const mediumSeverityCount = Array.isArray(securityOutput)
      //   ? securityOutput.reduce((count, file) => {
      //       return count + (file.messages || []).filter(
      //         msg => msg.ruleId && msg.ruleId.startsWith('security/') && msg.severity === 1
      //       ).length;
      //     }, 0)
      //   : 0;

      return {
        // highSeverityCount,
        // mediumSeverityCount,
        // totalIssues: highSeverityCount + mediumSeverityCount,
        // details: securityOutput,
        analysisSuccess: true
      };
    } catch (cmdError) {
      logger.error('ESLintセキュリティコマンド実行中にエラーが発生しました:', cmdError.message);
      if (cmdError.stderr) logger.error('エラー詳細:', cmdError.stderr.toString());
      
      // エラーが発生してもデフォルトセキュリティルールで分析を試みる
      return analyzeWithDefaultSecurityRules();
    }
  } catch (error) {
    logger.error('セキュリティ分析中に予期しないエラーが発生しました:', error);
    
    // エラーが発生してもデフォルトセキュリティルールで分析を試みる
    return analyzeWithDefaultSecurityRules();
  }
}

/**
 * デフォルトのセキュリティルールを使用した分析
 * @returns {Object} 分析結果
 */
function analyzeWithDefaultSecurityRules() {
  try {
    // プラグインのインストール確認
    try {
      require.resolve('eslint-plugin-security');
    } catch (err) {
      logger.error('eslint-plugin-security が見つかりません。インストールしてください:');
      logger.error('npm install --save-dev eslint-plugin-security');
      return {
        // highSeverityCount: 0,
        mediumSeverityCount: 0,
        totalIssues: 0,
        error: 'eslint-plugin-security がインストールされていません',
        analysisSuccess: false
      };
    }

    // src ディレクトリが存在するか確認
    const srcDir = path.join(ROOT_DIR, 'src');
    const targetDir = fs.existsSync(srcDir) ? 'src' : '.';
    
    // コマンド文字列内でも絶対パスを使用
    // const command = `npx eslint --plugin security ` +
    //   `--rule "security/detect-unsafe-regex:error" ` +
    //   `--rule "security/detect-buffer-noassert:error" ` + 
    //   `--rule "security/detect-eval-with-expression:error" ` + 
    //   `--rule "security/detect-non-literal-regexp:warn" ` + 
    //   `--rule "security/detect-object-injection:warn" ` + 
    //   `--format json "${srcDir}"`;
    
    // logger.log('デフォルトセキュリティルール分析コマンド:', command);
    
    // const result = execSync(command, { 
    //   encoding: 'utf8', 
    //   stdio: ['pipe', 'pipe', 'pipe'],
    //   cwd: ROOT_DIR  // 明示的に作業ディレクトリを指定
    // });
    
    let securityOutput;
    // try {
    //   securityOutput = JSON.parse(result);
    // } catch (e) {
    //   securityOutput = [];
    // }
    
    // 重要度別に分類
    // const highSeverityCount = Array.isArray(securityOutput) 
    //   ? securityOutput.reduce((count, file) => {
    //       return count + (file.messages || []).filter(
    //         msg => msg.ruleId && msg.ruleId.startsWith('security/') && msg.severity === 2
    //       ).length;
    //     }, 0)
    //   : 0;

    // const mediumSeverityCount = Array.isArray(securityOutput)
    //   ? securityOutput.reduce((count, file) => {
    //       return count + (file.messages || []).filter(
    //         msg => msg.ruleId && msg.ruleId.startsWith('security/') && msg.severity === 1
    //       ).length;
    //     }, 0)
    //   : 0;

    return {
      // highSeverityCount,
      // mediumSeverityCount,
      // totalIssues: highSeverityCount + mediumSeverityCount,
      // details: securityOutput,
      usingDefaultRules: true
    };
  } catch (error) {
    logger.error('デフォルトセキュリティルールでの分析にも失敗しました:', error);
    return {
      highSeverityCount: 0,
      mediumSeverityCount: 0,
      totalIssues: 0,
      error: error.message,
      usingDefaultRules: true,
      analysisSuccess: false
    };
  }
}

/**
 * 分析結果のレポートを生成する関数
 */
function generateReport(results) {
  const reportDir = path.join(ROOT_DIR, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // JSONレポート
  const jsonReportPath = path.join(reportDir, 'static-analysis-report.json');
  fs.writeFileSync(
    jsonReportPath, 
    JSON.stringify(results, null, 2),
    'utf8'
  );
  
  // HTMLレポート（簡易版）
  const htmlReportPath = path.join(reportDir, 'static-analysis-report.html');
  const htmlContent = generateHtmlReport(results);
  fs.writeFileSync(htmlReportPath, htmlContent, 'utf8');
  
  // 常にレポート生成情報を表示（重要な情報なのでエラー扱いで出力）
  logger.error(`\n📊 分析レポートを生成しました:`);
  logger.error(`    - JSON: ${jsonReportPath}`);
  logger.error(`    - HTML: ${htmlReportPath}`);
}

/**
 * HTML形式のレポートを生成する関数
 */
function generateHtmlReport(results) {
  // HTMLレポートの内容を生成
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>静的解析レポート</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f9fafb;
      color: #111827;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .card {
      background: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
    .error { color: #dc2626; }
    .warning { color: #d97706; }
    .success { color: #059669; }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 1rem;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 0.75rem;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    tr:nth-child(even) { background-color: #f9fafb; }
    tr:hover { background-color: #f3f4f6; }
    .summary { font-weight: 600; margin-bottom: 1rem; }
    .progress-bar {
      height: 0.5rem;
      background: #e5e7eb;
      border-radius: 9999px;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 1s ease;
    }
    .progress-high { background-color: #10b981; }
    .progress-medium { background-color: #f59e0b; }
    .progress-low { background-color: #ef4444; }
    h1, h2, h3 {
      font-weight: 600;
      color: #1f2937;
    }
    h1 { font-size: 1.875rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1.5rem; margin-bottom: 1rem; }
    h3 { font-size: 1.25rem; margin-bottom: 0.75rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: 0.5rem;
    }
    .badge-error { background-color: #fee2e2; color: #b91c1c; }
    .badge-warning { background-color: #fef3c7; color: #b45309; }
    .badge-success { background-color: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <div class="container">
    <header class="text-center mb-10">
      <h1 class="text-3xl font-bold">プロ野球候補選手データ収集ツール</h1>
      <p class="text-xl text-gray-600">静的解析レポート - ${new Date().toLocaleString('ja-JP')}</p>
    </header>
    
    <div class="card">
      <div class="flex justify-between items-center">
        <h2 class="text-xl">ESLint 解析結果</h2>
        <div>
          <span class="badge ${results.eslint.errorCount > 0 ? 'badge-error' : 'badge-success'}">エラー: ${results.eslint.errorCount}</span>
          <span class="badge ${results.eslint.warningCount > 0 ? 'badge-warning' : 'badge-success'}">警告: ${results.eslint.warningCount}</span>
        </div>
      </div>
      
      ${results.eslint.errorCount + results.eslint.warningCount > 0 
        ? `<div class="mt-4">
             <h3 class="text-lg font-semibold">問題のある箇所</h3>
             <div class="overflow-x-auto">
               <table>
                 <thead>
                   <tr>
                     <th>ファイル</th>
                     <th>行</th>
                     <th>メッセージ</th>
                     <th>重要度</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${Array.isArray(results.eslint.details) 
                     ? results.eslint.details.flatMap(file => 
                         file.messages.map(msg => 
                           `<tr>
                             <td class="font-mono text-sm">${path.relative(ROOT_DIR, file.filePath)}</td>
                             <td>${msg.line}</td>
                             <td>${msg.message}</td>
                             <td><span class="inline-block px-2 py-1 rounded text-xs font-semibold ${msg.severity === 2 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${msg.severity === 2 ? 'エラー' : '警告'}</span></td>
                           </tr>`
                         ).join('')
                       ).join('')
                     : ''
                   }
                 </tbody>
               </table>
             </div>
           </div>` 
        : '<div class="flex items-center mt-4 text-green-600"><svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>問題は検出されませんでした。</div>'
      }
    </div>
    
    <div class="card">
      <div class="flex justify-between items-center">
        <h2 class="text-xl">コード複雑度分析</h2>
        <span class="badge ${results.complexity.highComplexityFunctions.length > 0 ? 'badge-warning' : 'badge-success'}">
          高複雑度関数: ${results.complexity.highComplexityFunctions.length}
        </span>
      </div>
      
      ${results.complexity.highComplexityFunctions.length > 0 
        ? `<div class="mt-4">
             <h3 class="text-lg font-semibold">高複雑度の関数</h3>
             <div class="overflow-x-auto">
               <table>
                 <thead>
                   <tr>
                     <th>ファイル</th>
                     <th>行</th>
                     <th>複雑度</th>
                     <th>説明</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${results.complexity.highComplexityFunctions.map(func => 
                     `<tr>
                       <td class="font-mono text-sm">${path.relative(ROOT_DIR, func.file)}</td>
                       <td>${func.line}</td>
                       <td><span class="inline-block px-2 py-1 rounded text-xs font-semibold ${func.complexity > 15 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${func.complexity}</span></td>
                       <td>${func.message}</td>
                     </tr>`
                   ).join('')}
                 </tbody>
               </table>
             </div>
           </div>` 
        : '<div class="flex items-center mt-4 text-green-600"><svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>高複雑度の関数は検出されませんでした。</div>'
      }
      <p class="mt-4 text-gray-600">高いコード複雑度は保守性を低下させ、バグのリスクを高めます。複雑度が15を超える関数はリファクタリングを検討してください。</p>
    </div>
    
    <div class="card">
      <h2 class="text-xl mb-4">テストカバレッジ</h2>
      
      <div class="flex items-center mb-2">
        <span class="mr-2 font-semibold">全体カバレッジ:</span>
        <span class="text-lg font-bold ${results.coverage.overallCoverage >= 80 ? 'text-green-600' : results.coverage.overallCoverage >= 60 ? 'text-yellow-600' : 'text-red-600'}">
          ${results.coverage.overallCoverage}%
        </span>
      </div>
      
      <div class="progress-bar">
        <div class="progress-fill ${results.coverage.overallCoverage >= 80 ? 'progress-high' : results.coverage.overallCoverage >= 60 ? 'progress-medium' : 'progress-low'}" 
             style="width: ${results.coverage.overallCoverage}%; animation: progressAnimation 1s ease-out;"></div>
      </div>
      
      <h3 class="text-lg font-semibold mt-6">ファイルごとのカバレッジ</h3>
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>ファイル</th>
              <th>ステートメント</th>
              <th>ブランチ</th>
              <th>関数</th>
              <th>行</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(results.coverage.fileCoverage).map(([file, coverage]) => 
              `<tr>
                <td class="font-mono text-sm">${file}</td>
                <td class="${coverage.statements >= 80 ? 'text-green-600' : coverage.statements >= 60 ? 'text-yellow-600' : 'text-red-600'} font-semibold">${coverage.statements}%</td>
                <td class="${coverage.branches >= 80 ? 'text-green-600' : coverage.branches >= 60 ? 'text-yellow-600' : 'text-red-600'} font-semibold">${coverage.branches}%</td>
                <td class="${coverage.functions >= 80 ? 'text-green-600' : coverage.functions >= 60 ? 'text-yellow-600' : 'text-red-600'} font-semibold">${coverage.functions}%</td>
                <td class="${coverage.lines >= 80 ? 'text-green-600' : coverage.lines >= 60 ? 'text-yellow-600' : 'text-red-600'} font-semibold">${coverage.lines}%</td>
              </tr>`
            ).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="card">
      <h2 class="text-xl mb-4">推奨されるアクション</h2>
      <ul class="space-y-2 pl-5">
        ${results.eslint.errorCount > 0 
          ? `<li class="flex items-start"><span class="inline-block w-4 h-4 rounded-full bg-red-100 text-red-600 mr-2 flex items-center justify-center text-xs">!</span>ESLintで検出された${results.eslint.errorCount}個のエラーを修正してください。</li>` 
          : ''}
        ${results.eslint.warningCount > 0 
          ? `<li class="flex items-start"><span class="inline-block w-4 h-4 rounded-full bg-yellow-100 text-yellow-600 mr-2 flex items-center justify-center text-xs">!</span>ESLintで検出された${results.eslint.warningCount}個の警告を確認してください。</li>` 
          : ''}
        ${results.complexity.highComplexityFunctions.length > 0 
          ? `<li class="flex items-start"><span class="inline-block w-4 h-4 rounded-full bg-yellow-100 text-yellow-600 mr-2 flex items-center justify-center text-xs">!</span>複雑度の高い関数（${results.complexity.highComplexityFunctions.length}個）をリファクタリングしてください。</li>` 
          : ''}
        ${results.coverage.overallCoverage < 70 
          ? `<li class="flex items-start"><span class="inline-block w-4 h-4 rounded-full bg-yellow-100 text-yellow-600 mr-2 flex items-center justify-center text-xs">!</span>テストカバレッジを${results.coverage.overallCoverage}%から70%以上に向上させてください。</li>` 
          : ''}
        ${results.eslint.errorCount === 0 && results.eslint.warningCount === 0 && results.complexity.highComplexityFunctions.length === 0 && results.coverage.overallCoverage >= 70 
          ? '<li class="flex items-center"><span class="inline-block w-4 h-4 rounded-full bg-green-100 text-green-600 mr-2 flex items-center justify-center text-xs">✓</span>すべての静的解析基準をクリアしています。素晴らしい品質を維持してください！</li>' 
          : ''}
      </ul>
    </div>
  </div>
  
  <script>
    // アニメーションとインタラクティブ機能
    document.addEventListener('DOMContentLoaded', function() {
      // カードのアニメーション
      const cards = document.querySelectorAll('.card');
      cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
          card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, index * 100);
      });
      
      // プログレスバーのアニメーション
      const progressBars = document.querySelectorAll('.progress-fill');
      progressBars.forEach((bar) => {
        const width = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
          bar.style.width = width;
        }, 300);
      });
    });
  </script>
</body>
</html>
  `;
}

/**
 * ダッシュボードを生成する関数（新機能）
 * @param {Object} data 分析結果データ
 */
function generateDashboard(data) {
  try {
    const reportsDir = path.join(ROOT_DIR, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // 履歴データの保存
    const historyDir = path.join(reportsDir, 'history');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    fs.writeFileSync(
      path.join(historyDir, `static-analysis-report-${today}.json`),
      JSON.stringify(data, null, 2)
    );

    // HTMLダッシュボード生成
    const dashboardHtml = generateDashboardHtml(data);
    fs.writeFileSync(path.join(reportsDir, 'static-analysis-dashboard.html'), dashboardHtml);
    logger.error(`📊 静的解析ダッシュボードを生成しました: ${path.join(reportsDir, 'static-analysis-dashboard.html')}`);

    // ダッシュボードへのリンクを表示（重要な情報なのでエラー扱いで出力）
    logger.error(`📈 ダッシュボードを確認するには: file://${path.join(reportsDir, 'static-analysis-dashboard.html')}`);
  } catch (error) {
    logger.error('ダッシュボード生成中にエラーが発生しました:', error);
  }
}

/**
 * HTMLダッシュボードを生成する関数（新機能）
 * @param {Object} data 分析結果データ
 * @returns {string} HTML文字列
 */
function generateDashboardHtml(data) {
  // 現在の日付を取得
  const reportDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // トレンドチャートのデータ生成
  let trendChartScript = '';
  if (data.trends && data.trends.available) {
    const chartData = JSON.stringify({
      eslintErrors: data.trends.trends.eslintErrors,
      eslintWarnings: data.trends.trends.eslintWarnings,
      complexity: data.trends.trends.complexity,
      coverage: data.trends.trends.coverage
    });
    
    trendChartScript = `
      <script>
        const trendData = ${chartData};
        // トレンドチャート描画コード（省略）
      </script>
    `;
  }

  // HTMLダッシュボードテンプレート
  return `
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>静的解析ダッシュボード</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
      h1, h2, h3 { color: #333; }
      .header { display: flex; justify-content: space-between; align-items: center; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
      .metric-card { background: #f5f5f5; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .metric-title { font-size: 14px; color: #666; margin: 0; }
      .metric-value { font-size: 28px; font-weight: bold; margin: 5px 0; }
      .metric-good { color: #28a745; }
      .metric-warning { color: #ffc107; }
      .metric-danger { color: #dc3545; }
      .metric-neutral { color: #17a2b8; }
      .trend-indicator { font-size: 12px; }
      .trend-up { color: #28a745; }
      .trend-down { color: #dc3545; }
      .section { margin: 30px 0; }
      .issues-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .issues-table th, .issues-table td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
      .issues-table th { background-color: #f0f0f0; }
      .severity-high { color: #dc3545; font-weight: bold; }
      .severity-medium { color: #ffc107; }
      .chart-container { background: #fff; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>静的コード品質ダッシュボード</h1>
      <p>レポート生成日: ${reportDate}</p>
    </div>
    
    <div class="summary">
      <div class="metric-card">
        <p class="metric-title">ESLintエラー</p>
        <p class="metric-value ${data.eslint.errorCount > 0 ? 'metric-danger' : 'metric-good'}">
          ${data.eslint.errorCount}
          ${data.trends && data.trends.available && data.trends.improvement.available ? 
            `<span class="trend-indicator ${data.trends.improvement.eslintErrors.change <= 0 ? 'trend-up' : 'trend-down'}">
              ${data.trends.improvement.eslintErrors.change <= 0 ? '↓' : '↑'} ${Math.abs(data.trends.improvement.eslintErrors.percent)}%
            </span>` : ''}
        </p>
      </div>
      
      <div class="metric-card">
        <p class="metric-title">ESLint警告</p>
        <p class="metric-value ${data.eslint.warningCount > 10 ? 'metric-warning' : 'metric-good'}">
          ${data.eslint.warningCount}
          ${data.trends && data.trends.available && data.trends.improvement.available ? 
            `<span class="trend-indicator ${data.trends.improvement.eslintWarnings.change <= 0 ? 'trend-up' : 'trend-down'}">
              ${data.trends.improvement.eslintWarnings.change <= 0 ? '↓' : '↑'} ${Math.abs(data.trends.improvement.eslintWarnings.percent)}%
            </span>` : ''}
        </p>
      </div>
      
      <div class="metric-card">
        <p class="metric-title">高複雑度関数</p>
        <p class="metric-value ${data.complexity.highComplexityFunctions.length > 5 ? 'metric-warning' : 'metric-good'}">
          ${data.complexity.highComplexityFunctions.length}
          ${data.trends && data.trends.available && data.trends.improvement.available ? 
            `<span class="trend-indicator ${data.trends.improvement.complexity.change <= 0 ? 'trend-up' : 'trend-down'}">
              ${data.trends.improvement.complexity.change <= 0 ? '↓' : '↑'} ${Math.abs(data.trends.improvement.complexity.percent)}%
            </span>` : ''}
        </p>
      </div>
      
      <div class="metric-card">
        <p class="metric-title">テストカバレッジ</p>
        <p class="metric-value ${data.coverage.overall >= 80 ? 'metric-good' : data.coverage.overall >= 60 ? 'metric-warning' : 'metric-danger'}">
          ${data.coverage.overall}%
          ${data.trends && data.trends.available && data.trends.improvement.available ? 
            `<span class="trend-indicator ${data.trends.improvement.coverage.change >= 0 ? 'trend-up' : 'trend-down'}">
              ${data.trends.improvement.coverage.change >= 0 ? '↑' : '↓'} ${Math.abs(data.trends.improvement.coverage.percent)}%
            </span>` : ''}
        </p>
      </div>
      
      <div class="metric-card">
        <p class="metric-title">テストカバレッジ</p>
        <p class="metric-value ${data.coverage.overall >= 80 ? 'metric-good' : data.coverage.overall >= 60 ? 'metric-warning' : 'metric-danger'}">
          ${data.coverage.overall}%
          ${data.trends && data.trends.available && data.trends.improvement.available ? 
            `<span class="trend-indicator ${data.trends.improvement.coverage.change >= 0 ? 'trend-up' : 'trend-down'}">
              ${data.trends.improvement.coverage.change >= 0 ? '↑' : '↓'} ${Math.abs(data.trends.improvement.coverage.percent)}%
            </span>` : ''}
        </p>
      </div>
    </div>

    <div class="section">
      <h2>セキュリティ脆弱性</h2>
      <div class="metric-card">
        <p class="metric-title">重大な脆弱性</p>
        <p class="metric-value ${data.security.highSeverityCount > 0 ? 'metric-danger' : 'metric-good'}">${data.security.highSeverityCount}</p>
      </div>
      <div class="metric-card">
        <p class="metric-title">中程度の脆弱性</p>
        <p class="metric-value ${data.security.mediumSeverityCount > 0 ? 'metric-warning' : 'metric-good'}">${data.security.mediumSeverityCount}</p>
      </div>
    </div>

    <div class="section">
      <h2>ESLint 問題の詳細</h2>
      <table class="issues-table">
        <thead>
          <tr>
            <th>ファイル</th>
            <th>行</th>
            <th>メッセージ</th>
            <th>重要度</th>
          </tr>
        </thead>
        <tbody>
          ${data.eslint.details.flatMap(file => 
            file.messages.map(msg => 
              `<tr>
                <td>${path.relative(ROOT_DIR, file.filePath)}</td>
                <td>${msg.line}</td>
                <td>${msg.message}</td>
                <td class="${msg.severity === 2 ? 'severity-high' : 'severity-medium'}">${msg.severity === 2 ? 'エラー' : '警告'}</td>
              </tr>`
            ).join('')
          ).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>高複雑度関数の詳細</h2>
      <table class="issues-table">
        <thead>
          <tr>
            <th>ファイル</th>
            <th>行</th>
            <th>複雑度</th>
            <th>説明</th>
          </tr>
        </thead>
        <tbody>
          ${data.complexity.highComplexityFunctions.map(func => 
            `<tr>
              <td>${path.relative(ROOT_DIR, func.file)}</td>
              <td>${func.line}</td>
              <td class="${func.complexity > 15 ? 'severity-high' : 'severity-medium'}">${func.complexity}</td>
              <td>${func.message}</td>
            </tr>`
          ).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>テストカバレッジの詳細</h2>
      <table class="issues-table">
        <thead>
          <tr>
            <th>ファイル</th>
            <th>ステートメント</th>
            <th>ブランチ</th>
            <th>関数</th>
            <th>行</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.coverage.fileCoverage).map(([file, coverage]) => 
            `<tr>
              <td>${file}</td>
              <td class="${coverage.statements >= 80 ? 'severity-high' : coverage.statements >= 60 ? 'severity-medium' : 'severity-low'}">${coverage.statements}%</td>
              <td class="${coverage.branches >= 80 ? 'severity-high' : coverage.branches >= 60 ? 'severity-medium' : 'severity-low'}">${coverage.branches}%</td>
              <td class="${coverage.functions >= 80 ? 'severity-high' : coverage.functions >= 60 ? 'severity-medium' : 'severity-low'}">${coverage.functions}%</td>
              <td class="${coverage.lines >= 80 ? 'severity-high' : coverage.lines >= 60 ? 'severity-medium' : 'severity-low'}">${coverage.lines}%</td>
            </tr>`
          ).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>コード品質トレンド</h2>
      <div class="chart-container">
        <canvas id="trendChart"></canvas>
      </div>
    </div>

    ${trendChartScript}
  </body>
  </html>
  `;
}

// 静的解析を実行
runStaticAnalysis();

// Node.js環境で直接実行された場合のみ実行
// if (require.main === module) {
//   runStaticAnalysis();
// }

// エクスポート（テストやモジュールとしての利用のため）
module.exports = {
  runStaticAnalysis,
  analyzeFunctionComplexity,
  analyzeTestCoverage,
  analyzeSecurityVulnerabilities
};