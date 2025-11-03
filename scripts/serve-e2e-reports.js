#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = 9323;

// 静的ファイル配信の設定
app.use('/local', express.static(path.join(__dirname, '../playwright-report/local')));
app.use('/dev', express.static(path.join(__dirname, '../playwright-report/dev')));
app.use('/prod', express.static(path.join(__dirname, '../playwright-report/prod')));

// テスト実行状態の確認
function checkTestRunning(callback) {
  // 環境変数とプロセスを確認して環境を特定
  exec('ps aux | grep -E "test:e2e" | grep -v grep | grep -v serve', (error, stdout) => {
    let runningEnvs = [];
    
    if (!error && stdout.trim().length > 0) {
      // npm run test:e2e:local/dev/prodのパターンを検出
      if (stdout.includes('test:e2e:local') || stdout.includes('run-e2e-test.sh local')) {
        runningEnvs.push('local');
      }
      if (stdout.includes('test:e2e:dev') || stdout.includes('run-e2e-test.sh dev')) {
        runningEnvs.push('dev');
      }
      if (stdout.includes('test:e2e:prod') || stdout.includes('run-e2e-test.sh prod')) {
        runningEnvs.push('prod');
      }
      
      // E2E_ENVIRONMENT環境変数をチェック
      if (runningEnvs.length === 0 && stdout.includes('playwright test')) {
        exec('ps aux | grep "E2E_ENVIRONMENT" | grep -v grep', (envError, envStdout) => {
          if (!envError && envStdout.includes('E2E_ENVIRONMENT=local')) {
            runningEnvs.push('local');
          } else if (!envError && envStdout.includes('E2E_ENVIRONMENT=dev')) {
            runningEnvs.push('dev');
          } else if (!envError && envStdout.includes('E2E_ENVIRONMENT=prod')) {
            runningEnvs.push('prod');
          }
          
          // デフォルトはlocalとして扱う（環境指定なしの場合）
          if (runningEnvs.length === 0 && stdout.includes('playwright test --config=playwright.config.ts')) {
            runningEnvs.push('local');
          }
          
          console.log(`[Debug] Test running: ${runningEnvs.length > 0}, Environments: ${runningEnvs.join(', ')}`);
          callback(runningEnvs.length > 0, runningEnvs);
        });
      } else {
        console.log(`[Debug] Test running: ${runningEnvs.length > 0}, Environments: ${runningEnvs.join(', ')}`);
        callback(runningEnvs.length > 0, runningEnvs);
      }
    } else {
      console.log(`[Debug] Test running: false, Environments: `);
      callback(false, []);
    }
  });
}

// レポートファイル存在確認と更新日時取得
function getReportInfo(env, isTestRunning = false) {
  const reportPath = path.join(__dirname, `../playwright-report/${env}/index.html`);
  if (!fs.existsSync(reportPath)) {
    return { 
      exists: false, 
      lastModified: null,
      isRunning: isTestRunning
    };
  }
  
  const stats = fs.statSync(reportPath);
  const lastModified = stats.mtime;
  
  // 日本時間に変換してフォーマット
  const jstDate = new Date(lastModified.getTime() + (9 * 60 * 60 * 1000));
  const formattedDate = jstDate.toISOString().replace('T', ' ').substring(0, 19) + ' JST';
  
  return {
    exists: true,
    lastModified: formattedDate,
    relativeTime: getRelativeTime(lastModified),
    isRunning: isTestRunning
  };
}

// 相対時間の計算
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}日前`;
  } else if (hours > 0) {
    return `${hours}時間前`;
  } else {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}分前`;
  }
}

