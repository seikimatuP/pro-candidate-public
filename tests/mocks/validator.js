/**
 * validatorモジュールのモック
 */
const ValidationPatterns = {
  YEAR: /^\d{4}$/,
  URL: /^https?:\/\/.+/,
  EMAIL: /^[^@]+@[^@]+$/,
  // その他のパターン
};

const ValidationErrorType = {
  REQUIRED: 'required',
  TYPE_MISMATCH: 'type_mismatch',
  FORMAT: 'format',
  RANGE: 'range',
  PATTERN: 'pattern',
  CONTENT: 'content',
  SECURITY: 'security',
  OTHER: 'other'
};

const Validator = {
  isUrlSafe: jest.fn().mockReturnValue(true),
  isValidYear: jest.fn().mockReturnValue(true),
  isValidEmail: jest.fn().mockReturnValue(true),
  isValidSheetName: jest.fn().mockReturnValue(true),
  isSafeHtml: jest.fn().mockReturnValue(true),
  isValidInteger: jest.fn().mockReturnValue(true),
  isStringSafe: jest.fn().mockReturnValue(true),
  sanitize: jest.fn(value => value),
  sanitizeHtml: jest.fn(html => html),
  validate: jest.fn().mockReturnValue(true),
  
  // 新しいTS版メソッド
  required: jest.fn().mockReturnValue(null),
  type: jest.fn().mockReturnValue(null),
  string: jest.fn().mockReturnValue(null),
  url: jest.fn().mockReturnValue(null),
  year: jest.fn().mockReturnValue(null),
  email: jest.fn().mockReturnValue(null),
  number: jest.fn().mockReturnValue(null),
  array: jest.fn().mockReturnValue(null),
  object: jest.fn().mockReturnValue(null),
  handleValidationError: jest.fn().mockReturnValue(true)
};

module.exports = {
  ValidationPatterns,
  ValidationErrorType,
  Validator
};
