/**
 * UUID モジュールのモック
 * ESM/CJS互換性問題を回避するため
 */

// v4 UUID生成の簡易実装
function v4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// v7 UUID生成の簡易実装（タイムスタンプベース）
function v7() {
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random = Math.random().toString(16).substring(2, 18);
  return `${timestamp.substring(0, 8)}-${timestamp.substring(8, 12)}-7${random.substring(0, 3)}-${random.substring(3, 7)}-${random.substring(7, 19)}`;
}

// その他のUUID関数
const v1 = v4; // 簡略化
const v3 = v4; // 簡略化
const v5 = v4; // 簡略化

// validate関数
function validate(uuid) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

// parse関数
function parse(uuid) {
  if (!validate(uuid)) {
    throw new Error('Invalid UUID');
  }
  return uuid.replace(/-/g, '').match(/.{2}/g).map(byte => parseInt(byte, 16));
}

// stringify関数
function stringify(bytes) {
  const hex = bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

// NIL UUID
const NIL = '00000000-0000-0000-0000-000000000000';

// MAX UUID
const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

module.exports = {
  v1,
  v3,
  v4,
  v5,
  v7,
  validate,
  parse,
  stringify,
  NIL,
  MAX
};

// ESMエクスポートもサポート
module.exports.default = module.exports;