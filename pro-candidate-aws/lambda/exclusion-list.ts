/**
 * 削除請求による掲載停止（除外リスト）
 *
 * SCRAPING_POLICY.md「削除請求への対応」に対応する実装。
 * 選手本人・法定代理人からの削除請求を受けた選手を、
 *
 * - スクレイピング時: S3へ保存する前に取り除く（再収集の防止）
 * - API配信時: S3から読んだデータから取り除く（過年度の保存済みデータにも効かせる）
 *
 * の2経路で除外する。保存前だけで除外すると、請求を受け付ける前に保存済みだった
 * 過年度ファイルが配信され続けてしまうため、読み出し側でも必ず通す。
 *
 * 除外リストは S3データバケットの `config/exclusion-list.json` に以下の構造で置く。
 *
 * ```json
 * {
 *   "players": [
 *     {
 *       "name": "山田太郎",
 *       "school": "○○高校",
 *       "reason": "deletion-request",
 *       "addedAt": "2026-08-18T00:00:00.000Z"
 *     }
 *   ]
 * }
 * ```
 *
 * リストが「存在しない」場合は除外なしとして通常どおり動作する（後方互換）。
 * 一方、「存在するはずなのに読めない」場合はエラーを投げて処理を止める。
 * 読めないまま続行すると削除請求済みの選手を保存・配信してしまうため、
 * 安全側（フェイルクローズ）に倒す。
 *
 * 除外リスト自体が個人情報なので、ログには件数だけを出し氏名・学校名は出さない。
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { log } from './logger';

/** 除外リストのS3キー */
export const EXCLUSION_LIST_KEY = 'config/exclusion-list.json';

/** 除外リストの1件 */
export interface ExclusionEntry {
  /** 氏名（照合キー） */
  name: string;
  /** 所属校名（照合キー。同姓同名の誤除外を防ぐため氏名と併用する） */
  school: string;
  /** 除外理由（例: deletion-request） */
  reason?: string;
  /** 追加日時（ISO8601） */
  addedAt?: string;
}

/** 除外判定の対象になりうる選手データの最小形 */
interface ExcludablePlayer {
  name?: unknown;
  school?: unknown;
  /** 大学生データのみ持つ、ふりがなを付ける前の氏名 */
  originalName?: unknown;
}

/**
 * 除外リストが読めなかったことを表すエラー。
 *
 * 呼び出し側はこれを捕まえて「保存しない」「配信しない」を選ぶ。
 */
export class ExclusionListUnavailableError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ExclusionListUnavailableError';
  }
}

const defaultS3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

/** 除外リストが未設置のときにS3が返すエラー名（本当に「無い」ケースだけを列挙する） */
const NOT_FOUND_ERRORS = ['NoSuchKey', 'NotFound'];

/**
 * 氏名末尾のふりがな注記を落とす。
 *
 * 大学生データのパーサは氏名を `氏名(ふりがな)` の形に組み立てて保存している
 * （parsers.ts の `displayName`）。運用者は除外リストに公式サイトの表記どおり
 * 「氏名」だけを書くのが自然なので、そのままでは照合が外れて除外できなかった。
 * 照合の前に両側から括弧書きを外して揃える。
 */
const stripReadingSuffix = (value: string): string =>
  value.replace(/[（(][^（()）]*[)）]\s*$/u, '');

/**
 * 照合キーを正規化する。
 *
 * 除外リストは人手で書くため、半角/全角スペースの有無や英字の大小といった
 * 表記ゆれで除外が外れないよう、空白を除去して小文字に揃えてから比較する。
 */
const normalize = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/[\s　]/g, '').toLowerCase() : '';

/**
 * 氏名と学校名を組にした照合キー。
 * 正規化で空白を落としてあるため、区切りの空白は両者の境界として一意に働く。
 */
const matchKey = (name: unknown, school: unknown): string =>
  `${normalize(name)} ${normalize(school)}`;

/**
 * 1件の氏名から生じうる照合キーを列挙する。
 * ふりがな付き・なしのどちらで書かれていても一致するようにする。
 */
const keysForName = (name: unknown, school: unknown): string[] => {
  const keys = [matchKey(name, school)];

  if (typeof name === 'string') {
    const stripped = stripReadingSuffix(name);
    if (stripped !== name) {
      keys.push(matchKey(stripped, school));
    }
  }

  return keys;
};

/** 選手側の照合キー候補（表示名・ふりがな除去後・元の氏名） */
const playerMatchKeys = (player: ExcludablePlayer): string[] => [
  ...keysForName(player.name, player.school),
  ...(typeof player.originalName === 'string' && player.originalName !== player.name
    ? keysForName(player.originalName, player.school)
    : []),
];

/**
 * S3から除外リストを読み込む（キャッシュなし・毎回取得）。
 *
 * 未設置（NoSuchKey/NotFound）のときだけ空配列を返す。
 * バケット未設定・S3エラー・JSON不正のときは ExclusionListUnavailableError を投げる。
 */
