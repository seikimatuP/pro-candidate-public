/**
 * config_managerモジュールのモック
 */
const { Validator } = require('./validator');
const mockCoreUtils = require('./core_utils');

const mockConfigManager = {
  // core_utilsからのメソッド参照
  ...mockCoreUtils,
  
  // config_manager固有のメソッド
  setupConfig: jest.fn(),
  initializeApp: jest.fn(),
  
  // validatorモジュールを含める
  Validator
};

module.exports = mockConfigManager;
