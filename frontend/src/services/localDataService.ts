/**
 * ローカル開発環境用のデータ永続化サービス
 * LocalStorageまたはJSONファイルにデータを保存
 */

import type { PlayerData } from '../types/player';

export class LocalDataService {
  private storageKey = 'pro-candidate-players';

  /**
   * 選手データを保存
   */
  savePlayersData(players: PlayerData[], type: 'highschool' | 'university'): void {
    const existingData = this.getAllData();
    existingData[type] = players;
    
    if (typeof window !== 'undefined') {
      // ブラウザ環境ではLocalStorage使用
      localStorage.setItem(this.storageKey, JSON.stringify(existingData));
    } else {
      // Node.js環境ではJSONファイル保存
      this.saveToFile(existingData);
    }
  }

  /**
   * 選手データを取得
   */
  getPlayersData(type: 'highschool' | 'university'): PlayerData[] {
    const data = this.getAllData();
    return data[type] || [];
  }

  /**
   * 全選手データを取得
   */
  getAllPlayersData(): PlayerData[] {
    const data = this.getAllData();
    return [...(data.highschool || []), ...(data.university || [])];
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    const highschool = this.getPlayersData('highschool');
    const university = this.getPlayersData('university');
    
    return {
      total: highschool.length + university.length,
      highschool: highschool.length,
      university: university.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * データをクリア
   */
  clearData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  private getAllData(): { highschool?: PlayerData[], university?: PlayerData[] } {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : {};
      } else {
        const fileData = this.loadFromFile();
        return (fileData || {}) as { highschool?: PlayerData[]; university?: PlayerData[] };
      }
    } catch (error) {
      console.error('Failed to load player data:', error);
      return {};
    }
  }

  private saveToFile(data: unknown): void {
    // Node.js環境での実装（必要に応じて）
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const filePath = path.join(dataDir, 'players-local.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save to file:', error);
    }
  }

  private loadFromFile(): unknown {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      const filePath = path.join(process.cwd(), 'data', 'players-local.json');
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to load from file:', error);
    }
    return {};
  }
}

export const localDataService = new LocalDataService();