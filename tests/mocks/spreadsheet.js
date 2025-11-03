const { player_list_update } = require('../../src/main');
const { setupConfig } = require('../../src/core/legacy_utils');
const {
  MockRange,
  MockSheet,
  MockChart,
  MockSpreadsheet,
} = require('../mocks/spreadsheet');

describe('Data Flow Integration', () => {
  beforeAll(() => {
    // テスト環境のセットアップ
    setupTestEnvironment();
  });

  test('player_list_update should process data end-to-end', () => {
    // テスト実施
    const result = player_list_update();

    // 検証
    expect(result).toBe(true);
    // スプレッドシートへの書き込みを検証
    const sheet = global.mockSpreadsheet.getSheetByName('2024');
    expect(sheet).not.toBeNull();
    // 他の検証...
  });
});
