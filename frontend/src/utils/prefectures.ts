/**
 * 都道府県ユーティリティ。
 *
 * 実装は shared/prefectures.ts に一本化している（Lambda の GET /statistics でも
 * 同じ正規化を使うため）。ここはフロントエンドからの参照点として再エクスポートする。
 */
export {
  PREFECTURE_ORDER,
  UNIVERSITY_PREFECTURE_MAP,
  normalizePrefecture,
  sortPrefecturesByGeo,
  resolvePrefecture,
} from '../../../shared/prefectures';
