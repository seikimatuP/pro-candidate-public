/**
 * Jestのグローバルセットアップ
 * テストを実行する前に一度だけ呼び出される
 */

module.exports = async () => {
  // グローバルなモック関数を定義
  global.getCachedOrCompute = async (key, fn) => await fn();
  
  // ログ関数のモックを定義
  // globalSetupでは jest オブジェクトは利用できないため、空の関数を定義
  global.debug = function() {};
  global.info = function() {};
  global.error = function() {};
  global.warn = function() {};
  
  console.log('グローバルテスト環境をセットアップしました');
};
