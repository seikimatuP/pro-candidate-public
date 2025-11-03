/**
 * UrlFetchAppのモック実装
 */

const createMockUrlFetchApp = () => {
  // URLごとのレスポンスを保持する内部オブジェクト
  const urlResponses = {};
  
  // モックレスポンスの設定
  const setMockResponse = (url, content, statusCode = 200) => {
    urlResponses[url] = {
      content,
      statusCode
    };
  };
  
  // UrlFetchAppのモック実装
  const mockUrlFetchApp = {
    fetch: jest.fn().mockImplementation((url, options = {}) => {
      // URLに対応するレスポンスが登録されているか確認
      if (urlResponses[url]) {
        const { content, statusCode } = urlResponses[url];
        return {
          getResponseCode: jest.fn().mockReturnValue(statusCode),
          getContentText: jest.fn().mockReturnValue(content),
          getAllHeaders: jest.fn().mockReturnValue({}),
        };
      }
      
      // 登録されていない場合はデフォルトレスポンス
      return {
        getResponseCode: jest.fn().mockReturnValue(404),
        getContentText: jest.fn().mockReturnValue('Not Found'),
        getAllHeaders: jest.fn().mockReturnValue({}),
      };
    })
  };
  
  // ヘルパーメソッド
  const helper = {
    setMockResponse,
    clearResponses: () => {
      Object.keys(urlResponses).forEach(key => delete urlResponses[key]);
    },
    resetMock: () => {
      mockUrlFetchApp.fetch.mockClear();
    }
  };
  
  return { mockUrlFetchApp, helper };
};

module.exports = createMockUrlFetchApp;
