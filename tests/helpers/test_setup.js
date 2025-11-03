/**
 * テスト用の共通セットアップ関数
 */

const createMockCacheService = require('../mocks/cache_service');
const createMockSpreadsheetApp = require('../mocks/spreadsheet_app');
const createMockUrlFetchApp = require('../mocks/url_fetch_app');
const createMockLogger = require('../mocks/logger');

/**
 * テスト環境の基本的なモックをセットアップする
 * @param {Object} options - セットアップオプション
 * @returns {Object} - モックオブジェクトとヘルパーを含むオブジェクト
 */
function setupTestEnvironment(options = {}) {
  // デフォルトオプション
  const defaultOptions = {
    setupCache: true,
    setupSpreadsheet: true,
    setupUrlFetch: true,
    setupLogger: true,
    setupGlobalConfig: true,
    initialConfig: {
      'SHEET_ID': 'test-sheet-id',
      'HIGH_SCHOOL_URL': 'http://example.com/high-school',
      'UNIVERSITY_URL': 'http://example.com/university',
      'HIGH_SCHOOL_NAME': 'A',
      'HIGH_SCHOOL_PLAYER_NAME': 'B',
      'HIGH_SCHOOL_FILING_DATE': 'C',
      'UNIVERSITY_NAME': 'E',
      'UNIVERSITY_PLAYER_NAME': 'F',
      'UNIVERSITY_FILING_DATE': 'G'
    }
  };
  
  // オプションのマージ
  const mergedOptions = { ...defaultOptions, ...options };
  
  // 結果オブジェクト
  const result = {
    mocks: {},
    helpers: {}
  };
  
  // CacheServiceのセットアップ
  if (mergedOptions.setupCache) {
    const { mockCacheService, mockScriptCache, helper } = createMockCacheService();
    global.CacheService = mockCacheService;
    result.mocks.cacheService = mockCacheService;
    result.mocks.scriptCache = mockScriptCache;
    result.helpers.cache = helper;
  }
  
  // SpreadsheetAppのセットアップ
  if (mergedOptions.setupSpreadsheet) {
    const { mockSpreadsheetApp, helper } = createMockSpreadsheetApp();
    global.SpreadsheetApp = mockSpreadsheetApp;
    result.mocks.spreadsheetApp = mockSpreadsheetApp;
    result.helpers.spreadsheet = helper;
  }
  
  // UrlFetchAppのセットアップ
  if (mergedOptions.setupUrlFetch) {
    const { mockUrlFetchApp, helper } = createMockUrlFetchApp();
    global.UrlFetchApp = mockUrlFetchApp;
    result.mocks.urlFetchApp = mockUrlFetchApp;
    result.helpers.urlFetch = helper;
  }
  
  // ロガーのセットアップ
  if (mergedOptions.setupLogger) {
    const { mockLogger, helper } = createMockLogger();
    helper.setupGlobal();
    result.mocks.logger = mockLogger;
    result.helpers.logger = helper;
  }
  
  // グローバル設定のセットアップ
  if (mergedOptions.setupGlobalConfig) {
    // PropertiesServiceのモック
    const properties = { ...mergedOptions.initialConfig };
    global.PropertiesService = {
      getScriptProperties: jest.fn().mockReturnValue({
        getProperty: jest.fn().mockImplementation(key => properties[key] || null),
        setProperty: jest.fn().mockImplementation((key, value) => {
          properties[key] = value;
        }),
        setProperties: jest.fn().mockImplementation(props => {
          Object.assign(properties, props);
        })
      })
    };
    
    // getConfigのグローバル関数をモック
    global.getConfig = jest.fn().mockImplementation(key => {
      return global.PropertiesService.getScriptProperties().getProperty(key);
    });
    
    result.mocks.propertiesService = global.PropertiesService;
    result.helpers.config = {
      setConfig: (key, value) => {
        properties[key] = value;
      },
      getAllConfig: () => ({ ...properties })
    };
  }
  
  // getCachedOrComputeの実装
  global.getCachedOrCompute = async (key, fn) => {
    const cache = global.CacheService.getScriptCache();
    const cachedData = cache.get(key);
    if (cachedData) return cachedData;
    
    const result = await fn();
    cache.put(key, result);
    return result;
  };
  
  // 全てのモックをリセットする関数
  result.resetAllMocks = () => {
    Object.values(result.helpers).forEach(helper => {
      if (helper && typeof helper.resetMocks === 'function') {
        helper.resetMocks();
      }
    });
    
    jest.clearAllMocks();
  };
  
  return result;
}

module.exports = setupTestEnvironment;
