// @ts-nocheck
import * as monitoring from '../monitoring-helper';
import { log } from '../logger';
import { parseHighschoolData, parseUniversityData } from './parsers';
import { fetchHtml } from './html-fetcher';
import { savePlayersDataToS3 } from './s3-operations';
import { applyExclusionList, ExclusionListUnavailableError } from '../exclusion-list';

export async function scrapeHighschoolPlayers(year, config) {
  try {
    const baseUrl =
      config.scraping?.urls?.highschool ||
      process.env.HIGHSCHOOL_BASE_URL ||
      'https://www.jhbf.or.jp/pro-aspiring';
    const url = `${baseUrl}/${year}.html`;
    const settings = config.scraping?.settings || {};

    log.debug(`高校生スクレイピング対象URL: ${url}`, {
      timeout: settings.timeout,
      userAgent: settings.userAgent,
      configVersion: config.metadata?.version,
    });

    const html = await fetchHtml(url, {
      timeout: settings.timeout,
      retryCount: settings.retryCount,
      delayBetweenRequests: settings.delayBetweenRequests,
      userAgent: settings.userAgent,
    });
    if (!html) {
      throw new Error('HTMLデータの取得に失敗しました');
    }

    const parsedPlayers = parseHighschoolData(html, year);
    log.info(`抽出した選手数: ${parsedPlayers.length}名`);

    // 削除請求を受けた選手を保存前に除く（SCRAPING_POLICY.md 再収集の防止）。
    // 保存だけでなく戻り値からも除くことで、履歴・差分・通知にも残らないようにする。
    // 除外リストを読めなかった場合はここで例外が飛び、保存せずに失敗として返す
    // （読めないまま保存すると削除請求済みの選手が復活するため）
    const players = await applyExclusionList(parsedPlayers);

    if (players.length > 0) {
      try {
        await savePlayersDataToS3(players, 'highschool', year);
        log.info(`S3への保存完了: ${players.length}名`);

        try {
          await monitoring.recordProcessedCount('highschool', players.length);
        } catch (monitorError) {
          log.warn('Monitoring record failed:', monitorError);
        }
      } catch (s3Error) {
        log.error('S3保存エラー:', s3Error);
        throw new Error(`S3への保存に失敗しました: ${s3Error.message}`);
      }
    }

    return {
      success: true,
      count: players.length,
      message: `${year}年度の高校生データを${players.length}件取得しました`,
      dataAvailable: players.length > 0,
      players: players,
    };
  } catch (error) {
    log.error('高校生データスクレイピングエラー:', error);

    if (error instanceof ExclusionListUnavailableError) {
      return {
        success: false,
        count: 0,
        message: '削除請求の除外リストを確認できないため、データを保存せずに中止しました',
        error: error.message,
        players: [],
      };
    }

    if (error.message && error.message.includes('404')) {
      return {
        success: true,
        count: 0,
        message: `${year}年度の高校生データはまだ公開されていません`,
        dataAvailable: false,
        error: 'NOT_FOUND',
        players: [],
      };
    }

    return {
      success: false,
      count: 0,
      message: 'スクレイピングに失敗しました',
      error: error.message,
      players: [],
    };
  }
}

export async function scrapeUniversityPlayers(year, config) {
  try {
    const baseUrl =
      config.scraping?.urls?.university ||
      process.env.UNIVERSITY_BASE_URL ||
      'https://www.jubf.net/system/prog/procandidate.php';
    const url = `${baseUrl}?kind=all&year=${year}`;
    const settings = config.scraping?.settings || {};

    log.debug(`大学生スクレイピング対象URL: ${url}`, {
      timeout: settings.timeout,
      userAgent: settings.userAgent,
      configVersion: config.metadata?.version,
    });

    const html = await fetchHtml(url, {
      timeout: settings.timeout,
      retryCount: settings.retryCount,
      delayBetweenRequests: settings.delayBetweenRequests,
      userAgent: settings.userAgent,
    });
    if (!html) {
      throw new Error('HTMLデータの取得に失敗しました');
    }

    const parsedPlayers = parseUniversityData(html, year);
    log.info(`抽出した大学生選手数: ${parsedPlayers.length}名`);

    // 高校生側と同じく、削除請求を受けた選手を保存前に除く
    const players = await applyExclusionList(parsedPlayers);

    if (players.length > 0) {
      await savePlayersDataToS3(players, 'university', year);
      await monitoring.recordProcessedCount('university', players.length);
      log.info(`S3への保存完了: ${players.length}名`);
    }

    return {
      success: true,
      count: players.length,
      message:
        players.length > 0
          ? `${year}年度の大学生データを${players.length}件取得しました`
          : `${year}年度の大学生データはまだ公開されていません（0件）`,
      dataAvailable: players.length > 0,
      players: players,
    };
  } catch (error) {
    log.error('大学生データスクレイピングエラー:', error);

    if (error instanceof ExclusionListUnavailableError) {
      return {
        success: false,
        count: 0,
        message: '削除請求の除外リストを確認できないため、データを保存せずに中止しました',
        error: error.message,
        players: [],
      };
    }

    return {
      success: false,
      count: 0,
      message: 'スクレイピングに失敗しました',
      error: error.message,
      players: [],
    };
  }
}
