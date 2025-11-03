/**
 * 高校生プロ志望届データのスクレイピングサービス
 * AWS Lambda環境用 (Node.js 18.x)
 */

import * as cheerio from 'cheerio';
import { PlayerData } from '../core/types';
import { createS3DataService } from './s3-data-service';

interface ScrapingResult {
  success: boolean;
  data: PlayerData[];
  count: number;
  message: string;
  error?: string;
}

export class HighschoolScraper {
  private readonly baseUrl = 'https://www.jhbf.or.jp/pro-aspiring';
  private s3DataService: any;

  constructor() {
    this.s3DataService = createS3DataService();
  }

  /**
   * 高校生データのスクレイピング実行
   * @param year 対象年度
   */
  async scrapeHighschoolPlayers(year: number = new Date().getFullYear()): Promise<ScrapingResult> {
    try {
      console.log(`高校生データのスクレイピング開始: ${year}年度`);
      
      // URLを構築
      const url = `${this.baseUrl}/${year}.html`;
      console.log(`スクレイピング対象URL: ${url}`);

      // HTMLデータを取得
      const html = await this.fetchHtml(url);
      if (!html) {
        throw new Error('HTMLデータの取得に失敗しました');
      }

      // データを抽出
      const players = this.parseHighschoolData(html, year);
      console.log(`抽出した選手数: ${players.length}名`);

      // S3に保存
      if (players.length > 0) {
        await this.s3DataService.savePlayersData(players, 'highschool', year);
        console.log(`S3への保存完了: ${players.length}名`);
      }

      return {
        success: true,
        data: players,
        count: players.length,
        message: `${year}年度の高校生データを${players.length}件取得しました`
      };

    } catch (error) {
      console.error('高校生データスクレイピングエラー:', error);
      return {
        success: false,
        data: [],
        count: 0,
        message: 'スクレイピングに失敗しました',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * HTMLデータを取得
   * @param url 対象URL
   */
  private async fetchHtml(url: string): Promise<string> {
    try {
      // タイムアウト処理を実装
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DataScraper/1.0; AWS Lambda)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`HTML取得成功: ${html.length} バイト`);
      
      return html;
    } catch (error) {
      console.error(`HTML取得エラー (${url}):`, error);
      throw error;
    }
  }

  /**
   * 高校生データをHTMLから抽出
   * @param html HTMLコンテンツ
   * @param year 対象年度
   */
  private parseHighschoolData(html: string, year: number): PlayerData[] {
    const $ = cheerio.load(html);
    const players: PlayerData[] = [];

    try {
      // テーブルを検索（2つのテーブルがある: ドラフト対象外とドラフト対象者）
      $('table.c-table.c-table--no-margin').each((tableIndex, table) => {
        console.log(`テーブル ${tableIndex + 1} を処理中...`);
        
        // 各行を処理
        $(table).find('tbody tr').each((rowIndex, row) => {
          const cells = $(row).find('td');
          
          if (cells.length >= 4) {
            const prefecture = $(cells[0]).text().trim();
            const school = $(cells[1]).text().trim();
            const name = $(cells[2]).text().trim();
            const filingDate = $(cells[3]).text().trim();

            // 有効なデータのみ追加
            if (name && school && !name.includes('※')) {
              const playerId = `highschool_${year}_${String(players.length + 1).padStart(4, '0')}`;
              
              const player: PlayerData = {
                id: playerId,
                name: name,
                school: school,
                type: 'highschool' as const,
                year: year,
                prefecture: prefecture || undefined,
                filingDate: this.parseDate(filingDate),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              players.push(player);
              
              // デバッグ情報（最初の数件のみ）
              if (players.length <= 5) {
                console.log(`選手データ ${players.length}:`, {
                  name: player.name,
                  school: player.school,
                  prefecture: player.prefecture,
                  filingDate: player.filingDate
                });
              }
            }
          }
        });
      });

      console.log(`合計抽出選手数: ${players.length}名`);
      return players;

    } catch (error) {
      console.error('HTMLパースエラー:', error);
      throw new Error(`データ抽出に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 日付文字列をISO形式に変換
   * @param dateStr 日付文字列
   */
  private parseDate(dateStr: string): string {
    if (!dateStr || dateStr.trim() === '') {
      return new Date().toISOString();
    }

    try {
      // 日本語の日付形式を処理 (例: "令和6年1月15日", "2024年1月15日")
      const cleanedDate = dateStr
        .replace(/令和(\d+)年/, (match, year) => {
          const reiwaYear = parseInt(year) + 2018; // 令和元年 = 2019年
          return `${reiwaYear}年`;
        })
        .replace(/年/g, '-')
        .replace(/月/g, '-')
        .replace(/日/g, '')
        .replace(/\s+/g, '');

      const date = new Date(cleanedDate);
      
      if (isNaN(date.getTime())) {
        console.warn(`日付の解析に失敗: ${dateStr}`);
        return new Date().toISOString();
      }

      return date.toISOString();
    } catch (error) {
      console.warn(`日付変換エラー (${dateStr}):`, error);
      return new Date().toISOString();
    }
  }

  /**
   * スクレイピング状況の取得
   */
  async getScrapingStatus() {
    try {
      return await this.s3DataService.getScrapingStatus();
    } catch (error) {
      console.error('スクレイピング状況取得エラー:', error);
      return null;
    }
  }

  /**
   * スクレイピング状況の更新
   */
  async updateScrapingStatus(status: any) {
    try {
      await this.s3DataService.updateScrapingStatus(status);
    } catch (error) {
      console.error('スクレイピング状況更新エラー:', error);
    }
  }
}

// シングルトンインスタンス
export const highschoolScraper = new HighschoolScraper();