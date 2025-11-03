/**
 * グローバルテストセットアップ
 */

// dotenvで環境変数を読み込み
require('dotenv').config({ path: '.env.test' });

// コンソール出力をモック化
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

const { initMockCacheService } = require('../mocks/cache');

// グローバルモックの初期化
function initMockGasEnvironment() {
  // SpreadsheetApp
  global.SpreadsheetApp = {
    openById: jest.fn().mockReturnValue({
      getSheetByName: jest.fn().mockImplementation((name) => {
        return {
          getName: jest.fn().mockReturnValue(name),
          getRange: jest.fn().mockReturnValue({
            setValue: jest.fn(),
            getValue: jest.fn().mockReturnValue(''),
            setValues: jest.fn(),
            getValues: jest.fn().mockReturnValue([[]]),
          }),
          getLastRow: jest.fn().mockReturnValue(10),
          getLastColumn: jest.fn().mockReturnValue(5),
        };
      }),
      insertSheet: jest.fn().mockImplementation((name) => {
        return {
          getName: jest.fn().mockReturnValue(name),
          getRange: jest.fn().mockReturnValue({
            setValue: jest.fn(),
            getValue: jest.fn().mockReturnValue(''),
          }),
        };
      }),
    }),
    getActiveSpreadsheet: jest.fn().mockReturnValue({
      getSheetByName: jest.fn(),
      insertSheet: jest.fn(),
    }),
  };

  // UrlFetchApp
  global.UrlFetchApp = {
    fetch: jest.fn().mockReturnValue({
      getContentText: jest
        .fn()
        .mockReturnValue('<html><body>Test</body></html>'),
      getResponseCode: jest.fn().mockReturnValue(200),
    }),
  };

  // PropertiesService
  global.PropertiesService = {
    getScriptProperties: jest.fn().mockReturnValue({
      getProperty: jest.fn().mockImplementation((key) => {
        // テスト実行に必要な基本設定
        const testConfig = {
          HIGH_SCHOOL_URL: 'http://example.com/high-school',
          UNIVERSITY_URL: 'http://example.com/university',
          SHEET_ID: 'test-sheet-id',
        };
        return testConfig[key] || null;
      }),
      setProperty: jest.fn(),
      setProperties: jest.fn(),
      getProperties: jest.fn().mockReturnValue({}),
    }),
  };

  // CacheServiceのモック初期化
  const cacheUtils = initMockCacheService();
  global.cacheUtils = cacheUtils;

  // Logger
  global.Logger = {
    log: jest.fn(),
  };

  // Parser (スクレイピング用)
  global.Parser = {
    data: jest.fn().mockImplementation((html) => {
      return {
        from: jest.fn().mockReturnValue({
          to: jest.fn().mockReturnValue({
            iterate: jest
              .fn()
              .mockReturnValue([
                '<tr><td>東京都</td><td>東京高校</td><td>山田太郎</td><td>2024/03/01</td></tr>',
              ]),
          }),
        }),
      };
    }),
  };

  // getConfig/setConfig基本関数のモック化
  if (!global.getConfig) {
    global.getConfig = jest.fn().mockImplementation((key, defaultValue) => {
      return (
        PropertiesService.getScriptProperties().getProperty(key) || defaultValue
      );
    });
  }

  if (!global.setConfig) {
    global.setConfig = jest.fn().mockImplementation((key, value) => {
      PropertiesService.getScriptProperties().setProperty(key, value);
    });
  }

  // Utilitiesのモックを追加
  global.Utilities = global.Utilities || {
    base64Encode: jest.fn().mockImplementation(str => {
      // Node.js環境でBase64エンコードを実行
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(str).toString('base64');
      }
      return 'mocked_base64_' + str;
    }),
    formatDate: jest.fn().mockImplementation((date, timezone, format) => {
      return new Date(date).toISOString().split('T')[0]; // YYYY-MM-DD形式
    })
  };
}

// 初期化
initMockGasEnvironment();

// テスト前に必ずモックをリセット
beforeEach(() => {
  jest.clearAllMocks();
  if (global.cacheUtils) {
    global.cacheUtils.clearCache();
  }
  
  // グローバルなロガー関数のモック
  global.debug = jest.fn();
  global.info = jest.fn();
  global.warn = jest.fn();
  global.error = jest.fn();
  
  // getCachedOrComputeのグローバルモック
  global.getCachedOrCompute = jest.fn().mockImplementation(async (key, fn) => {
    // キャッシュミスをシミュレート、常に関数を実行
    return await fn();
  });
});

// メモリリーク対策: テスト終了後のクリーンアップ
afterEach(() => {
  // タイマーのクリア
  jest.clearAllTimers();
  jest.useRealTimers();
  
  // プロミスのクリア
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
});

