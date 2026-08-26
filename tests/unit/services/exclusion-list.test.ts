import { describe, test, expect, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  EXCLUSION_LIST_KEY,
  ExclusionListUnavailableError,
  applyExclusionList,
  excludeRequestedPlayers,
  filterExcludedPlayers,
  loadExclusionList,
  resetExclusionListCache,
} from '../../../pro-candidate-aws/lambda/exclusion-list';

const s3Mock = mockClient(S3Client);

const mockLog = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
vi.mock('../../../pro-candidate-aws/lambda/logger', () => ({
  log: {
    debug: (...args: unknown[]) => mockLog.debug(...args),
    info: (...args: unknown[]) => mockLog.info(...args),
    warn: (...args: unknown[]) => mockLog.warn(...args),
    error: (...args: unknown[]) => mockLog.error(...args),
  },
}));

/** S3のGetObjectレスポンス（本文は文字列）を模したオブジェクトを作る */
const s3Body = (content: string): any => ({
  $metadata: {},
  Body: { transformToString: () => Promise.resolve(content) },
});

/** S3が返す「キーが存在しない」エラー */
const noSuchKeyError = (): Error => {
  const error = new Error('The specified key does not exist.');
  error.name = 'NoSuchKey';
  return error;
};

/** S3が返す一時的な障害（アクセス権限・スロットリング等） */
const accessDeniedError = (): Error => {
  const error = new Error('Access Denied');
  error.name = 'AccessDenied';
  return error;
};

const players = [
  { name: '山田太郎', school: '甲子園高校', position: '投手' },
  { name: '鈴木一郎', school: '六大学大学', position: '外野手' },
  { name: '佐藤次郎', school: '甲子園高校', position: '捕手' },
];

