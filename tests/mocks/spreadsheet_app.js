/**
 * SpreadsheetAppのモック実装
 */

const createMockSpreadsheetApp = () => {
  // シートデータを保持する内部オブジェクト
  const sheets = {};
  
  // Rangeのモック実装
  const createMockRange = (initialValue = '') => {
    let rangeValue = initialValue;
    
    return {
      getValue: jest.fn().mockImplementation(() => rangeValue),
      setValue: jest.fn().mockImplementation(value => {
        rangeValue = value;
        return this;
      }),
      setValues: jest.fn(),
      getValues: jest.fn().mockReturnValue([[rangeValue]]),
      setBackground: jest.fn().mockReturnThis(),
      setFontWeight: jest.fn().mockReturnThis(),
    };
  };
  
  // Sheetのモック実装
  const createMockSheet = (name) => {
    const ranges = {};
    let lastRow = 1;
    let charts = [];
    
    return {
      name,
      ranges,
      charts,
      getRange: jest.fn().mockImplementation((row, col, numRows, numCols) => {
        const rangeKey = `${row}_${col}_${numRows || 1}_${numCols || 1}`;
        if (!ranges[rangeKey]) {
          ranges[rangeKey] = createMockRange();
        }
        return ranges[rangeKey];
      }),
      getLastRow: jest.fn().mockReturnValue(lastRow),
      setLastRow: (value) => { lastRow = value; },
      appendRow: jest.fn(),
      setName: jest.fn(),
      setFrozenRows: jest.fn(),
      setColumnWidth: jest.fn(),
      deleteRows: jest.fn(),
      newChart: jest.fn().mockReturnValue({
        setPosition: jest.fn().mockReturnThis(),
        setOption: jest.fn().mockReturnThis(),
        setChartType: jest.fn().mockReturnThis(),
        setNumHeaders: jest.fn().mockReturnThis(),
        addRange: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      }),
      insertChart: jest.fn().mockImplementation(chart => {
        charts.push(chart);
        return this;
      }),
      copyTo: jest.fn().mockImplementation(() => {
        return createMockSheet(`Copy of ${name}`);
      })
    };
  };
  
  // Spreadsheetのモック実装
  const createMockSpreadsheet = (id) => {
    return {
      id,
      sheets,
      getSheetByName: jest.fn().mockImplementation(name => sheets[name] || null),
      insertSheet: jest.fn().mockImplementation(name => {
        const sheet = createMockSheet(name);
        sheets[name] = sheet;
        return sheet;
      }),
    };
  };
  
  // SpreadsheetAppのモック
  const mockSpreadsheetApp = {
    openById: jest.fn().mockImplementation(id => {
      return createMockSpreadsheet(id);
    }),
  };
  
  // ヘルパーメソッド
  const helper = {
    addSheet: (name, sheet = null) => {
      sheets[name] = sheet || createMockSheet(name);
      return sheets[name];
    },
    getSheets: () => ({ ...sheets }),
    resetMocks: () => {
      Object.keys(sheets).forEach(key => delete sheets[key]);
      mockSpreadsheetApp.openById.mockClear();
    }
  };
  
  return { mockSpreadsheetApp, helper };
};

module.exports = createMockSpreadsheetApp;
