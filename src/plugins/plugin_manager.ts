import { Plugin } from './plugin_interface';

/**
 * プラグインを管理するクラス
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  /**
   * プラグインを登録
   * @param plugin プラグインインスタンス
   */
  registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`プラグイン "${plugin.name}" は既に登録されています。`);
      return;
    }
    this.plugins.set(plugin.name, plugin);
    console.log(`プラグイン "${plugin.name}" を登録しました。`);
  }

  /**
   * プラグインを初期化
   */
  initializePlugins(): void {
    this.plugins.forEach((plugin) => {
      try {
        plugin.initialize();
        console.log(`プラグイン "${plugin.name}" を初期化しました。`);
      } catch (error) {
        console.error(`プラグイン "${plugin.name}" の初期化中にエラーが発生しました:`, error);
      }
    });
  }

  /**
   * プラグインを実行
   * @param pluginName プラグイン名
   * @param args 任意の引数
   */
  executePlugin(pluginName: string, args?: any): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      console.warn(`プラグイン "${pluginName}" は登録されていません。`);
      return;
    }
    try {
      plugin.execute(args);
      console.log(`プラグイン "${pluginName}" を実行しました。`);
    } catch (error) {
      console.error(`プラグイン "${pluginName}" の実行中にエラーが発生しました:`, error);
    }
  }
}
