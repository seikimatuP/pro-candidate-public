/**
 * CacheServiceのモック実装
 */

const createMockCacheService = (initialCache = {}) => {
  // キャッシュデータを保持する内部オブジェクト
  let cacheData = { ...initialCache };
  
  // スクリプトキャッシュのモック実装
  const mockScriptCache = {
    get: jest.fn(key => cacheData[key] || null),
    
    put: jest.fn((key, value, expiration = 600) => {
      cacheData[key] = value;
      return null;
    }),
    
    putAll: jest.fn((values, expiration = 600) => {
      Object.assign(cacheData, values);
      return null;
    }),
    
    remove: jest.fn(key => {
      delete cacheData[key];
      return null;
    }),
    
    removeAll: jest.fn(keys => {
      if (Array.isArray(keys)) {
        keys.forEach(key => delete cacheData[key]);
      } else {
        cacheData = {};
      }
      return null;
    })
  };
  
  // キャッシュデータを直接取得・設定するヘルパーメソッド（テスト用）
  const helper = {
    getAllData: () => ({ ...cacheData }),
    setData: (data) => { cacheData = { ...data }; },
    clear: () => { cacheData = {}; },
    resetMocks: () => {
      Object.values(mockScriptCache).forEach(fn => {
        if (typeof fn === 'function' && fn.mockClear) {
          fn.mockClear();
        }
      });
    }
  };
  
  // CacheServiceのモック
  const mockCacheService = {
    getScriptCache: jest.fn().mockReturnValue(mockScriptCache)
  };
  
  return { mockCacheService, mockScriptCache, helper };
};

module.exports = createMockCacheService;