// ルートページ - 環境選択画面
app.get('/', (req, res) => {
  // テスト実行状態を確認
  checkTestRunning((isAnyRunning, runningEnvs) => {
    console.log(`[Debug] Test running: ${isAnyRunning}, Environments: ${runningEnvs.join(', ')}`);
    
    // 環境別レポート情報を取得（unknownは削除し、明示的な環境のみ）
    const localInfo = getReportInfo('local', runningEnvs.includes('local'));
    const devInfo = getReportInfo('dev', runningEnvs.includes('dev'));
    const prodInfo = getReportInfo('prod', runningEnvs.includes('prod'));
    
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="10">
  <title>E2E テストレポート - 環境選択</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 40px;
    }
    .environment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .env-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      text-decoration: none;
      color: #333;
      transition: all 0.3s ease;
    }
    .env-card:hover {
      border-color: #007bff;
      background: #e7f3ff;
      transform: translateY(-2px);
    }
    .env-card.local {
      border-color: #28a745;
    }
    .env-card.dev {
      border-color: #ffc107;
    }
    .env-card.prod {
      border-color: #dc3545;
    }
    .env-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .env-url {
      font-size: 12px;
      color: #666;
      word-break: break-all;
    }
    .status {
      margin-top: 10px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .status.available {
      background: #d4edda;
      color: #155724;
    }
    .status.unavailable {
      background: #f8d7da;
      color: #721c24;
    }
    .status.running {
      background: #fff3cd;
      color: #856404;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .running-indicator {
      display: inline-block;
      animation: spin 1s linear infinite;
      margin-right: 4px;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .timestamp {
      margin-top: 8px;
      font-size: 11px;
      color: #666;
    }
    .relative-time {
      color: #0066cc;
      font-weight: 500;
    }
    .info {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 16px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 E2E テストレポート</h1>
    
    <div class="environment-grid">
      <a href="/local/" class="env-card local">
        <div class="env-title">Local Environment</div>
        <div class="env-url">http://localhost:5173</div>
        <div class="status ${localInfo.isRunning ? 'running' : localInfo.exists ? 'available' : 'unavailable'}">
          ${localInfo.isRunning ? '<span class="running-indicator">🔄</span> テスト実行中...' : localInfo.exists ? '✅ レポート利用可能' : '❌ レポートなし'}
        </div>
        ${localInfo.exists ? `
          <div class="timestamp">
            📅 ${localInfo.lastModified}<br>
            <span class="relative-time">(${localInfo.relativeTime})</span>
          </div>
        ` : ''}
      </a>
      
      <a href="/dev/" class="env-card dev">
        <div class="env-title">Dev Environment</div>
        <div class="env-url">pro-candidate-frontend-dev.s3-website</div>
        <div class="status ${devInfo.isRunning ? 'running' : devInfo.exists ? 'available' : 'unavailable'}">
          ${devInfo.isRunning ? '<span class="running-indicator">🔄</span> テスト実行中...' : devInfo.exists ? '✅ レポート利用可能' : '❌ レポートなし'}
        </div>
        ${devInfo.exists ? `
          <div class="timestamp">
            📅 ${devInfo.lastModified}<br>
            <span class="relative-time">(${devInfo.relativeTime})</span>
          </div>
        ` : ''}
      </a>
      
      <a href="/prod/" class="env-card prod">
        <div class="env-title">Prod Environment</div>
        <div class="env-url">pro-candidate-frontend-prod.s3-website</div>
        <div class="status ${prodInfo.isRunning ? 'running' : prodInfo.exists ? 'available' : 'unavailable'}">
          ${prodInfo.isRunning ? '<span class="running-indicator">🔄</span> テスト実行中...' : prodInfo.exists ? '✅ レポート利用可能' : '❌ レポートなし'}
        </div>
        ${prodInfo.exists ? `
          <div class="timestamp">
            📅 ${prodInfo.lastModified}<br>
            <span class="relative-time">(${prodInfo.relativeTime})</span>
          </div>
        ` : ''}
      </a>
    </div>
    
    <div class="info">
      <strong>📋 使用方法:</strong><br>
      • 各環境カードをクリックしてテストレポートを表示<br>
      • <code>npm run test:e2e:dev</code> 等でテスト実行後にレポートが生成されます<br>
      • ブラウザを更新してレポート状況を確認してください
    </div>
  </div>
</body>
</html>
  `;
    res.send(html);
  });
});

// 404エラーハンドリング
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - ページが見つかりません</h1>
    <p><a href="/">環境選択画面に戻る</a></p>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 E2E テストレポートサーバーが起動しました`);
  console.log(`📊 環境選択: http://localhost:${PORT}`);
  console.log(`🏠 Local:     http://localhost:${PORT}/local/`);
  console.log(`🔧 Dev:       http://localhost:${PORT}/dev/`);
  console.log(`🚀 Prod:      http://localhost:${PORT}/prod/`);
  console.log('\n終了するには Ctrl+C を押してください');
});