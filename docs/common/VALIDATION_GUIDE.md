# 入力検証ガイド

このドキュメントでは、プロジェクト内で一貫した入力検証を行うための方法を説明します。

## 基本的な使用方法

### 直接バリデーターを使用する方法

実装は `src/features/validation/` にある。

- `src/features/validation/validator.ts` — 詳細な検証・サニタイズ（`validator` シングルトン）
- `src/features/validation/validation_utils.ts` — 真偽値を返す簡易チェック（`validationUtils` シングルトン）

```typescript
import { validator } from '../features/validation/validator';

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

例外を投げず真偽値を返す。条件分岐でそのまま使いたいときはこちら。

```typescript
import { validationUtils } from '../features/validation/validation_utils';

// 年度検証（4桁の数字文字列か）
if (!validationUtils.isValidYear(inputYear)) {
  return; // または適切なエラー処理
}

// URL検証（http/https のみ許可）
if (!validationUtils.isValidUrl(inputUrl)) {
  // エラー処理
}

// 範囲・長さの確認
if (!validationUtils.isInRange(count, 0, 1000)) {
  // エラー処理
}
if (!validationUtils.isValidLength(name, 1, 100)) {
  // エラー処理
}

// 入力のサニタイズ（XSS対策）
const safeName = validationUtils.sanitizeInput(rawName);
```

利用できるメソッド: `isValidYear` / `isValidUrl` / `isValidEmail` / `isValidSheetName` /
`sanitizeInput` / `validatePlayerData` / `isValidPosition` / `isValidDate` / `isInRange` /
`isValidLength`

## 利用可能な検証メソッド

| メソッド      | 説明                                          | 引数                                                            |
| ------------- | --------------------------------------------- | --------------------------------------------------------------- |
| `string`      | 文字列検証                                    | `value, { required, minLength, maxLength, pattern, allowHtml }` |
| `number`      | 数値検証                                      | `value, { required, min, max, integer }`                        |
| `url`         | URL 検証                                      | `value, required`                                               |
| `email`       | メールアドレス検証                            | `value, required`                                               |
| `year`        | 年度検証                                      | `value, { required, min, max }`                                 |
| `array`       | 配列検証                                      | `value, { required, minLength, maxLength, validator }`          |
| `object`      | オブジェクト検証                              | `value, { required, schema, allowExtra }`                       |
| `date`        | 日付検証                                      | `value, { required, min, max, format }`                         |
| `path`        | ファイルパス検証                              | `value, { required, allowedExtensions }`                        |
| `json`        | JSON 検証                                     | `value, { required, schema }`                                   |
| `ipAddress`   | IP アドレス検証                               | `value, required`                                               |
| `required`    | 必須チェック                                  | `value, fieldName`                                              |
| `postalCode`  | 郵便番号検証                                  | `value, required`                                               |
| `phoneNumber` | 電話番号検証                                  | `value, required`                                               |
| `playerId`    | 選手ID検証（`(PL\|HS\|UNI)-YYYY-NNNNN` 形式） | `value, required`                                               |

## サニタイズメソッド

| メソッド       | 説明                                               |
| -------------- | -------------------------------------------------- |
| `sanitize`     | 一般的な文字列のサニタイズ（特殊文字のエスケープ） |
| `sanitizeHtml` | HTML のサニタイズ（危険なタグや属性の除去）        |
| `sanitizeSql`  | SQL 注入対策のサニタイズ                           |

## 複合検証の例

複数の検証を組み合わせる場合は、`validator` の各メソッドを順に通す：

```typescript
import { validator } from '../features/validation/validator';

// 文字列→数値→範囲チェック
function validateYear(input: unknown): number {
  const yearStr = validator.string(input, { required: true, pattern: /^\d{4}$/ });
  return validator.number(parseInt(yearStr, 10), {
    required: true,
    integer: true,
    min: 2000,
    max: 2050,
  });
}

// 使用例（検証失敗時は例外が飛ぶ）
try {
  const validYear = validateYear(inputYear);
} catch (error) {
  const validationError = validator.handleValidationError(error, 'year');
  // エラー処理
}
```

## プロジェクト固有の検証例

### 選手データの検証

扱うのはプロ志望届のデータ（氏名・学校・ポジション・都道府県・年度）で、成績値は持たない。

```typescript
// 選手データのスキーマ検証
const validatePlayerData = playerData => {
  return validator.object(playerData, {
    required: true,
    schema: {
      id: v => validator.playerId(v, true),
      name: v => validator.string(v, { required: true, maxLength: 100 }),
      school: v => validator.string(v, { required: true, maxLength: 100 }),
      position: v => validator.string(v, { required: true }),
      prefecture: v => validator.string(v, { maxLength: 20 }),
      year: v => validator.year(v, { required: true }),
      filingDate: v => validator.date(v),
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
