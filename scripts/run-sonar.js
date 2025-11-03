const scanner = require('sonarqube-scanner');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// 環境変数チェック
if (!process.env.SONAR_HOST_URL || !process.env.SONAR_TOKEN) {
  console.error(chalk.red('エラー: SONAR_HOST_URL と SONAR_TOKEN 環境変数が必要です。'));
  console.log(chalk.yellow('以下のように環境変数をセットしてください:'));
  console.log('export SONAR_HOST_URL=http://localhost:9000');
  console.log('export SONAR_TOKEN=your-token');
  process.exit(1);
}

console.log(chalk.blue('SonarQube分析を開始します...'));

// プロジェクトのルートパス
const projectRoot = path.resolve(__dirname, '..');

// テストレポートが存在するかチェック
const lcovPath = path.join(projectRoot, 'coverage/lcov.info');
const testReportPath = path.join(projectRoot, 'test-report.xml');
const hasLcov = fs.existsSync(lcovPath);
const hasTestReport = fs.existsSync(testReportPath);

if (!hasLcov) {
  console.warn(chalk.yellow('警告: コードカバレッジレポートが見つかりません。'));
  console.warn(chalk.yellow('カバレッジ情報を含めるには、次のコマンドを実行してください:'));
  console.warn(chalk.yellow('npm run test:coverage'));
}

// sonar設定オプション
const sonarOptions = {
  // プロジェクト識別設定
  'sonar.projectKey': 'pro_candidate',
  'sonar.projectName': 'Pro Candidate',
  'sonar.projectVersion': require(path.join(projectRoot, 'package.json')).version,
  'sonar.projectDescription': 'プロ野球候補選手データ収集ツール',

  // ソースコード解析設定
  'sonar.sources': 'src',
  'sonar.exclusions': 'node_modules/**,coverage/**,tests/**,**/*.test.js,**/*.spec.js',
  'sonar.sourceEncoding': 'UTF-8',

  // テスト設定
  'sonar.tests': 'tests',
  'sonar.test.inclusions': 'tests/**/*.js,**/*.test.js,**/*.spec.js',
  'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
  
  // コード品質ゲート設定
  'sonar.qualitygate.wait': 'true',
  
  // TypeScript設定
  'sonar.typescript.tsconfigPath': 'tsconfig.json',
  
  // 重複コード検知設定
  'sonar.cpd.exclusions': 'tests/**',
  
  // JavaScript設定
  'sonar.javascript.exclusions': 'node_modules/**,**/vendor/**',
  
  // 言語設定
  'sonar.language': 'js,ts'
};

// テストレポートが存在する場合のみ設定を追加
if (hasTestReport) {
  sonarOptions['sonar.testExecutionReportPaths'] = 'test-report.xml';
} else {
  console.warn(chalk.yellow('警告: テスト実行レポートが見つかりません。テストレポート情報は含まれません。'));
  console.warn(chalk.yellow('テストレポートを生成するには、次のコマンドを実行してください:'));
  console.warn(chalk.yellow('node scripts/generate-sonar-test-report.js'));
}

// Sonarスキャン実行
scanner(
  {
    serverUrl: process.env.SONAR_HOST_URL,
    token: process.env.SONAR_TOKEN,
    options: sonarOptions
  },
  () => {
    console.log(chalk.green('SonarQube分析が完了しました!'));
    console.log(`詳細な分析結果はこちらで確認できます: ${process.env.SONAR_HOST_URL}/dashboard?id=pro_candidate`);
  }
);
