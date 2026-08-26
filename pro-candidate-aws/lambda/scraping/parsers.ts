// @ts-nocheck
import * as cheerio from 'cheerio';
import { log } from '../logger';

interface Player {
  id: string;
  name: string;
  school: string;
  type: string;
  year: number;
  [key: string]: any;
}

export const parseDate = (dateStr: string, targetYear: number): string => {
  if (!dateStr || dateStr.trim() === '') {
    return new Date().toISOString();
  }

  try {
    log.debug(`日付パース処理: 元データ="${dateStr}", 対象年度=${targetYear}`);

    const hasYear = dateStr.match(/\d{4}年|令和\d+年|平成\d+年|昭和\d+年/);

    if (!hasYear && targetYear) {
      dateStr = `${targetYear}年${dateStr}`;
      log.debug(`年度付加: "${dateStr}"`);
    }

    const cleanedDate = dateStr
      .replace(/令和(\d+)年/, (match, year) => {
        const yearNum = parseInt(year, 10);
        const reiwaYear = yearNum + 2018;
        log.debug(`令和変換: ${match} → ${reiwaYear}年`);
        return `${reiwaYear}年`;
      })
      .replace(/年/g, '-')
      .replace(/月/g, '-')
      .replace(/日/g, '')
      .replace(/\s+/g, '');

    log.debug(`日付パース処理: 変換後="${cleanedDate}"`);

    const date = new Date(cleanedDate);

    if (isNaN(date.getTime())) {
      log.warn(`日付の解析に失敗: 元="${dateStr}" 変換後="${cleanedDate}"`);
      return new Date().toISOString();
    }

    const result = date.toISOString();
    log.debug(`日付パース処理: 最終結果="${result}"`);
    return result;
  } catch (error) {
    log.warn(`日付変換エラー (${dateStr}):`, error);
    return new Date().toISOString();
  }
};

