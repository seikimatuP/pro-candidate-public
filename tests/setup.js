/**
 * グローバルテストセットアップ (Jest実行時に自動的にロードされる)
 */

// GAS環境のグローバルモック
global.SpreadsheetApp = {
  openById: jest.fn().mockImplementation((id) => {
    return {
      getSheetByName: jest.fn().mockImplementation((name) => {
        return name === 'nonexistent'
          ? null
          : {
              getName: jest.fn().mockReturnValue(name),
              getRange: jest.fn().mockReturnValue({
                setValue: jest.fn(),
                getValue: jest.fn(),
                setValues: jest.fn(),
                getValues: jest.fn().mockReturnValue([[]]),
              }),
            };
      }),
      insertSheet: jest.fn().mockImplementation((name) => ({
        getName: jest.fn().mockReturnValue(name),
        getRange: jest.fn().mockReturnValue({
          setValue: jest.fn(),
          getValue: jest.fn(),
          setValues: jest.fn(),
          getValues: jest.fn().mockReturnValue([[]]),
        }),
        insertChart: jest.fn(),
      })),
    };
  }),
  getActiveSpreadsheet: jest.fn().mockReturnValue({
    getSheetByName: jest.fn(),
  }),
};

global.UrlFetchApp = {
  fetch: jest.fn().mockReturnValue({
    getContentText: jest.fn().mockReturnValue('<html><body>Test</body></html>'),
    getResponseCode: jest.fn().mockReturnValue(200),
  }),
};

global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn().mockImplementation((key) => {
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

global.Logger = {
  log: jest.fn(),
};

// テスト間の状態をクリア
beforeEach(() => {
  jest.clearAllMocks();
});

// エラーログ機能
const errorLogs = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  errorLogs.push(args.join(' '));
  if (process.env.CI !== 'true') originalConsoleError(...args);
};

// グローバルに共有するユーティリティ
global.getErrorLogs = () => errorLogs;
global.clearErrorLogs = () => (errorLogs.length = 0);

// 必要なグローバル変数の定義
global.sheet_id = 'test-sheet-id';
global.high_school_url = 'http://example.com/high-school';
global.university_url = 'http://example.com/university';
