import { describe, it, expect } from 'vitest';
import {
  PREFECTURE_ORDER,
  normalizePrefecture,
  sortPrefecturesByGeo,
  resolvePrefecture,
} from './prefectures';
import type { PlayerData } from '../types/player';

const makePlayer = (overrides: Partial<PlayerData>): PlayerData => ({
  id: overrides.id ?? 'test_1',
  name: overrides.name ?? '選手A',
  school: overrides.school ?? '',
  filingDate: overrides.filingDate ?? '2026-01-01T00:00:00.000Z',
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('PREFECTURE_ORDER', () => {
  it('47都道府県すべて含み、先頭は北海道、末尾は沖縄', () => {
    expect(PREFECTURE_ORDER).toHaveLength(47);
    expect(PREFECTURE_ORDER[0]).toBe('北海道');
    expect(PREFECTURE_ORDER[PREFECTURE_ORDER.length - 1]).toBe('沖縄');
  });

  it('重複がない', () => {
    expect(new Set(PREFECTURE_ORDER).size).toBe(47);
  });
});

describe('normalizePrefecture', () => {
  it('既に正規化された表記はそのまま返す', () => {
    expect(normalizePrefecture('東京')).toBe('東京');
    expect(normalizePrefecture('大阪')).toBe('大阪');
    expect(normalizePrefecture('北海道')).toBe('北海道');
  });

  it('京都は縮約せずそのまま返す（京都→京のバグ回避）', () => {
    expect(normalizePrefecture('京都')).toBe('京都');
  });

  it('末尾の都/府/県 suffix を落とす', () => {
    expect(normalizePrefecture('東京都')).toBe('東京');
    expect(normalizePrefecture('京都府')).toBe('京都');
    expect(normalizePrefecture('大阪府')).toBe('大阪');
    expect(normalizePrefecture('神奈川県')).toBe('神奈川');
    expect(normalizePrefecture('沖縄県')).toBe('沖縄');
  });

  it('北海道の末尾「道」は落とさない', () => {
    expect(normalizePrefecture('北海道')).toBe('北海道');
  });

  it('全角スペース(U+3000)を除去する', () => {
    expect(normalizePrefecture('青\u3000森')).toBe('青森');
    expect(normalizePrefecture('東\u3000京')).toBe('東京');
    expect(normalizePrefecture('宮\u3000城')).toBe('宮城');
    expect(normalizePrefecture('神\u3000奈\u3000川')).toBe('神奈川');
  });

  it('半角スペースを除去する', () => {
    expect(normalizePrefecture('青 森')).toBe('青森');
    expect(normalizePrefecture(' 東京 ')).toBe('東京');
  });

  it('全角スペース入りの suffix 付き表記も正規化する', () => {
    expect(normalizePrefecture('東\u3000京\u3000都')).toBe('東京');
    expect(normalizePrefecture('京\u3000都\u3000府')).toBe('京都');
  });

  it('空文字は空文字を返す', () => {
    expect(normalizePrefecture('')).toBe('');
    expect(normalizePrefecture('   ')).toBe('');
    expect(normalizePrefecture('\u3000\u3000')).toBe('');
  });

  it('未知の表記は変換せずそのまま返す', () => {
    expect(normalizePrefecture('海外')).toBe('海外');
    expect(normalizePrefecture('不明')).toBe('不明');
  });
});

describe('sortPrefecturesByGeo', () => {
  it('北から順に並ぶ（北海道→青森→…→沖縄）', () => {
    const shuffled = ['沖縄', '東京', '北海道', '大阪', '青森', '福岡'];
    expect(sortPrefecturesByGeo(shuffled)).toEqual([
      '北海道',
      '青森',
      '東京',
      '大阪',
      '福岡',
      '沖縄',
    ]);
  });

  it('全角スペース入り・suffix 付き・混在でも正しい位置に並ぶ', () => {
    const mixed = ['沖縄県', '東\u3000京', '北海道', '青\u3000森', '京都'];
    expect(sortPrefecturesByGeo(mixed)).toEqual([
      '北海道',
      '青\u3000森',
      '東\u3000京',
      '京都',
      '沖縄県',
    ]);
  });

  it('京都が末尾に送られない（京→京都縮約バグ回帰テスト）', () => {
    const list = ['京都', '東京', '大阪', '北海道', '沖縄'];
    const sorted = sortPrefecturesByGeo(list);
    expect(sorted).toEqual(['北海道', '東京', '京都', '大阪', '沖縄']);
    expect(sorted[sorted.length - 1]).toBe('沖縄');
    expect(sorted[sorted.length - 1]).not.toBe('京都');
  });

  it('未知の表記は末尾に送る', () => {
    const list = ['海外', '東京', '北海道'];
    expect(sortPrefecturesByGeo(list)).toEqual(['北海道', '東京', '海外']);
  });

  it('秋田が岩手より先（緯度順：39.72 > 39.70）', () => {
    expect(sortPrefecturesByGeo(['岩手', '秋田'])).toEqual(['秋田', '岩手']);
  });

  it('新潟が福島より先（緯度順：37.92 > 37.75）', () => {
    expect(sortPrefecturesByGeo(['福島', '新潟'])).toEqual(['新潟', '福島']);
  });
});

describe('resolvePrefecture', () => {
  it('高校生は player.prefecture を正規化して返す', () => {
    const player = makePlayer({ type: 'highschool', prefecture: '東\u3000京' });
    expect(resolvePrefecture(player)).toBe('東京');
  });

  it('高校生の京都は京都のまま返す', () => {
    const player = makePlayer({ type: 'highschool', prefecture: '京都' });
    expect(resolvePrefecture(player)).toBe('京都');
  });

  it('高校生で prefecture が無ければ null', () => {
    const player = makePlayer({ type: 'highschool', prefecture: undefined });
    expect(resolvePrefecture(player)).toBeNull();
  });

  it('大学生は school からマップ引きして都道府県を返す', () => {
    const player = makePlayer({
      type: 'university',
      school: '早稲田大学',
      prefecture: undefined,
    });
    expect(resolvePrefecture(player)).toBe('東京');
  });

  it('大学生でマップに無い school は null', () => {
    const player = makePlayer({
      type: 'university',
      school: '存在しない大学',
      prefecture: undefined,
    });
    expect(resolvePrefecture(player)).toBeNull();
  });

  it('大学生で prefecture が直接入っていればそちらを優先（正規化あり）', () => {
    const player = makePlayer({
      type: 'university',
      school: '早稲田大学',
      prefecture: '大阪府',
    });
    expect(resolvePrefecture(player)).toBe('大阪');
  });

  it('type 未設定でも prefecture があれば正規化して返す', () => {
    const player = makePlayer({ type: undefined, prefecture: '神奈川県' });
    expect(resolvePrefecture(player)).toBe('神奈川');
  });
});