export const parseHighschoolData = (html: string, year: number): Player[] => {
  const $ = cheerio.load(html);
  const players = [];

  try {
    const tables = $('table.c-table.c-table--no-margin');
    log.info(`見つかったテーブル数: ${tables.length}`);

    if (tables.length === 0) {
      log.warn('対象テーブルが見つかりませんでした');
      return players;
    }

    let targetTableIndex = -1;

    if (tables.length === 1) {
      targetTableIndex = 0;
      log.info('テーブルが1つのため、そのテーブルを処理します');
    } else if (tables.length === 2) {
      targetTableIndex = 1;
      log.info('テーブルが2つのため、2番目のテーブル（ドラフト対象者）を処理します');
    } else {
      targetTableIndex = tables.length - 1;
      log.warn(`予期しないテーブル数(${tables.length})のため、最後のテーブルを処理します`);
    }

    const targetTable = tables.eq(targetTableIndex);
    log.info(`テーブル ${targetTableIndex + 1} を処理中...`);

    const tableContent = targetTable.text();
    const isDraftEligible =
      !tableContent.includes('ドラフト対象外') && !tableContent.includes('NPBドラフト対象外');

    if (tables.length > 1 && !isDraftEligible && targetTableIndex === 0) {
      log.warn('1番目のテーブルがドラフト対象外のようです。2番目のテーブルを処理します。');
      targetTableIndex = 1;
    }

    targetTable.find('tbody tr').each((rowIndex, row) => {
      const cells = $(row).find('td');

      if (cells.length >= 4) {
        const prefecture = $(cells[0]).text().trim();
        const school = $(cells[1]).text().trim();
        const name = $(cells[2]).text().trim();
        const filingDate = $(cells[3]).text().trim();

        if (name && school && !name.includes('※') && name !== '氏名') {
          const playerId = `highschool_${year}_${String(players.length + 1).padStart(4, '0')}`;

          const player = {
            id: playerId,
            name: name,
            school: school,
            type: 'highschool',
            year: year,
            prefecture: prefecture || undefined,
            filingDate: parseDate(filingDate, year),
            isDraftEligible: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          players.push(player);

          if (players.length <= 5) {
            log.info(`選手データ ${players.length}:`, {
              name: player.name,
              school: player.school,
              prefecture: player.prefecture,
              isDraftEligible: player.isDraftEligible,
            });
          }
        }
      }
    });

    log.info(`合計抽出選手数（ドラフト対象者のみ）: ${players.length}名`);
    return players;
  } catch (error) {
    log.error('HTMLパースエラー:', error);
    throw new Error(`データ抽出に失敗しました: ${error.message}`);
  }
};

function processUniversityRow($, row, players, year) {
  const cells = $(row).find('td');

  if (cells.length >= 5) {
    const getCellText = cell => {
      const font = $(cell).find('font[color="#000000"]');
      return font.length > 0 ? font.text().trim() : $(cell).text().trim();
    };

    const region = getCellText(cells[0]);
    const school = getCellText(cells[1]);
    const name = getCellText(cells[2]);
    const furigana = getCellText(cells[3]);
    const filingDate = getCellText(cells[4]);

    if (
      name &&
      school &&
      name.trim() !== '' &&
      school.trim() !== '' &&
      name !== '氏名' &&
      school !== '学校名' &&
      name !== '&nbsp;' &&
      school !== '&nbsp;' &&
      !name.includes('※') &&
      school !== '<font color="#000000">' &&
      !school.includes('<font') &&
      name.length > 1 &&
      school.length > 1
    ) {
      const playerId = `university_${year}_${String(players.length + 1).padStart(4, '0')}`;
      const displayName = furigana && furigana.trim() !== '' ? `${name}(${furigana})` : name;

      let actualRegion = region;
      if (region === '〃' && players.length > 0) {
        const previousPlayer = players[players.length - 1];
        actualRegion = previousPlayer.region || previousPlayer.originalRegion;
      }

      const player = {
        id: playerId,
        name: displayName,
        school: school,
        type: 'university',
        year: year,
        region: actualRegion === '〃' ? undefined : actualRegion,
        filingDate: parseDate(filingDate, year),
        isDraftEligible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        originalName: name,
        originalRegion: region,
        furigana: furigana && furigana.trim() !== '' ? furigana : undefined,
      };

      players.push(player);

      if (players.length <= 5) {
        log.info(`大学生選手データ ${players.length}:`, {
          name: player.name,
          school: player.school,
          region: player.region,
          isDraftEligible: player.isDraftEligible,
        });
      }
    }
  }
}

export function parseUniversityData(html: string, year: number): Player[] {
  const $ = cheerio.load(html);
  const players = [];

  try {
    log.info('大学生データの解析開始...');

    let targetTables = $(
      'table.bodytext[width="100%"][border="0"][cellpadding="4"][cellspacing="1"][bgcolor="#808080"]'
    );

    if (targetTables.length === 0) {
      log.info('特定のテーブルクラスが見つからないため、全テーブルを検索します');
      targetTables = $('table');
    } else {
      log.info(`${targetTables.length}個の対象テーブルを見つけました`);
    }

    if (targetTables.length > 0) {
      const targetTable = targetTables.first();
      log.info('大学生データ: 最初のテーブル（ドラフト対象者）を処理します');

      const dataRows = $(targetTable).find('tr[align="center"][bgcolor="#ffffff"]');
      log.info(`データ行数: ${dataRows.length}行`);

      if (dataRows.length === 0) {
        $(targetTable)
          .find('tr')
          .each((rowIndex, row) => {
            processUniversityRow($, row, players, year);
          });
      } else {
        dataRows.each((rowIndex, row) => {
          processUniversityRow($, row, players, year);
        });
      }
    }

    log.info(`合計抽出大学生選手数: ${players.length}名`);
    return players;
  } catch (error) {
    log.error('大学生HTMLパースエラー:', error);
    throw new Error(`大学生データ抽出に失敗しました: ${error.message}`);
  }
}

export function detectNewPlayers(currentPlayers: any[], previousPlayers: any[]): any[] {
  const previousIds = new Set(previousPlayers.map(p => p.id));
  return currentPlayers.filter(p => !previousIds.has(p.id));
}