// 全テスト終了後のクリーンアップ
afterAll(() => {
  // グローバル変数のクリア
  delete global.SpreadsheetApp;
  delete global.UrlFetchApp;
  delete global.PropertiesService;
  delete global.CacheService;
  delete global.Logger;
  delete global.Utilities;
  delete global.cacheUtils;
  
  // モックのリストア
  jest.restoreAllMocks();
  jest.clearAllTimers();
});

// グローバルヘルパー関数の定義
global.setupTestData = (options = {}) => {
  // テスト固有のデータ設定
  if (options.mockHighSchoolResponse) {
    const { highSchoolHtml } = require('../mocks/html_responses');
    global.UrlFetchApp.fetch.mockImplementation((url) => {
      if (url.includes('high-school')) {
        return {
          getContentText: jest.fn().mockReturnValue(highSchoolHtml),
          getResponseCode: jest.fn().mockReturnValue(200),
        };
      }
      return {
        getContentText: jest.fn().mockReturnValue('<html>Not Found</html>'),
        getResponseCode: jest.fn().mockReturnValue(404),
      };
    });
  }
};

// 基本的なGASオブジェクトのモック定義
global.SpreadsheetApp = global.SpreadsheetApp || {
  openById: jest.fn().mockReturnValue({
    getSheetByName: jest.fn().mockImplementation((name) => {
      return name === 'nonexistent' ? null : new MockSheet(name);
    }),
    insertSheet: jest.fn().mockImplementation((name) => new MockSheet(name)),
  }),
};

global.UrlFetchApp = global.UrlFetchApp || {
  fetch: jest.fn(),
};

global.PropertiesService = global.PropertiesService || {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn(),
    setProperty: jest.fn(),
    setProperties: jest.fn(),
    getProperties: jest.fn().mockReturnValue({}),
  }),
};

global.Logger = global.Logger || {
  log: jest.fn(),
};

// テスト実行前にモックをリセット
beforeEach(() => {
  jest.clearAllMocks();
});

// モッククラス定義
class MockSheet {
  constructor(name) {
    this.name = name;
    this.data = {};
  }

  getName() {
    return this.name;
  }

  getRange() {
    return {
      setValue: jest.fn(),
      getValue: jest.fn(),
      setValues: jest.fn(),
      getValues: jest.fn().mockReturnValue([[]]),
    };
  }
}

// テストヘルパー関数
global.setupTestData = (options = {}) => {
  // テスト用データの設定
};

// MockSheetクラスをグローバルに公開
global.MockSheet = MockSheet;

/**
 * テスト環境のセットアップヘルパー
 */

// 設定キャッシュ（初期化は一度だけ）
let setupComplete = false;

/**
 * テストデータをモジュールの先頭で定義
 */
const mockHighSchoolPlayers = [
  { school: '東京高校', name: '山田太郎', filingDate: '2024/03/01' },
];

const mockUniversityPlayers = [
  {
    school: '東京大学',
    name: '田中一郎',
    position: '投手',
    filingDate: '2024/03/01',
  },
  {
    school: '京都大学',
    name: '高橋二郎',
    position: '内野手',
    filingDate: '2024/03/01',
  },
];

/**
 * テスト環境のセットアップ
 * @param {Object} options - 設定オプション
 * @param {boolean} options.highSchoolData - 高校生データをモック
 * @param {boolean} options.universityData - 大学生データをモック
 */
