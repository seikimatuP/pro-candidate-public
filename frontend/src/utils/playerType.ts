import type { PlayerData, PlayerType } from '../types/player';

/**
 * 選手の区分（高校/大学）を解決する
 *
 * player.type が未設定の古いデータが残っているため、ID文字列に
 * "highschool" を含むかどうかでフォールバック判定する。
 * 表示側（Chipコンポーネント等）で同じ判定を重複させないよう、
 * この関数に判定ロジックを集約する。
 */
export function resolvePlayerType(player: Pick<PlayerData, 'type' | 'id'>): PlayerType {
  if (player.type === 'highschool' || player.type === 'university') {
    return player.type;
  }
  return player.id.includes('highschool') ? 'highschool' : 'university';
}

export function isHighschoolPlayer(player: Pick<PlayerData, 'type' | 'id'>): boolean {
  return resolvePlayerType(player) === 'highschool';
}
