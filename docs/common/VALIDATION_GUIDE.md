# 入力検証ガイド

このドキュメントでは、プロジェクト内で一貫した入力検証を行うための方法を説明します。

## 基本的な使用方法

### 直接バリデーターを使用する方法

```typescript
import { validator } from '../scripts/validator';

// 文字列の検証
try {
  const validName = validator.string(name, {
    required: true,
    minLength: 3,
    maxLength: 50,
  });
  // 検証通過、処理を続行
} catch (error) {
  // 検証エラーの処理
  console.error('名前の検証に失敗:', error.message);
}

// オブジェクトの検証
try {
  const validConfig = validator.object(config, {
    required: true,
    schema: {
      apiKey: v => validator.string(v, { required: true }),
      timeout: v => validator.number(v, { min: 100, max: 30000 }),
      endpoint: v => validator.url(v, true),
    },
  });
  // 検証済みのオブジェクトを使用
} catch (error) {
  // 検証エラーを処理
  const validationError = validator.handleValidationError(error, 'config');
  console.error('設定の検証に失敗:', validationError.message);
}
```

### 簡易検証ユーティリティの使用

```typescript
import { validate } from '../scripts/validation_utils';

// 文字列検証（エラーをスローする代わりにnullを返す）
const validName = validate.requiredString('name')(inputName);
if (validName === null) {
  return; // または適切なエラー処理
}

// URL検証
const validUrl = validate.url('endpoint')(inputUrl);
if (!validUrl) {
  // エラー処理
}

// 年度検証
const validYear = validate.year('fiscalYear', 2020, 2030)(inputYear);
if (!validYear) {
  // エラー処理
}
```

## 利用可能な検証メソッド

| メソッド    | 説明               | 引数                                                            |
| ----------- | ------------------ | --------------------------------------------------------------- |
| `string`    | 文字列検証         | `value, { required, minLength, maxLength, pattern, allowHtml }` |
| `number`    | 数値検証           | `value, { required, min, max, integer }`                        |
| `url`       | URL 検証           | `value, required`                                               |
| `email`     | メールアドレス検証 | `value, required`                                               |
| `year`      | 年度検証           | `value, { required, min, max }`                                 |
| `array`     | 配列検証           | `value, { required, minLength, maxLength, validator }`          |
| `object`    | オブジェクト検証   | `value, { required, schema, allowExtra }`                       |
| `date`      | 日付検証           | `value, { required, min, max, format }`                         |
| `path`      | ファイルパス検証   | `value, { required, allowedExtensions }`                        |
| `json`      | JSON 検証          | `value, { required, schema }`                                   |
| `ipAddress` | IP アドレス検証    | `value, required`                                               |

## サニタイズメソッド

| メソッド       | 説明                                               |
| -------------- | -------------------------------------------------- |
| `sanitize`     | 一般的な文字列のサニタイズ（特殊文字のエスケープ） |
| `sanitizeHtml` | HTML のサニタイズ（危険なタグや属性の除去）        |
| `sanitizeSql`  | SQL 注入対策のサニタイズ                           |

## 複合検証の例

複数の検証を組み合わせて使用することができます：

```typescript
import { validate } from '../scripts/validation_utils';

// 複合検証の例 - 文字列→数値→範囲チェック
const validateYear = validate.compose(
  validate.requiredString('入力年'),
  str => parseInt(str, 10),
  validate.number('年度', 2000, 2050)
);

// 使用例
const validYear = validateYear(inputYear);
if (validYear === null) {
  // エラー処理
}
```

## プロジェクト固有の検証例

### 選手データの検証

```typescript
// 選手データのスキーマ検証
const validatePlayerData = playerData => {
  return validator.object(playerData, {
    required: true,
    schema: {
      id: v => validator.playerId(v, true),
      name: v => validator.string(v, { required: true, maxLength: 100 }),
      age: v => validator.number(v, { min: 15, max: 50 }),
      team: v => validator.string(v, { required: true }),
      position: v => validator.string(v, { required: true }),
      stats: v =>
        validator.object(v, {
          schema: {
            batting: v => validator.number(v, { min: 0, max: 1 }),
            homeRuns: v => validator.number(v, { min: 0 }),
            era: v => validator.number(v, { min: 0 }),
          },
        }),
    },
  });
};
```

## エラーハンドリングのベストプラクティス

エラー処理を一元化し、ユーザーフレンドリーなエラーメッセージを提供することが重要です：

```typescript
// エラーを一元的に処理する関数
function handleValidationErrors(error, action) {
  if (error instanceof Error) {
    // バリデーションエラーの場合
    const validationError = validator.handleValidationError(error);

    // エラーログを記録
    error(`入力検証エラー: ${action}`, validationError);

    // ユーザー向けエラーメッセージ
    return {
      success: false,
      message: validationError.message,
      field: validationError.field,
    };
  }

  // その他のエラーの場合
  error(`予期しないエラー: ${action}`, { error });
  return {
    success: false,
    message: '処理中にエラーが発生しました。',
  };
}
```

## ベストプラクティス

1. **早期検証**: データを処理する前に、できるだけ早い段階で検証を行う
2. **一貫性**: 同じタイプのデータには同じ検証ルールを適用
3. **エラーハンドリング**: 検証エラーは適切に処理し、意味のあるエラーメッセージを提供
4. **標準化**: カスタム検証ロジックの代わりに、validator.ts の機能を使用
5. **サニタイズ**: 外部から受け取ったデータは適切にサニタイズする
