/**
 * ロガー関数のモック実装
 */

const createMockLogger = () => {
  // モックロガー関数
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  
  // ヘルパーメソッド
  const helper = {
    setupGlobal: () => {
      global.debug = mockLogger.debug;
      global.info = mockLogger.info;
      global.warn = mockLogger.warn;
      global.error = mockLogger.error;
    },
    resetMocks: () => {
      Object.values(mockLogger).forEach(fn => fn.mockClear());
    },
    removeGlobal: () => {
      delete global.debug;
      delete global.info;
      delete global.warn;
      delete global.error;
    }
  };
  
  return { mockLogger, helper };
};

module.exports = createMockLogger;
