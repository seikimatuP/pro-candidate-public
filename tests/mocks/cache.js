/**
 * CacheServiceのモックとユーティリティ
 */

// インメモリキャッシュ
const mockCache = new Map();

// CacheServiceモックの初期化
function initMockCacheService() {
  const scriptCache = {
    get: jest.fn().mockImplementation((key) => mockCache.get(key) || null),
    put: jest.fn().mockImplementation((key, value, expiration) => {
      mockCache.set(key, value);
    }),
    getAll: jest.fn().mockImplementation((keys) => {
      const result = {};
      keys.forEach((key) => {
        const value = mockCache.get(key);
        if (value) result[key] = value;
      });
      return result;
    }),
    remove: jest.fn().mockImplementation((key) => mockCache.delete(key)),
    removeAll: jest.fn().mockImplementation(() => mockCache.clear()),
  };

  global.CacheService = {
    getScriptCache: jest.fn().mockReturnValue(scriptCache),
  };

  // 便利なエクスポート関数
  return {
    setMockData: (key, value) => mockCache.set(key, value),
    getMockData: (key) => mockCache.get(key),
    clearCache: () => mockCache.clear(),
  };
}

module.exports = { initMockCacheService };
