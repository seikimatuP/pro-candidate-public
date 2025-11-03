/**
 * 入力検証の使用例
 * このファイルは入力検証の使用方法を示すサンプルコードです
 */
import { validator } from '../src/scripts/validator';
import { validate } from '../src/scripts/validation_utils';
import { error } from '../src/core_utils';

// validatorにはすでに文字列検証メソッドがあると仮定
// validator.string = stringValidator;

/**
 * 基本的な検証の例
 */
function basicValidationExample(input: any) {
  try {
    // 文字列検証
    const validName = validator.string(input.name, { 
      required: true, 
      minLength: 3, 
      maxLength: 50 
    });
    
    // 数値検証
    const validAge = validator.number(input.age, { min: 15, max: 60 });
    
    // メールアドレス検証
    const validEmail = validator.email(input.email, true);
    
    return {
      success: true,
      data: { name: validName, age: validAge, email: validEmail }
    };
  } catch (err) {
    error('基本的な検証でエラーが発生しました', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * 安全な検証ユーティリティを使用した例
 */
function safeValidationExample(input: any) {
  // 名前の検証（必須）
  const validName = validate.requiredString('名前')(input.name);
  if (validName === null) {
    return { success: false, field: '名前', message: '名前は必須です' };
  }
  
  // 年齢の検証（オプショナル、範囲チェック）
  const validAge = validate.number('年齢', 15, 60)(input.age);
  // nullの場合はエラーではなく、未入力として扱う
  
  // メールアドレスの検証
  const validEmail = validate.email('メールアドレス')(input.email);
  if (validEmail === null) {
    return { success: false, field: 'メールアドレス', message: 'メールアドレスの形式が正しくありません' };
  }
  
  // 複合検証の例（郵便番号）
  const validPostalCode = validate.postalCode('郵便番号')(input.postalCode);
  
  return {
    success: true,
    data: {
      name: validName,
      age: validAge ?? undefined, // nullの場合はundefinedに変換
      email: validEmail,
      postalCode: validPostalCode
    }
  };
}

/**
 * オブジェクト全体のスキーマ検証例
 */
function schemaValidationExample(input: any) {
  try {
    const validData = validator.object(input, {
      required: true,
      schema: {
        name: (v) => validator.string(v, { required: true, minLength: 3 }),
        age: (v) => validator.number(v, { min: 15 }),
        email: (v) => validator.email(v, true),
        address: (v) => validator.object(v, {
          schema: {
            postalCode: (v) => validator.postalCode(v),
            prefecture: (v) => validator.string(v, { required: true }),
            city: (v) => validator.string(v, { required: true }),
            street: (v) => validator.string(v)
          }
        }),
        hobbies: (v) => validator.array(v, {
          validator: (item) => validator.string(item)
        })
      }
    });
    
    return { success: true, data: validData };
  } catch (err) {
    const validationError = validator.handleValidationError(err);
    return {
      success: false,
      error: validationError
    };
  }
}

// 選手データの検証例を追加
const validatePlayerProfile = (input: any) => {
  try {
    return {
      id: validator.playerId(input.id, true),
      name: validator.string(input.name, { required: true }),
      postalCode: validator.postalCode(input.postalCode),
      phoneNumber: validator.phoneNumber(input.phoneNumber)
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
};

// サンプルデータで実行例を示す
const sampleInput = {
  name: '山田太郎',
  age: 25,
  email: 'yamada@example.com',
  postalCode: '123-4567',
  address: {
    postalCode: '123-4567',
    prefecture: '東京都',
    city: '新宿区',
    street: '新宿1-1-1'
  },
  hobbies: ['野球', '読書']
};

console.log('基本的な検証:', basicValidationExample(sampleInput));
console.log('安全な検証:', safeValidationExample(sampleInput));
console.log('スキーマ検証:', schemaValidationExample(sampleInput));

// 使用例を追加
const playerInput = {
  id: 'PL-2023-00001',
  name: '山田太郎',
  postalCode: '123-4567',
  phoneNumber: '090-1234-5678'
};

console.log('選手プロフィール検証:', validatePlayerProfile(playerInput));

export {
  basicValidationExample,
  safeValidationExample,
  schemaValidationExample
};