function setupTestEnvironment(options = {}) {
  // GASオブジェクトの初期化
  if (typeof initMockGasEnvironment === 'function') {
    initMockGasEnvironment();
  }

  // 一度だけ実行する重い処理
  if (!setupComplete) {
    setupComplete = true;
  }

  // GASのグローバルオブジェクトを初期化
  global.SpreadsheetApp = {
    openById: jest.fn().mockReturnValue({
      getSheetByName: jest.fn().mockReturnValue({
        getRange: jest.fn().mockReturnValue({
          setValue: jest.fn(),
          getValue: jest.fn(),
        }),
      }),
      insertSheet: jest.fn(),
    }),
  };

  // 特定テスト向けのモック設定
  if (options.highSchoolData) {
    global.UrlFetchApp.fetch.mockImplementation((url) => {
      return {
        getContentText: jest.fn().mockReturnValue(`
          <html>
            <table class="draft-table">
              <tr><td>東京高校</td><td>山田太郎</td><td>2024/03/01</td></tr>
              <tr><td>大阪高校</td><td>佐藤次郎</td><td>2024/03/01</td></tr>
            </table>
          </html>
        `),
        getResponseCode: jest.fn().mockReturnValue(200),
      };
    });
  }

  if (options.universityData) {
    // 大学生データ用のURLレスポンス設定
    mockUrlResponse('https://test-university-url', mockUniversityHtml);
    setupUniversityDataMocks();
  }

  // キャッシュ動作のカスタマイズ
  if (options.cachedData) {
    // キャッシュヒットをシミュレート
    const cachedUrl = options.cachedUrl || 'http://example.com/high-school';
    const mockCache = {
      get: jest.fn().mockImplementation((key) => {
        if (key === cachedUrl) return options.cachedData;
        return null;
      }),
      put: jest.fn(),
      remove: jest.fn(),
      removeAll: jest.fn(),
    };

    // CacheService のモックを一貫して定義
    global.CacheService = {
      getScriptCache: jest.fn().mockReturnValue(mockCache),
    };

    // グローバルキャッシュオブジェクトも同じ実装に
    global.cache = mockCache;
  }

  // PropertiesServiceのモック強化
  global.PropertiesService = {
    getScriptProperties: jest.fn().mockReturnValue({
      getProperty: jest.fn().mockImplementation((key) => {
        const testConfig = {
          HIGH_SCHOOL_URL: 'http://example.com/high-school',
          UNIVERSITY_URL: 'http://example.com/university',
          SHEET_ID: 'test-sheet-id',
          HIGH_SCHOOL_PLAYERS_FLG: '1',
          UNIVERSITY_PLAYERS_FLG: '1',
        };
        return testConfig[key] || null;
      }),
      setProperty: jest.fn(),
      setProperties: jest.fn(),
      getProperties: jest.fn().mockReturnValue({}),
    }),
  };

  return true;
}

/**
 * URLFetchAppのレスポンスをモック化
 */
function mockUrlFetchResponse(url, htmlContent) {
  global.UrlFetchApp.fetch.mockImplementation((targetUrl) => {
    return {
      getResponseCode: jest.fn().mockReturnValue(200),
      getContentText: jest.fn().mockReturnValue(htmlContent),
    };
  });
}

// プロセシング関数のモック
global.processPlayerData = function (html, type) {
  return [
    {
      school: '東京大学',
      name: '田中一郎',
      position: '投手',
      filingDate: '2024/03/01',
    },
    {
      school: '京都大学',
      name: '高橋二郎',
      position: '内野手',
      filingDate: '2024/03/01',
    },
  ];
};

// スプレッドシート書き込み関数のモック
global.writePlayersToSheet = function () {
  return 2; // 2人のデータ処理したと返す
};

// 基本的なGASの設定をモック（setupTestEnvironmentに結合してもよい）
function setupBasicGasMocks() {
  // 既にsetupTestEnvironmentで実装されている場合は不要
  return setupTestEnvironment();
}

// 非公開ヘルパー関数
function setupHighSchoolDataMocks() {
  global.processPlayerData = jest.fn().mockImplementation((html, type) => {
    if (type === 'highschool') return mockHighSchoolPlayers;
    return [];
  });
}

function setupUniversityDataMocks() {
  global.processPlayerData = jest.fn().mockImplementation((html, type) => {
    if (type === 'university') return mockUniversityPlayers;
    return [];
  });
}

/**
 * テスト特化ヘルパー（個別テストで必要に応じて使用）
 */

// モック用のコンテンツを定義
const mockHighSchoolHtml = `
<!DOCTYPE html>
<html>
<body>
  <div class="content">
    <table class="draft-table">
      <tbody>
        <tr>
          <th>学校名</th>
          <th>選手名</th>
          <th>提出日</th>
        </tr>
        <tr>
          <td>東京高校</td>
          <td>山田太郎</td>
          <td>2025/03/01</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
`;

const mockUniversityHtml = `
<!DOCTYPE html>
<html>
<body>
  <div class="content">
    <table class="draft-table">
      <tbody>
        <tr>
          <th>大学名</th>
          <th>選手名</th>
          <th>ポジション</th>
          <th>提出日</th>
        </tr>
        <tr>
          <td>東京大学</td>
          <td>田中一郎</td>
          <td>投手</td>
          <td>2025/03/01</td>
        </tr>
        <tr>
          <td>京都大学</td>
          <td>高橋二郎</td>
          <td>内野手</td>
          <td>2025/03/01</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
`;

/**
 * 特定のURL用のHTMLレスポンスをモック
 */
function mockUrlResponse(url, htmlContent) {
  global.UrlFetchApp.fetch.mockImplementation((targetUrl) => {
    if (targetUrl === url || !url) {
      return {
        getContentText: jest.fn().mockReturnValue(htmlContent),
        getResponseCode: jest.fn().mockReturnValue(200),
      };
    }
    return {
      getContentText: jest
        .fn()
        .mockReturnValue('<html><body>Not Found</body></html>'),
      getResponseCode: jest.fn().mockReturnValue(404),
    };
  });
}

