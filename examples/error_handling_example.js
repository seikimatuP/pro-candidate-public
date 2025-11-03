/**
 * エラーハンドリングシステムの使用例を示すサンプルコード
 */

/**
 * 基本的なエラーハンドリング例
 */
async function basicErrorHandling() {
  try {
    // 何らかの処理
    await fetchData('https://example.com/api');
  } catch (error) {
    // ErrorHandlerを使用してエラーを処理
    const handler = ErrorHandler.getInstance();
    const recovered = await handler.handleError(error, {
      operation: 'データ取得',
      url: 'https://example.com/api'
    });
    
    if (!recovered) {
      console.log('エラーからの回復に失敗しました');
      // ユーザーへの表示メッセージを取得
      if (error instanceof AppError) {
        const userMessage = handler.getUserFriendlyMessage(error);
        showUserMessage(userMessage);
      } else {
        showUserMessage('処理中にエラーが発生しました');
      }
    } else {
      console.log('エラーから回復しました');
      // 処理を続行
    }
  }
}

/**
 * 特定のエラータイプの作成と処理例
 */
async function specificErrorHandling() {
  try {
    const response = await fetchDataWithTimeout('https://example.com/api', 5000);
    if (!response.ok) {
      // HTTPエラーを作成
      throw new AppError(
        `API呼び出しが失敗しました: ${response.status} ${response.statusText}`,
        ErrorType.HTTP_ERROR,
        SeverityLevel.ERROR,
        { url: 'https://example.com/api', statusCode: response.status }
      );
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    const handler = ErrorHandler.getInstance();
    
    // エラーがTimeoutErrorの場合（fetchDataWithTimeout関数内で発生）
    if (error.name === 'TimeoutError') {
      const timeoutError = new AppError(
        'API呼び出しがタイムアウトしました',
        ErrorType.TIMEOUT,
        SeverityLevel.WARNING,
        { url: 'https://example.com/api', timeoutMs: 5000 }
      );
      
      await handler.handleError(timeoutError);
      return null;
    }
    
    // その他のエラー
    await handler.handleError(error);
    return null;
  }
}

/**
 * エラー回復戦略の登録例
 */
function registerErrorRecoveryStrategies() {
  const handler = ErrorHandler.getInstance();
  
  // ネットワークエラーの回復戦略
  handler.registerRecoveryStrategy(ErrorType.NETWORK_UNAVAILABLE, async (error) => {
    console.log('ネットワーク接続の回復を試みています...');
    
    // 最大3回までリトライ
    if (error.retryCount >= 3) {
      console.log('最大リトライ回数に達しました');
      return false;
    }
    
    // 待機時間（指数バックオフ）
    const waitTime = Math.pow(2, error.retryCount) * 1000;
    console.log(`${waitTime}ms待機します...`);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // リトライカウントを増やす
    error.retryCount++;
    
    try {
      // 再度接続を試みる
      const isConnected = checkNetworkConnection();
      return isConnected;
    } catch (e) {
      console.log('接続チェックに失敗しました:', e);
      return false;
    }
  });
  
  // HTTPエラーの回復戦略
  handler.registerRecoveryStrategy(ErrorType.HTTP_ERROR, async (error) => {
    // 特定のHTTPステータスコードで異なる処理
    const statusCode = error.context?.statusCode;
    
    if (statusCode === 429) { // Too Many Requests
      console.log('レート制限に達しました。しばらく待機します...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    }
    
    if (statusCode >= 500) { // サーバーエラー
      console.log('サーバーエラーが発生しました。リトライします...');
      
      if (error.retryCount >= 2) {
        return false;
      }
      
      error.retryCount++;
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }
    
    return false; // その他のHTTPエラーは回復不可
  });
}

/**
 * エラーハンドリングシステムの初期化
 */
function initializeErrorHandling() {
  // 回復戦略の登録
  registerErrorRecoveryStrategies();
  
  // エラーモニタリングのセットアップ
  if (typeof ErrorMonitor !== 'undefined') {
    const monitor = ErrorMonitor.getInstance();
    
    // 定期的なエラーチェックをスケジュール
    // (GAS環境での実装例)
    try {
      if (typeof ScriptApp !== 'undefined') {
        // 既存のトリガーを削除
        const triggers = ScriptApp.getProjectTriggers();
        triggers.forEach(trigger => {
          if (trigger.getHandlerFunction() === 'checkErrorAlerts') {
            ScriptApp.deleteTrigger(trigger);
          }
        });
        
        // 毎日実行するトリガーを作成
        ScriptApp.newTrigger('checkErrorAlerts')
          .timeBased()
          .everyDays(1)
          .create();
      }
    } catch (e) {
      console.error('エラーモニタリングのスケジュール設定に失敗しました:', e);
    }
  }
}

// メイン関数
async function main() {
  // エラーハンドリングの初期化
  initializeErrorHandling();
  
  // 基本的なエラーハンドリングの例
  await basicErrorHandling();
  
  // 特定のエラータイプの処理例
  const data = await specificErrorHandling();
  
  if (data) {
    console.log('データ取得成功:', data);
  } else {
    console.log('データ取得失敗');
  }
}

// ------------------------------
// モック関数（実際の環境では実装が異なる）
// ------------------------------

async function fetchData(url) {
  // モック実装
  if (Math.random() < 0.3) {
    throw new Error('ネットワーク接続エラー');
  }
  return { ok: true, json: async () => ({ result: 'success' }) };
}

async function fetchDataWithTimeout(url, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error('リクエストがタイムアウトしました');
      error.name = 'TimeoutError';
      reject(error);
    }, timeout);
    
    fetchData(url)
      .then(response => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function checkNetworkConnection() {
  // モック実装
  return Math.random() >= 0.3;
}

function showUserMessage(message) {
  console.log('ユーザーメッセージ:', message);
  // 実際の環境ではUI表示など
}

// GAS環境ではなく、Node.js環境で実行する場合
if (typeof module !== 'undefined') {
  // モックのグローバル変数
  global.ErrorHandler = {
    getInstance: () => ({
      handleError: async (error, context) => {
        console.log('エラー処理:', error.message, context);
        return false;
      },
      getUserFriendlyMessage: (error) => 'エラーが発生しました',
      registerRecoveryStrategy: (type, strategy) => {}
    })
  };
  
  global.AppError = class AppError extends Error {
    constructor(message, type, severity, context, retryCount = 0) {
      super(message);
      this.type = type;
      this.severity = severity;
      this.context = context;
      this.retryCount = retryCount;
    }
  };
  
  global.ErrorType = {
    NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
    HTTP_ERROR: 'HTTP_ERROR',
    TIMEOUT: 'TIMEOUT',
    // その他のタイプ...
  };
  
  global.SeverityLevel = {
    INFO: 0,
    WARNING: 1,
    ERROR: 2,
    CRITICAL: 3
  };
  
  // テストのために実行
  main().catch(console.error);
}
