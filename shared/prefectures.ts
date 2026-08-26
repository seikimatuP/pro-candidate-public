import universityPrefectureMap from './data/university-prefecture.json';

/**
 * 都道府県の表記ゆれ吸収と、選手データからの都道府県解決。
 *
 * フロントエンド（ダッシュボードの都道府県集計）と Lambda（GET /statistics の
 * サーバ側集計）の双方から使う。以前はフロントだけに実装があり、集計を
 * サーバ側へ移した際に正規化が抜け落ちて「東京」と「東京都」が別項目に
 * 割れる劣化が起きたため、shared に一本化して二重管理をやめた。
 */

/** 県庁所在地の緯度（北→南）でソートした47都道府県 */
export const PREFECTURE_ORDER: readonly string[] = [
  '北海道',
  '青森',
  '秋田',
  '岩手',
  '宮城',
  '山形',
  '新潟',
  '福島',
  '富山',
  '長野',
  '石川',
  '栃木',
  '群馬',
  '茨城',
  '福井',
  '埼玉',
  '東京',
  '山梨',
  '千葉',
  '鳥取',
  '島根',
  '神奈川',
  '岐阜',
  '愛知',
  '京都',
  '滋賀',
  '静岡',
  '三重',
  '大阪',
  '兵庫',
  '奈良',
  '岡山',
  '広島',
  '香川',
  '和歌山',
  '山口',
  '徳島',
  '愛媛',
  '福岡',
  '高知',
  '佐賀',
  '大分',
  '熊本',
  '長崎',
  '宮崎',
  '鹿児島',
  '沖縄',
];

const PREFECTURE_ORDER_INDEX: Record<string, number> = PREFECTURE_ORDER.reduce(
  (acc, name, index) => {
    acc[name] = index;
    return acc;
  },
  {} as Record<string, number>
);

const KNOWN_PREFECTURES = new Set<string>(PREFECTURE_ORDER);

/** 大学名 → 都道府県。志望届データには大学の所在地が入らないため対応表で補う。 */
export const UNIVERSITY_PREFECTURE_MAP: Record<string, string> = universityPrefectureMap;

/**
 * 都道府県表記を正規化する。
 * - 全角スペース(U+3000)・半角スペースを除去（実データに "青(U+3000)森" のような表記が混入する）
 * - 末尾の 都/府/県 を落とす（東京都→東京、京都府→京都、神奈川県→神奈川）
 * - 未知の表記は変換せずそのまま返す
 */
export function normalizePrefecture(value: string): string {
  const cleaned = value.replace(/[\s\u3000]/g, '');
  if (!cleaned) return '';
  // 既に正規化済みの表記（京都/東京/大阪 など）はそのまま返す
  if (KNOWN_PREFECTURES.has(cleaned)) return cleaned;
  const stripped = cleaned.replace(/[都府県]$/, '');
  if (KNOWN_PREFECTURES.has(stripped)) return stripped;
  return cleaned;
}

/** 都道府県名の配列を北→南の順に並べ替える（未知の表記は末尾） */
export function sortPrefecturesByGeo(prefectures: readonly string[]): string[] {
  return [...prefectures].sort((a, b) => {
    const aIndex = PREFECTURE_ORDER_INDEX[normalizePrefecture(a)] ?? Number.MAX_SAFE_INTEGER;
    const bIndex = PREFECTURE_ORDER_INDEX[normalizePrefecture(b)] ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.localeCompare(b, 'ja');
  });
}

/** resolvePrefecture が参照する最小限の選手データ形状 */
export interface PrefectureResolvable {
  type?: string;
  school?: string;
  prefecture?: string;
}

/**
 * 選手データから都道府県を解決する。解決できない場合は null。
 *
 * 大学生は prefecture が空のことが多く、代わりに region に連盟名
 * （例: 東京六大学野球連盟）が入る。連盟名は都道府県ではないので集計に
 * 混ぜず、大学名の対応表から所在地を引く。
 */
export function resolvePrefecture(player: PrefectureResolvable): string | null {
  const direct = player.prefecture?.trim();
  if (direct) {
    const normalized = normalizePrefecture(direct);
    return normalized || null;
  }

  if (player.type === 'university') {
    const school = player.school?.trim();
    const mapped = school ? UNIVERSITY_PREFECTURE_MAP[school] : undefined;
    if (mapped) return normalizePrefecture(mapped);
  }

  return null;
}
