/**
 * プラグインの基本インターフェース
 */
export interface Plugin {
  /**
   * プラグインの名前
   */
  name: string;

  /**
   * プラグインの初期化処理
   */
  initialize(): void;

  /**
   * プラグインの実行処理
   * @param args 任意の引数
   */
  execute(args?: any): void;
}
