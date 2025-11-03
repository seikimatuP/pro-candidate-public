/**
 * エンドツーエンドテスト用のセットアップスクリプト
 * GAS環境により近い形で動作するように設計されたモックと環境設定を提供
 */

const { setupRealisticGasMock } = require('./gas_environment');
const fs = require('fs');
const path = require('path');

/**
 * エンドツーエンドテスト環境をセットアップ
 * @param {Object} options - セットアップオプション
 * @param {boolean} options.useRealHtmlResponses - 実際のHTMLレスポンスを使用するか
 * @param {boolean} options.persistState - テスト間で状態を保持するか
 * @param {boolean} options.logToConsole - コンソールに詳細ログを出力するか
 * @returns {Object} テスト環境オブジェクト
 */
function setupE2EEnvironment(options = {}) {
  const {
    useRealHtmlResponses = true,
    persistState = false,
    logToConsole = true,
    mockDate = null,
  } = options;

  // デフォルトのファイル位置
  const fixturesDir = path.join(__dirname, '../fixtures');
  const highSchoolHtmlPath = path.join(fixturesDir, 'high_school_sample.html');
  const universityHtmlPath = path.join(fixturesDir, 'university_sample.html');

  // 実際のHTMLレスポンスが指定された場合に読み込む
  let htmlResponses = {};
  if (useRealHtmlResponses) {
    try {
      if (fs.existsSync(highSchoolHtmlPath)) {
        htmlResponses.highSchool = fs.readFileSync(highSchoolHtmlPath, 'utf8');
      } else {
        console.warn(`警告: 高校生データのHTMLファイルが見つかりません: ${highSchoolHtmlPath}`);
        htmlResponses.highSchool = '<html><body>高校生テストデータ</body></html>';
      }

      if (fs.existsSync(universityHtmlPath)) {
        htmlResponses.university = fs.readFileSync(universityHtmlPath, 'utf8');
      } else {
        console.warn(`警告: 大学生データのHTMLファイルが見つかりません: ${universityHtmlPath}`);
        htmlResponses.university = '<html><body>大学生テストデータ</body></html>';
      }
    } catch (err) {
      console.error(`HTMLレスポンスの読み込み中にエラーが発生しました: ${err.message}`);
      htmlResponses.highSchool = '<html><body>高校生テストデータ</body></html>';
      htmlResponses.university = '<html><body>大学生テストデータ</body></html>';
    }
  } else {
    // デフォルトのテストデータを使用
    htmlResponses.highSchool = '<html><body>高校生テストデータ</body></html>';
    htmlResponses.university = '<html><body>大学生テストデータ</body></html>';
  }

  // モックデータの状態を保持するオブジェクト
  const state = {
    spreadsheets: {},
    cache: {},
    properties: {},
    triggers: [],
    emails: [],
  };

  // GAS環境モックのセットアップ
  const gasMock = setupRealisticGasMock({
    state: persistState ? state : undefined,
    mockDate,
    htmlResponses,
  });

  // ロガーの設定
  if (logToConsole) {
    global.debug = jest.fn(console.debug);
    global.info = jest.fn(console.info);
    global.warn = jest.fn(console.warn);
    global.error = jest.fn(console.error);
  } else {
    global.debug = jest.fn();
    global.info = jest.fn();
    global.warn = jest.fn();
    global.error = jest.fn();
  }

  // テストのヘルパー関数
  const helpers = {
    // スプレッドシートの内容を検証
    verifySpreadsheetContent: (sheetId, sheetName, expectedValues) => {
      const sheet = gasMock.SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
      if (!sheet) {
        return { success: false, message: `シート "${sheetName}" が見つかりません` };
      }

      // シートの内容を取得
      const values = sheet.getDataRange().getValues();
      
      // 期待値と比較
      const matched = JSON.stringify(values) === JSON.stringify(expectedValues);
      return {
        success: matched,
        message: matched ? '内容が一致しました' : '内容が一致しません',
        actual: values,
        expected: expectedValues
      };
    },

    // 送信されたメールを検証
    verifyEmailSent: (toEmail, subjectPattern) => {
      const foundEmail = state.emails.find(email => 
        email.to === toEmail && 
        (subjectPattern ? email.subject.match(subjectPattern) : true)
      );
      
      return {
        success: !!foundEmail,
        message: foundEmail ? 'メールが送信されました' : 'メールが送信されていません',
        email: foundEmail
      };
    },

    // トリガーが設定されたか検証
    verifyTriggerCreated: (functionName) => {
      const trigger = state.triggers.find(t => t.functionName === functionName);
      return {
        success: !!trigger,
        message: trigger ? 'トリガーが作成されました' : 'トリガーが作成されていません',
        trigger
      };
    },

    // テスト状態のリセット
    resetState: () => {
      Object.keys(state).forEach(key => {
        if (Array.isArray(state[key])) {
          state[key] = [];
        } else {
          state[key] = {};
        }
      });
    },

    // スプレッドシートの状態を設定
    setSpreadsheetData: (sheetId, sheetName, values) => {
      if (!state.spreadsheets[sheetId]) {
        state.spreadsheets[sheetId] = {};
      }
      if (!state.spreadsheets[sheetId].sheets) {
        state.spreadsheets[sheetId].sheets = {};
      }
      state.spreadsheets[sheetId].sheets[sheetName] = { values };
    }
  };

  return {
    mock: gasMock,
    state,
    helpers,
    htmlResponses
  };
}

module.exports = {
  setupE2EEnvironment
};
