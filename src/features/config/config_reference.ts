/**
 * 設定キーのリファレンスと管理
 * 利用可能な設定キーとそのメタデータを管理
 */

import { debug, info, warn, error } from "../../core/utils";

/**
 * 設定キーのカテゴリ
 */
export enum ConfigCategory {
  SYSTEM = 'system',
  DATABASE = 'database',
  API = 'api',
  UI = 'ui',
  FEATURE = 'feature',
  SECURITY = 'security',
  INTEGRATION = 'integration',
  OTHER = 'other'
}

/**
 * 設定値の型
 */
export enum ConfigValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  DATE = 'date',
  SECURE = 'secure'
}

/**
 * 設定キーのメタデータ
 */
export interface ConfigKeyMetadata {
  key: string;
  category: ConfigCategory;
  valueType: ConfigValueType;
  description: string;
  defaultValue?: any;
  required?: boolean;
  sensitive?: boolean;
  validationRule?: string;
  tags?: string[];
  examples?: string[];
}

/**
 * 設定リファレンスマネージャー
 */
export class ConfigReference {
  private static instance: ConfigReference;
  private configKeys: Map<string, ConfigKeyMetadata> = new Map();
  
  /**
   * プライベートコンストラクタ
   */
  private constructor() {
    debug('ConfigReference インスタンスを初期化しました');
  }
  
  /**
   * シングルトンインスタンスを取得
   * @returns ConfigReference インスタンス
   */
  public static getInstance(): ConfigReference {
    if (!ConfigReference.instance) {
      ConfigReference.instance = new ConfigReference();
    }
    return ConfigReference.instance;
  }
  
  /**
   * 設定キーを登録
   * @param metadata 設定キーのメタデータ
   */
  public registerKey(metadata: ConfigKeyMetadata): void {
    if (this.configKeys.has(metadata.key)) {
      warn(`設定キー "${metadata.key}" は既に登録されています。上書きします。`);
    }
    
    this.configKeys.set(metadata.key, metadata);
    debug(`設定キー "${metadata.key}" を登録しました`);
  }
  
  /**
   * 複数の設定キーを一括登録
   * @param metadataList 設定キーのメタデータ配列
   */
  public registerKeys(metadataList: ConfigKeyMetadata[]): void {
    metadataList.forEach(metadata => this.registerKey(metadata));
  }
  
  /**
   * 設定キーのメタデータを取得
   * @param key 設定キー
   * @returns メタデータ
   */
  public getKeyMetadata(key: string): ConfigKeyMetadata | undefined {
    return this.configKeys.get(key);
  }
  
  /**
   * すべての設定キーのメタデータを取得
   * @returns メタデータのMap
   */
  public getAllKeyMetadata(): Map<string, ConfigKeyMetadata> {
    return new Map(this.configKeys);
  }
  
  /**
   * カテゴリ別の設定キーを取得
   * @param category カテゴリ
   * @returns 指定カテゴリの設定キーメタデータの配列
   */
  public getKeysByCategory(category: ConfigCategory): ConfigKeyMetadata[] {
    return [...this.configKeys.values()].filter(metadata => metadata.category === category);
  }
  
  /**
   * タグで設定キーを検索
   * @param tag 検索タグ
   * @returns 指定タグを持つ設定キーメタデータの配列
   */
  public getKeysByTag(tag: string): ConfigKeyMetadata[] {
    return [...this.configKeys.values()].filter(
      metadata => metadata.tags && metadata.tags.includes(tag)
    );
  }
  
  /**
   * 型で設定キーを検索
   * @param valueType 値の型
   * @returns 指定型の設定キーメタデータの配列
   */
  public getKeysByType(valueType: ConfigValueType): ConfigKeyMetadata[] {
    return [...this.configKeys.values()].filter(metadata => metadata.valueType === valueType);
  }
  
  /**
   * 機密設定キーを取得
   * @returns 機密設定キーメタデータの配列
   */
  public getSensitiveKeys(): ConfigKeyMetadata[] {
    return [...this.configKeys.values()].filter(metadata => metadata.sensitive);
  }
  
  /**
   * 必須設定キーを取得
   * @returns 必須設定キーメタデータの配列
   */
  public getRequiredKeys(): ConfigKeyMetadata[] {
    return [...this.configKeys.values()].filter(metadata => metadata.required);
  }
  
