const autocannon = require('autocannon');

async function runLoadTest() {
  console.log('🚀 API負荷テスト開始...');
  
  const baseUrl = 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev';
  
  // ヘルスチェックエンドポイントのテスト
  const healthTest = await autocannon({
    url: `${baseUrl}/health`,
    connections: 10,
    duration: 30,
    headers: {
      'content-type': 'application/json',
    },
    title: 'Health Endpoint Load Test'
  });
  
  console.log('📊 ヘルスチェックエンドポイント結果:');
  console.log(`- 総リクエスト数: ${healthTest.requests.total}`);
  console.log(`- 平均レスポンス時間: ${healthTest.latency.mean}ms`);
  console.log(`- 95%ile レスポンス時間: ${healthTest.latency.p95 || 'N/A'}ms`);
  console.log(`- エラー率: ${(healthTest.errors / healthTest.requests.total * 100).toFixed(2)}%`);
  
  // プレイヤーAPIのテスト
  const playersTest = await autocannon({
    url: `${baseUrl}/players?type=highschool&year=2024`,
    connections: 10,
    duration: 30,
    headers: {
      'content-type': 'application/json',
    },
    title: 'Players API Load Test'
  });
  
  console.log('\n📊 プレイヤーAPI結果:');
  console.log(`- 総リクエスト数: ${playersTest.requests.total}`);
  console.log(`- 平均レスポンス時間: ${playersTest.latency.mean}ms`);
  console.log(`- 95%ile レスポンス時間: ${playersTest.latency.p95 || 'N/A'}ms`);
  console.log(`- エラー率: ${(playersTest.errors / playersTest.requests.total * 100).toFixed(2)}%`);
  
  // パフォーマンス要件の検証
  const healthPassed = (healthTest.latency.p95 || healthTest.latency.mean) < 2000; // 2秒以内
  const playersPassed = (playersTest.latency.p95 || playersTest.latency.mean) < 3000; // 3秒以内
  const healthErrorRate = (healthTest.errors / healthTest.requests.total * 100);
  const playersErrorRate = (playersTest.errors / playersTest.requests.total * 100);
  
  console.log('\n✅ パフォーマンス要件チェック:');
  console.log(`- ヘルスチェック 95%ile < 2s: ${healthPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- プレイヤーAPI 95%ile < 3s: ${playersPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- ヘルスチェック エラー率 < 1%: ${healthErrorRate < 1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- プレイヤーAPI エラー率 < 5%: ${playersErrorRate < 5 ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = healthPassed && playersPassed && healthErrorRate < 1 && playersErrorRate < 5;
  
  if (allPassed) {
    console.log('\n🎉 すべてのパフォーマンステストに合格しました！');
    process.exit(0);
  } else {
    console.log('\n❌ 一部のパフォーマンステストが失敗しました。');
    process.exit(1);
  }
}

// 並行接続テスト
async function runConcurrencyTest() {
  console.log('\n🔄 同時接続テスト開始...');
  
  const concurrencyTest = await autocannon({
    url: 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev/health',
    connections: 100, // 100同時接続
    duration: 10,
    headers: {
      'content-type': 'application/json',
    },
    title: '100 Concurrent Connections Test'
  });
  
  console.log('📊 同時接続テスト結果:');
  console.log(`- 総リクエスト数: ${concurrencyTest.requests.total}`);
  console.log(`- RPS (Requests Per Second): ${concurrencyTest.requests.mean}`);
  console.log(`- 平均レスポンス時間: ${concurrencyTest.latency.mean}ms`);
  console.log(`- 最大レスポンス時間: ${concurrencyTest.latency.max}ms`);
  
  const concurrencyPassed = concurrencyTest.latency.mean < 5000; // 5秒以内
  console.log(`- 100同時接続対応: ${concurrencyPassed ? '✅ PASS' : '❌ FAIL'}`);
  
  return concurrencyPassed;
}

// メイン実行
async function main() {
  try {
    await runLoadTest();
    await runConcurrencyTest();
  } catch (error) {
    console.error('❌ 負荷テスト実行エラー:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runLoadTest, runConcurrencyTest };