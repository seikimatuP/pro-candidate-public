/**
 * キャッシュ設定モジュール
 * データタイプごとの最適なキャッシュ設定を定義する
 */

/**
 * キャッシュ期間設定（秒単位）
 */
export enum CacheDuration {
  VERY_SHORT = 300,      // 5分
  SHORT = 1800,          // 30分
  MEDIUM = 3600,         // 1時間
  LONG = 21600,          // 6時間
  VERY_LONG = 43200,     // 12時間
  EXTRA_LONG = 86400,    // 24時間
  PERMANENT = 604800     // 7日間
}

/**
 * データタイプの列挙型
 */
export enum DataType {
  HIGH_SCHOOL_PLAYER = 'HIGH_SCHOOL_PLAYER',
  UNIVERSITY_PLAYER = 'UNIVERSITY_PLAYER',
  PLAYER_STATS = 'PLAYER_STATS',
  TEAM_INFO = 'TEAM_INFO',
  USER_SETTINGS = 'USER_SETTINGS',
  CHART_DATA = 'CHART_DATA',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  REFERENCE_DATA = 'REFERENCE_DATA'
}

/**
 * データタイプごとのキャッシュ設定
 */
export interface CacheSettings {
  /**
   * キャッシュを有効にするかどうか
   */
  enabled: boolean;
  
  /**
   * キャッシュの有効期間（秒）
   */
  duration: CacheDuration;
  
  /**
   * キャッシュの優先度（1-10、高いほど優先）
   */
  priority: number;
  
  /**
   * 説明
   */
  description: string;
}

/**
 * データタイプごとのキャッシュ設定
 */
export const cacheConfig: Record<DataType, CacheSettings> = {
  [DataType.HIGH_SCHOOL_PLAYER]: {
    enabled: true,
    duration: CacheDuration.MEDIUM,  // 1時間
    priority: 8,
    description: '高校生プロ志望届データ'
  },
  [DataType.UNIVERSITY_PLAYER]: {
    enabled: true,
    duration: CacheDuration.MEDIUM,  // 1時間
    priority: 8,
    description: '大学生プロ志望届データ'
  },
  [DataType.PLAYER_STATS]: {
    enabled: true,
    duration: CacheDuration.SHORT,   // 30分
    priority: 7,
    description: '選手の詳細統計データ'
  },
  [DataType.TEAM_INFO]: {
    enabled: true,
    duration: CacheDuration.LONG,    // 6時間
    priority: 5,
    description: 'チーム情報データ'
  },
  [DataType.USER_SETTINGS]: {
    enabled: true,
    duration: CacheDuration.VERY_LONG, // 12時間
    priority: 9,
    description: 'ユーザー設定'
  },
  [DataType.CHART_DATA]: {
    enabled: true,
    duration: CacheDuration.MEDIUM,  // 1時間
    priority: 6,
    description: 'チャート用データ'
  },
  [DataType.SYSTEM_CONFIG]: {
    enabled: true,
    duration: CacheDuration.VERY_LONG, // 12時間
    priority: 10,
    description: 'システム設定'
  },
  [DataType.REFERENCE_DATA]: {
    enabled: true,
    duration: CacheDuration.EXTRA_LONG, // 24時間
    priority: 4,
    description: '参照データ（あまり変更されないデータ）'
  }
};

/**
 * アクセス頻度に基づく動的キャッシュ期間調整係数
 */
export const accessFrequencyMultipliers = {
  HIGH: 1.5,    // 高頻度アクセスデータは期間を延長
  MEDIUM: 1.0,  // 標準
  LOW: 0.7      // 低頻度アクセスデータは期間を短縮
};

/**
 * 時間帯に基づくキャッシュ期間調整（日本時間）
 */
export const timeBasedDurationAdjustment = {
  MORNING: 0.8,     // 朝（データ更新が多い時間帯）
  BUSINESS: 1.0,    // 営業時間
  EVENING: 1.2,     // 夕方
  NIGHT: 1.5        // 夜間（アクセスが少ない時間帯）
};

/**
 * キャッシュ設定を取得
 * @param dataType キャッシュするデータタイプ
 * @returns キャッシュ設定
 */
export function getCacheSettings(dataType: DataType): CacheSettings {
  return cacheConfig[dataType] || {
    enabled: true,
    duration: CacheDuration.MEDIUM,
    priority: 5,
    description: '未定義データタイプ'
  };
}

/**
 * データタイプと現在の状況に基づいて最適なキャッシュ期間を計算
 * @param dataType データタイプ
 * @param accessFrequency アクセス頻度（オプション）
 * @returns 最適化されたキャッシュ期間（秒）
 */
export function getOptimalCacheDuration(
  dataType: DataType,
  accessFrequency: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
): number {
  const settings = getCacheSettings(dataType);
  
  if (!settings.enabled) {
    return 0; // キャッシュ無効
  }
  
  // 基本キャッシュ期間
  const duration = settings.duration;
  
  // アクセス頻度による調整
  const frequencyMultiplier = accessFrequencyMultipliers[accessFrequency];
  
  // 時間帯による調整（日本時間）
  const now = new Date();
  const hour = now.getHours();
  let timeMultiplier = timeBasedDurationAdjustment.BUSINESS;
  
  if (hour >= 6 && hour < 10) {
    timeMultiplier = timeBasedDurationAdjustment.MORNING;
  } else if (hour >= 10 && hour < 17) {
    timeMultiplier = timeBasedDurationAdjustment.BUSINESS;
  } else if (hour >= 17 && hour < 22) {
    timeMultiplier = timeBasedDurationAdjustment.EVENING;
  } else {
    timeMultiplier = timeBasedDurationAdjustment.NIGHT;
  }
  
  // 最終的なキャッシュ期間を計算
  return Math.round(duration * frequencyMultiplier * timeMultiplier);
}

export default {
  CacheDuration,
  DataType,
  cacheConfig,
  getCacheSettings,
  getOptimalCacheDuration
};
