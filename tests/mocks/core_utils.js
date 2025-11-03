/**
 * core_utilsモジュールのモック
 */
const mockCoreUtils = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  getConfig: jest.fn().mockReturnValue(null),
  setConfig: jest.fn(),
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  },
  getCurrentLogLevel: jest.fn().mockReturnValue(1), // INFO
};

module.exports = mockCoreUtils;
