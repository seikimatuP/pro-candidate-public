/**
 * 環境変数を取得するヘルパー
 * テスト時にモック化しやすくするために分離
 */
export const getEnv = () => import.meta.env;