  /**
   * 設定キーのドキュメントを生成
   * @returns マークダウン形式のドキュメント
   */
  public generateDocumentation(): string {
    let doc = '# 設定キーリファレンス\n\n';
    
    // カテゴリ別にグループ化
    const categorizedKeys = Object.values(ConfigCategory).map(category => ({
      category,
      keys: this.getKeysByCategory(category as ConfigCategory)
    })).filter(group => group.keys.length > 0);
    
    // 目次生成
    doc += '## 目次\n\n';
    categorizedKeys.forEach(group => {
      doc += `- [${group.category}](#${group.category})\n`;
    });
    doc += '\n';
    
    // カテゴリ別にドキュメント生成
    categorizedKeys.forEach(group => {
      doc += `## ${group.category}\n\n`;
      
      group.keys.forEach(metadata => {
        doc += `### ${metadata.key}\n\n`;
        doc += `- **説明**: ${metadata.description}\n`;
        doc += `- **型**: ${metadata.valueType}\n`;
        
        if (metadata.defaultValue !== undefined) {
          doc += `- **デフォルト値**: \`${JSON.stringify(metadata.defaultValue)}\`\n`;
        }
        
        if (metadata.required) {
          doc += `- **必須**: はい\n`;
        }
        
        if (metadata.sensitive) {
          doc += `- **機密情報**: はい\n`;
        }
        
        if (metadata.validationRule) {
          doc += `- **バリデーションルール**: ${metadata.validationRule}\n`;
        }
        
        if (metadata.tags && metadata.tags.length > 0) {
          doc += `- **タグ**: ${metadata.tags.join(', ')}\n`;
        }
        
        if (metadata.examples && metadata.examples.length > 0) {
          doc += '\n**使用例**:\n\n```typescript\n';
          metadata.examples.forEach(example => {
            doc += `${example}\n`;
          });
          doc += '```\n';
        }
        
        doc += '\n';
      });
    });
    
    return doc;
  }
}

// シングルトンインスタンス
const configReference = ConfigReference.getInstance();

// デフォルトの設定キーを登録
configReference.registerKeys([
  {
    key: 'API_URL',
    category: ConfigCategory.API,
    valueType: ConfigValueType.STRING,
    description: 'APIサーバーのベースURL',
    defaultValue: 'https://api.example.com',
    required: true,
    validationRule: 'URL形式であること',
    tags: ['api', 'endpoint'],
    examples: [
      "config.set('API_URL', 'https://api.example.com');",
      "const apiUrl = config.get('API_URL');"
    ]
  },
  {
    key: 'API_TIMEOUT_MS',
    category: ConfigCategory.API,
    valueType: ConfigValueType.NUMBER,
    description: 'APIリクエストのタイムアウト（ミリ秒）',
    defaultValue: 5000,
    validationRule: '正の整数であること',
    tags: ['api', 'timeout'],
    examples: [
      "config.set('API_TIMEOUT_MS', 10000);",
      "const timeout = config.get('API_TIMEOUT_MS', 5000);"
    ]
  },
  {
    key: 'DATABASE_HOST',
    category: ConfigCategory.DATABASE,
    valueType: ConfigValueType.STRING,
    description: 'データベースホスト名',
    defaultValue: 'localhost',
    required: true,
    tags: ['database', 'connection'],
    examples: [
      "config.set('DATABASE_HOST', 'db.example.com');",
      "const dbHost = config.get('DATABASE_HOST');"
    ]
  },
  {
    key: 'DATABASE_PASSWORD',
    category: ConfigCategory.DATABASE,
    valueType: ConfigValueType.SECURE,
    description: 'データベース接続パスワード',
    required: true,
    sensitive: true,
    tags: ['database', 'credentials', 'secure'],
    examples: [
      "config.setSecure('DATABASE_PASSWORD', process.env.DB_PASSWORD);",
      "const dbPassword = config.getSecure('DATABASE_PASSWORD');"
    ]
  },
  {
    key: 'API_KEY',
    category: ConfigCategory.SECURITY,
    valueType: ConfigValueType.SECURE,
    description: '外部APIサービスに接続するためのAPIキー',
    required: true,
    sensitive: true,
    tags: ['api', 'credentials', 'secure'],
    examples: [
      "config.setSecure('API_KEY', process.env.API_KEY);",
      "const apiKey = config.getSecure('API_KEY');"
    ]
  },
  {
    key: 'LOG_LEVEL',
    category: ConfigCategory.SYSTEM,
    valueType: ConfigValueType.STRING,
    description: 'ロギングレベル',
    defaultValue: 'INFO',
    validationRule: "'DEBUG', 'INFO', 'WARN', 'ERROR' のいずれか",
    tags: ['logging', 'debug'],
    examples: [
      "config.set('LOG_LEVEL', 'DEBUG');",
      "const logLevel = config.get('LOG_LEVEL', 'INFO');"
    ]
  },
  {
    key: 'FEATURE_FLAGS',
    category: ConfigCategory.FEATURE,
    valueType: ConfigValueType.OBJECT,
    description: '機能フラグの設定オブジェクト',
    defaultValue: { newSearch: false, betaFeatures: false },
    tags: ['features', 'toggles'],
    examples: [
      "config.set('FEATURE_FLAGS', { newSearch: true, betaFeatures: false });",
      "const features = config.get('FEATURE_FLAGS');"
    ]
  }
]);

// エクスポート
export default configReference;
