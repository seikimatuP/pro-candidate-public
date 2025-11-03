#!/usr/bin/env node

// Markitdown直接実行ラッパー
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function markitdownConvert(input, options = {}) {
  return new Promise((resolve, reject) => {
    const args = ['markitdown'];
    
    // 標準入力の場合は引数なし
    
    const uvx = spawn('/home/ynozue/.local/bin/uvx', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    uvx.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    uvx.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    uvx.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`markitdown failed: ${stderr}`));
      }
    });
    
    // 入力送信
    if (options.stdin) {
      uvx.stdin.write(input);
      uvx.stdin.end();
    } else {
      uvx.stdin.end();
    }
  });
}

// コマンドライン使用
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法:');
    console.log('  node markitdown-direct.js <file>     # ファイル変換');
    console.log('  echo "html" | node markitdown-direct.js --stdin  # 標準入力');
    process.exit(1);
  }
  
  if (args[0] === '--stdin') {
    // 標準入力から読み込み
    let input = '';
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    
    process.stdin.on('end', async () => {
      try {
        const result = await markitdownConvert(input, { stdin: true });
        console.log(result);
      } catch (error) {
        console.error('エラー:', error.message);
        process.exit(1);
      }
    });
  } else {
    // ファイル変換
    const filename = args[0];
    if (!fs.existsSync(filename)) {
      console.error(`ファイルが見つかりません: ${filename}`);
      process.exit(1);
    }
    
    spawn('/home/ynozue/.local/bin/uvx', ['markitdown', filename], {
      stdio: 'inherit'
    });
  }
}

module.exports = { markitdownConvert };