/**
 * 高校生データ処理のモック
 */
function setupHighSchoolPlayerMocks() {
  return [
    {
      prefecture: '東京都',
      school: '東京高校',
      name: '山田太郎',
      filingDate: '2025/03/01',
    },
  ];
}

/**
 * 大学生データ処理のモック
 */
function setupUniversityPlayerMocks() {
  return [
    {
      school: '東京大学',
      name: '田中一郎',
      position: '投手',
      filingDate: '2025/03/01',
    },
    {
      school: '京都大学',
      name: '高橋二郎',
      position: '内野手',
      filingDate: '2025/03/01',
    },
  ];
}

/**
 * テスト環境をリセットする
 * テスト間の干渉を防ぐためのヘルパー関数
 */
function resetTestEnvironment() {
  // モジュールキャッシュのリセット
  jest.resetModules();
  
  // モック関数のリセット
  jest.clearAllMocks();
  
  // グローバル変数の復元
  if (global.cacheUtils) {
    global.cacheUtils.clearCache();
  }
  
  // モックオブジェクトの再初期化
  initMockGasEnvironment();
  
  // コンソール出力のモック
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  
  return true;
}

/**
 * モジュールがエクスポートする全関数のモックを作成
 * @param {string} modulePath - モックするモジュールのパス
 * @param {Object} customMocks - カスタムモック実装（省略可）
 * @return {Object} モックオブジェクト
 */
function mockEntireModule(modulePath, customMocks = {}) {
  // 実際のモジュールをロード
  let realModule;
  try {
    realModule = require(modulePath);
  } catch (err) {
    console.error(`モジュール ${modulePath} のロードに失敗: ${err.message}`);
    return {};
  }
  
  // モックオブジェクトの作成
  const mockModule = {};
  
  // 各関数をモック化
  Object.keys(realModule).forEach(key => {
    if (typeof realModule[key] === 'function') {
      if (customMocks[key]) {
        // カスタムモックが提供されている場合はそれを使用
        mockModule[key] = customMocks[key];
      } else {
        // 標準モック関数を作成
        mockModule[key] = jest.fn().mockName(key);
      }
    } else {
      // 関数以外の値をそのままコピー
      mockModule[key] = realModule[key];
    }
  });
  
  return mockModule;
}

// AWS Lambda テストヘルパー関数
global.createLambdaEvent = function(type = 'api-gateway', options = {}) {
  const baseEvent = {
    httpMethod: options.httpMethod || 'GET',
    path: options.path || '/',
    headers: options.headers || {},
    queryStringParameters: options.queryStringParameters || null,
    body: options.body || null,
    requestContext: {
      requestId: 'test-request-id',
      accountId: '123456789012',
      apiId: 'test-api-id',
      domainName: 'test.execute-api.ap-northeast-1.amazonaws.com',
      stage: 'test'
    }
  };

  if (type === 'eventbridge') {
    return {
      source: 'aws.events',
      'detail-type': 'Scheduled Event',
      detail: options.detail || {}
    };
  }

  return baseEvent;
};

global.createLambdaContext = function(functionName = 'test-function') {
  return {
    functionName,
    functionVersion: '$LATEST',
    invokedFunctionArn: `arn:aws:lambda:ap-northeast-1:123456789012:function:${functionName}`,
    memoryLimitInMB: '256',
    awsRequestId: 'test-request-id',
    logGroupName: `/aws/lambda/${functionName}`,
    logStreamName: '2024/01/01/[$LATEST]test',
    getRemainingTimeInMillis: () => 30000,
    callbackWaitsForEmptyEventLoop: true
  };
};

// AWS テストヘルパー
global.awsTestHelpers = {
  createApiResponse: function(data, statusCode = 200) {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: statusCode === 200,
        data
      })
    };
  },
  createPlayerData: function(count = 5) {
    const players = [];
    for (let i = 1; i <= count; i++) {
      players.push({
        id: `player-${i}`,
        name: `テスト選手${i}`,
        school: `テスト高校${i}`,
        type: 'highschool',
        year: 2024
      });
    }
    return players;
  }
};

// エクスポート
module.exports = {
  setupTestEnvironment,
  mockUrlFetchResponse,
  setupBasicGasMocks,
  mockHighSchoolPlayers,
  mockUniversityPlayers,
  mockUrlResponse,
  mockHighSchoolHtml,
  mockUniversityHtml,
  highSchoolPlayers: setupHighSchoolPlayerMocks(),
  universityPlayers: setupUniversityPlayerMocks(),
  initMockGasEnvironment,
  resetTestEnvironment,
  mockEntireModule
};
