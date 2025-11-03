/**
 * ファイルシステム操作用サービスクラス
 * ファイル読み書きやディレクトリ操作の一元管理を担当
 */

import * as fs from 'fs';
import * as path from 'path';
import { debug, info, warn, error } from "../core/utils";

/**
 * ファイル読み込みオプション
 */
interface ReadOptions {
  encoding?: BufferEncoding;
  flag?: string;
  parse?: boolean;
}

/**
 * ファイル書き込みオプション
 */
interface WriteOptions {
  encoding?: BufferEncoding;
  flag?: string;
  mode?: number;
  overwrite?: boolean;
}

/**
 * キャッシュアイテム
 */
interface CacheItem {
  content: any;
  timestamp: number;
}

/**
 * ファイルシステム操作を一元管理するサービスクラス
 */
export class FileSystemService {
  private static instance: FileSystemService;
  private fileCache: Map<string, CacheItem>;
  private readonly cacheTTL: number; // ミリ秒単位

  /**
   * プライベートコンストラクタ（シングルトンパターン）
   * @param options 初期化オプション
   */
  private constructor(options: { cacheTTL?: number } = {}) {
    this.fileCache = new Map<string, CacheItem>();
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // デフォルト5分
    debug('FileSystemService インスタンスを初期化しました');
  }