describe('削除請求の除外リスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    s3Mock.reset();
    resetExclusionListCache();
    process.env.S3_DATA_BUCKET = 'test-bucket';
  });

  describe('除外リストに合致する選手を除く', () => {
    test('氏名と学校名が一致した選手だけを保存対象から除く', async () => {
      s3Mock.on(GetObjectCommand).resolves(
        s3Body(
          JSON.stringify({
            players: [
              {
                name: '山田太郎',
                school: '甲子園高校',
                reason: 'deletion-request',
                addedAt: '2026-08-18T00:00:00.000Z',
              },
            ],
          })
        )
      );

      const result = await applyExclusionList(players);

      expect(result).toHaveLength(2);
      expect(result.map(player => player.name)).toEqual(['鈴木一郎', '佐藤次郎']);
    });

    test('同姓同名でも学校名が違えば除外しない', () => {
      const result = excludeRequestedPlayers(players, [{ name: '山田太郎', school: '別の高校' }]);

      expect(result).toHaveLength(3);
    });

    test('空白や英字の大小の表記ゆれを吸収して照合する', () => {
      const result = excludeRequestedPlayers(
        [{ name: 'John Smith', school: 'ABC 高校' }],
        [{ name: 'john smith', school: 'abc高校' }]
      );

      expect(result).toHaveLength(0);
    });

    test('除外件数はログに出すが個人名は出さない', async () => {
      s3Mock
        .on(GetObjectCommand)
        .resolves(
          s3Body(JSON.stringify({ players: [{ name: '山田太郎', school: '甲子園高校' }] }))
        );

      await applyExclusionList(players);

      const loggedMessages = mockLog.info.mock.calls.flat().join('\n');
      expect(loggedMessages).toContain('1件');
      expect(loggedMessages).not.toContain('山田太郎');
      expect(loggedMessages).not.toContain('甲子園高校');
    });
  });

  // 大学生データは氏名を `氏名(ふりがな)` の形で保存している（parsers.ts の displayName）。
  // 運用者が公式サイトどおり氏名だけを書いても除外が効くこと。
  describe('ふりがな付きの氏名の照合', () => {
    const universityPlayers = [
      { name: '山田太郎(ヤマダタロウ)', originalName: '山田太郎', school: '○○大学' },
      { name: '鈴木一郎(スズキイチロウ)', originalName: '鈴木一郎', school: '○○大学' },
    ];

    test('除外リストが氏名だけでもふりがな付きの選手を除外する', () => {
      const result = excludeRequestedPlayers(universityPlayers, [
        { name: '山田太郎', school: '○○大学' },
      ]);

      expect(result.map(player => player.originalName)).toEqual(['鈴木一郎']);
    });

    test('除外リストがふりがな付きで書かれていても除外する', () => {
      const result = excludeRequestedPlayers(universityPlayers, [
        { name: '山田太郎（ヤマダタロウ）', school: '○○大学' },
      ]);

      expect(result.map(player => player.originalName)).toEqual(['鈴木一郎']);
    });

    test('originalNameしか持たないデータでも除外する', () => {
      const result = excludeRequestedPlayers(
        [{ name: '山田 太郎', originalName: '山田太郎', school: '○○大学' }],
        [{ name: '山田太郎', school: '○○大学' }]
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('除外リストが存在しない場合', () => {
    test('NoSuchKeyなら空リスト扱いで全件そのまま返す', async () => {
      s3Mock.on(GetObjectCommand).rejects(noSuchKeyError());

      const result = await applyExclusionList(players);

      expect(result).toEqual(players);
      expect(await loadExclusionList()).toEqual([]);
    });
  });

  // 読めないまま続行すると削除請求済みの選手を保存・配信してしまうため、
  // 「読めない」ときは処理を止める（フェイルクローズ）
  describe('除外リストが読めない場合', () => {
    test('S3_DATA_BUCKET未設定ならエラーを投げる', async () => {
      delete process.env.S3_DATA_BUCKET;

      await expect(applyExclusionList(players)).rejects.toBeInstanceOf(
        ExclusionListUnavailableError
      );
      expect(s3Mock.calls()).toHaveLength(0);
    });

    test('S3エラーならエラーを投げる', async () => {
      s3Mock.on(GetObjectCommand).rejects(accessDeniedError());

      await expect(applyExclusionList(players)).rejects.toBeInstanceOf(
        ExclusionListUnavailableError
      );
    });

    test('JSONが壊れていたらエラーを投げる', async () => {
      s3Mock.on(GetObjectCommand).resolves(s3Body('{ 壊れたJSON'));

      await expect(applyExclusionList(players)).rejects.toBeInstanceOf(
        ExclusionListUnavailableError
      );
    });
  });

  describe('除外リストが空の場合', () => {
    test('playersが空配列なら全件そのまま返す', async () => {
      s3Mock.on(GetObjectCommand).resolves(s3Body(JSON.stringify({ players: [] })));

      const result = await applyExclusionList(players);

      expect(result).toEqual(players);
    });

    test('氏名または学校名が欠けた行は無視する', async () => {
      s3Mock.on(GetObjectCommand).resolves(
        s3Body(
          JSON.stringify({
            players: [{ name: '', school: '' }, { name: '山田太郎' }, { school: '甲子園高校' }],
          })
        )
      );

      const result = await applyExclusionList(players);

      expect(result).toEqual(players);
    });
  });

  // 保存済みの過年度データは削除請求より前に作られているため、
  // 配信のたびに除外を通さないと削除請求が反映されない
  describe('配信時の除外（filterExcludedPlayers）', () => {
    test('保存済みデータからも除外する', async () => {
      s3Mock
        .on(GetObjectCommand)
        .resolves(
          s3Body(JSON.stringify({ players: [{ name: '山田太郎', school: '甲子園高校' }] }))
        );

      const result = await filterExcludedPlayers(players);

      expect(result.map(player => player.name)).toEqual(['鈴木一郎', '佐藤次郎']);
    });

    test('連続呼び出しではキャッシュを使いS3を毎回読まない', async () => {
      s3Mock
        .on(GetObjectCommand)
        .resolves(
          s3Body(JSON.stringify({ players: [{ name: '山田太郎', school: '甲子園高校' }] }))
        );

      await filterExcludedPlayers(players);
      await filterExcludedPlayers(players);

      expect(s3Mock.calls()).toHaveLength(1);
    });

    test('一度も読めていない状態でS3が失敗したらエラーを投げる', async () => {
      s3Mock.on(GetObjectCommand).rejects(accessDeniedError());

      await expect(filterExcludedPlayers(players)).rejects.toBeInstanceOf(
        ExclusionListUnavailableError
      );
    });
  });

  test('読み込むS3キーは config/exclusion-list.json', async () => {
    s3Mock.on(GetObjectCommand).resolves(s3Body(JSON.stringify({ players: [] })));

    await loadExclusionList();

    expect(EXCLUSION_LIST_KEY).toBe('config/exclusion-list.json');
    expect(s3Mock.call(0).args[0].input).toEqual({
      Bucket: 'test-bucket',
      Key: 'config/exclusion-list.json',
    });
  });
});