export async function loadExclusionList(
  client: S3Client = defaultS3Client
): Promise<ExclusionEntry[]> {
  const bucketName = process.env.S3_DATA_BUCKET;

  if (!bucketName) {
    throw new ExclusionListUnavailableError(
      'S3_DATA_BUCKET が未設定のため除外リストを確認できません'
    );
  }

  let body: string;

  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: EXCLUSION_LIST_KEY })
    );

    body = await response.Body!.transformToString();
  } catch (error) {
    const errorName = (error as { name?: string })?.name;

    if (errorName && NOT_FOUND_ERRORS.includes(errorName)) {
      log.info(`除外リスト（${EXCLUSION_LIST_KEY}）は未設置です。除外なしとして続行します`);
      return [];
    }

    log.error('除外リストの読み込みに失敗しました:', error);
    throw new ExclusionListUnavailableError(
      `除外リスト（${EXCLUSION_LIST_KEY}）を読み込めませんでした`,
      error
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch (error) {
    log.error('除外リストのJSONが不正です:', error);
    throw new ExclusionListUnavailableError(
      `除外リスト（${EXCLUSION_LIST_KEY}）のJSONが不正です`,
      error
    );
  }

  const rawEntries = Array.isArray((parsed as { players?: unknown })?.players)
    ? ((parsed as { players: unknown[] }).players as unknown[])
    : [];

  // 氏名・学校名の両方が揃っている行だけを採用する。
  // 片方が空の行を許すと意図しない広範囲の除外につながるため。
  const entries: ExclusionEntry[] = rawEntries
    .filter(
      (entry: unknown): entry is ExclusionEntry =>
        !!entry &&
        typeof entry === 'object' &&
        normalize((entry as ExclusionEntry).name) !== '' &&
        normalize((entry as ExclusionEntry).school) !== ''
    )
    .map((entry: ExclusionEntry) => ({
      name: entry.name,
      school: entry.school,
      reason: entry.reason,
      addedAt: entry.addedAt,
    }));

  const skipped = rawEntries.length - entries.length;
  log.info(
    `除外リストを読み込みました: 有効${entries.length}件` +
      (skipped > 0 ? `（氏名または学校名が欠落した${skipped}件は無視）` : '')
  );

  return entries;
}

/** 実行環境（Lambdaコンテナ）が生きている間だけ持つキャッシュ */
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedEntries: ExclusionEntry[] | null = null;
let cachedAt = 0;

/** テスト用。キャッシュを捨てる */
export function resetExclusionListCache(): void {
  cachedEntries = null;
  cachedAt = 0;
}

/**
 * API配信のように高頻度で呼ばれる経路向けの読み込み。
 *
 * 5分間はキャッシュを使う。読み込みに失敗したときは、
 * 直前に読めていた内容が残っていればそれを使い（除外は効き続ける）、
 * 一度も読めていなければエラーを投げて配信を止める。
 */
export async function loadExclusionListCached(
  client: S3Client = defaultS3Client
): Promise<ExclusionEntry[]> {
  const now = Date.now();

  if (cachedEntries && now - cachedAt < CACHE_TTL_MS) {
    return cachedEntries;
  }

  try {
    const entries = await loadExclusionList(client);
    cachedEntries = entries;
    cachedAt = now;
    return entries;
  } catch (error) {
    if (cachedEntries) {
      log.warn('除外リストを再取得できないため、直前に取得した内容を使い続けます:', error);
      return cachedEntries;
    }

    throw error;
  }
}

/**
 * 除外リストに合致する選手を取り除く。
 *
 * 照合は氏名＋学校名の組で行う。ログに出すのは件数だけで、
 * どの選手を除外したかは出力しない。
 */
export function excludeRequestedPlayers<T extends ExcludablePlayer>(
  players: T[],
  exclusions: ExclusionEntry[]
): T[] {
  if (!Array.isArray(players) || players.length === 0 || exclusions.length === 0) {
    return players;
  }

  const excludedKeys = new Set(exclusions.flatMap(entry => keysForName(entry.name, entry.school)));
  const kept = players.filter(
    player => !playerMatchKeys(player).some(key => excludedKeys.has(key))
  );
  const removedCount = players.length - kept.length;

  if (removedCount > 0) {
    log.info(`削除請求の除外リストにより ${removedCount}件 を対象から除外しました`);
  }

  return kept;
}

/**
 * 除外リストの読み込みと除外適用をまとめて行う。スクレイピング処理から呼ぶ入口。
 *
 * 読み込みに失敗した場合は ExclusionListUnavailableError を投げる。
 * 呼び出し側はS3への保存を行わずに失敗として扱うこと。
 */
export async function applyExclusionList<T extends ExcludablePlayer>(
  players: T[],
  client: S3Client = defaultS3Client
): Promise<T[]> {
  const exclusions = await loadExclusionList(client);
  return excludeRequestedPlayers(players, exclusions);
}

/**
 * 保存済みデータを配信する前に除外を適用する。API処理から呼ぶ入口。
 *
 * 過年度のファイルは削除請求より前に保存されているため、
 * 読み出しのたびにここを通さないと削除請求が反映されない。
 */
export async function filterExcludedPlayers<T extends ExcludablePlayer>(
  players: T[],
  client: S3Client = defaultS3Client
): Promise<T[]> {
  const exclusions = await loadExclusionListCached(client);
  return excludeRequestedPlayers(players, exclusions);
}