  /**
   * シングルトンインスタンスを取得
   * @param options 初期化オプション
   * @returns FileSystemService インスタンス
   */
  public static getInstance(options?: { cacheTTL?: number }): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService(options);
    }
    return FileSystemService.instance;
  }

  /**
   * キャッシュをクリア
   */
  public clearCache(): void {
    this.fileCache.clear();
    debug('ファイルキャッシュをクリアしました');
  }

  /**
   * ファイルが存在するか確認
   * @param filePath ファイルパス
   * @returns 存在する場合はtrue
   */
  public fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch (err) {
      error('ファイル存在確認エラー', { error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }

  /**
   * ディレクトリが存在するか確認
   * @param dirPath ディレクトリパス
   * @returns 存在する場合はtrue
   */
  public dirExists(dirPath: string): boolean {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch (err) {
      error('ディレクトリ存在確認エラー', { error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }

  /**
   * ディレクトリを作成（存在しない場合）
   * @param dirPath ディレクトリパス
   * @param recursive サブディレクトリも作成するか
   * @returns 成功した場合はtrue
   */
  public ensureDir(dirPath: string, recursive = true): boolean {
    try {
      if (!this.dirExists(dirPath)) {
        fs.mkdirSync(dirPath, { recursive });
        debug(`ディレクトリを作成しました: ${dirPath}`);
      }
      return true;
    } catch (err) {
      error(`ディレクトリ作成に失敗しました: ${dirPath}`, { error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }

  /**
   * ファイルを読み込む
   * @param filePath ファイルパス
   * @param options 読み込みオプション
   * @returns ファイル内容
   */
  public readFile(filePath: string, options: ReadOptions = {}): string | object | null {
    const encoding = options.encoding || 'utf8';
    const flag = options.flag || 'r';
    const parse = options.parse || false;

    // キャッシュチェック
    const cacheKey = `${filePath}:${encoding}:${flag}:${parse}`;
    const cachedItem = this.fileCache.get(cacheKey);
    if (cachedItem && Date.now() - cachedItem.timestamp < this.cacheTTL) {
      debug(`キャッシュからファイルを読み込みました: ${filePath}`);
      return cachedItem.content;
    }

    try {
      if (!this.fileExists(filePath)) {
        warn(`ファイルが存在しません: ${filePath}`);
        return null;
      }

      const content = fs.readFileSync(filePath, { encoding, flag });
      
      let result: string | object = content;
      if (parse && typeof content === 'string') {
        try {
          result = JSON.parse(content);
        } catch (parseErr) {
          warn(`JSONパースに失敗しました: ${filePath}`, { error: parseErr instanceof Error ? parseErr.message : String(parseErr) });
          result = content; // パースに失敗した場合は元の文字列を返す
        }
      }

      // キャッシュに保存
      this.fileCache.set(cacheKey, {
        content: result,
        timestamp: Date.now()
      });

      debug(`ファイルを読み込みました: ${filePath}`);
      return result;
    } catch (err) {
      error(`ファイル読み込みに失敗しました: ${filePath}`, { error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }

  /**
   * JSONファイルを読み込む
   * @param filePath ファイルパス
   * @returns JSONオブジェクト
   */
  public readJson<T = any>(filePath: string): T | null {
    return this.readFile(filePath, { parse: true }) as T | null;
  }

  /**
   * ファイルに書き込む
   * @param filePath ファイルパス
   * @param data 書き込むデータ
   * @param options 書き込みオプション
   * @returns 成功した場合はtrue
   */
  public writeFile(filePath: string, data: string | object, options: WriteOptions = {}): boolean {
    const encoding = options.encoding || 'utf8';
    const flag = options.flag || 'w';
    const mode = options.mode;
    const overwrite = options.overwrite !== false; // デフォルトは上書き許可

    try {
      // ファイルが存在し、上書きが許可されていない場合
      if (this.fileExists(filePath) && !overwrite) {
        warn(`ファイルが既に存在し、上書きは許可されていません: ${filePath}`);
        return false;
      }

      // ディレクトリが存在するか確認
      const dirPath = path.dirname(filePath);
      if (!this.ensureDir(dirPath)) {
        return false;
      }

      // オブジェクトの場合はJSON文字列に変換
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      
      // ファイルに書き込み
      fs.writeFileSync(filePath, content, { encoding, flag, mode });
      
      // キャッシュを更新
      const cacheKey = `${filePath}:${encoding}:r:${typeof data !== 'string'}`;
      this.fileCache.set(cacheKey, {
        content: data,
        timestamp: Date.now()
      });

      debug(`ファイルを書き込みました: ${filePath}`);
      return true;
    } catch (err) {
      error(`ファイル書き込みに失敗しました: ${filePath}`, { error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }

  /**
   * JSONファイルに書き込む
   * @param filePath ファイルパス
   * @param data 書き込むデータ
   * @param options 書き込みオプション
   * @returns 成功した場合はtrue
   */
  public writeJson(filePath: string, data: object, options: WriteOptions = {}): boolean {
    return this.writeFile(filePath, data, options);
  }

  /**
   * ファイルをコピー
   * @param srcPath コピー元パス
   * @param destPath コピー先パス
   * @param overwrite 上書きするか
   * @returns 成功した場合はtrue
   */
  public copyFile(srcPath: string, destPath: string, overwrite = true): boolean {
    try {
      if (!this.fileExists(srcPath)) {
        warn(`コピー元ファイルが存在しません: ${srcPath}`);
        return false;
      }

      if (this.fileExists(destPath) && !overwrite) {
        warn(`コピー先ファイルが既に存在し、上書きは許可されていません: ${destPath}`);
        return false;
      }

      // コピー先のディレクトリを確保
      const destDir = path.dirname(destPath);
      if (!this.ensureDir(destDir)) {
        return false;
      }

      // ファイルをコピー
      fs.copyFileSync(srcPath, destPath);
      
      // キャッシュから削除（新しいファイルが次回読み込まれるようにする）
      this.invalidateCacheFor(destPath);

      debug(`ファイルをコピーしました: ${srcPath} -> ${destPath}`);
      return true;
    } catch (err) {
      error(`ファイルコピーに失敗しました: ${srcPath} -> ${destPath}`, { error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }

  /**
   * ファイルを削除
   * @param filePath ファイルパス
   * @returns 成功した場合はtrue
   */
  public removeFile(filePath: string): boolean {
    try {
      if (!this.fileExists(filePath)) {
        debug(`削除対象ファイルが既に存在しません: ${filePath}`);
        return true;
      }

      fs.unlinkSync(filePath);
      
      // キャッシュから削除
      this.invalidateCacheFor(filePath);

      debug(`ファイルを削除しました: ${filePath}`);
      return true;
    } catch (err) {
      error(`ファイル削除に失敗しました: ${filePath}`, { error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }

  /**
   * ディレクトリ内のファイル一覧を取得
   * @param dirPath ディレクトリパス
   * @param options オプション
   * @returns ファイルパスの配列
   */
  public listFiles(dirPath: string, options: { recursive?: boolean; pattern?: RegExp } = {}): string[] {
    const recursive = options.recursive || false;
    const pattern = options.pattern;

    try {
      if (!this.dirExists(dirPath)) {
        warn(`ディレクトリが存在しません: ${dirPath}`);
        return [];
      }

      let files: string[] = [];

      if (recursive) {
        // 再帰的にファイルを収集するヘルパー関数
        const collectFiles = (dir: string, baseDir: string): void => {
          const entries = fs.readdirSync(dir);
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const relativePath = path.relative(baseDir, fullPath);
            
            if (fs.statSync(fullPath).isDirectory()) {
              collectFiles(fullPath, baseDir);
            } else if (!pattern || pattern.test(relativePath)) {
              files.push(fullPath);
            }
          }
        };

        collectFiles(dirPath, dirPath);
      } else {
        // 非再帰的にファイルを収集
        files = fs.readdirSync(dirPath)
          .map(file => path.join(dirPath, file))
          .filter(file => fs.statSync(file).isFile())
          .filter(file => !pattern || pattern.test(path.basename(file)));
      }

      debug(`ディレクトリ内のファイル一覧を取得しました: ${dirPath} (${files.length}件)`);
      return files;
    } catch (err) {
      error(`ディレクトリ内のファイル一覧取得に失敗しました: ${dirPath}`, { error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  }

  /**
   * 指定されたファイルのキャッシュを無効化
   * @param filePath ファイルパス
   */
  private invalidateCacheFor(filePath: string): void {
    for (const key of this.fileCache.keys()) {
      if (key.startsWith(filePath + ':')) {
        this.fileCache.delete(key);
      }
    }
  }
}

// シングルトンインスタンス
const fsService = FileSystemService.getInstance();

// グローバルAPI - 後方互換性のための関数
export function fileExists(filePath: string): boolean {
  return fsService.fileExists(filePath);
}

export function readFile(filePath: string, options?: ReadOptions): string | object | null {
  return fsService.readFile(filePath, options);
}

export function readJson<T = any>(filePath: string): T | null {
  return fsService.readJson<T>(filePath);
}

export function writeFile(filePath: string, data: string | object, options?: WriteOptions): boolean {
  return fsService.writeFile(filePath, data, options);
}

export function writeJson(filePath: string, data: object, options?: WriteOptions): boolean {
  return fsService.writeJson(filePath, data, options);
}

// デフォルトエクスポート
export default fsService;
