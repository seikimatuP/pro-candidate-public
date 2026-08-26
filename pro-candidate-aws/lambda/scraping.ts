// @ts-nocheck
import { Handler } from 'aws-lambda';
import { ConfigManager } from './config-manager';
import * as monitoring from './monitoring-helper';
import { log } from './logger';
import { EmailService } from './email-service';
import {
  parseHighschoolData,
  parseUniversityData,
  parseDate,
  detectNewPlayers,
} from './scraping/parsers';
import { scrapeHighschoolPlayers, scrapeUniversityPlayers } from './scraping/scraping-executor';
import { evaluateScrapingWindow } from './scraping-window';
import {
  updateScrapingStatus,
  handleScrapingHistoryRecording,
  getPreviousPlayers,
  getLastExecutionDate,
  updateExecutionDate,
  savePlayersDataToS3,
  updateIndex,
  saveDailyHistory,
} from './scraping/s3-operations';

export { parseHighschoolData, parseUniversityData, parseDate, detectNewPlayers };
export {
  scrapeHighschoolPlayers,
  scrapeUniversityPlayers,
  updateScrapingStatus,
  handleScrapingHistoryRecording,
  getPreviousPlayers,
  getLastExecutionDate,
  updateExecutionDate,
  savePlayersDataToS3,
  updateIndex,
  saveDailyHistory,
};

interface ScrapingEvent {
  year?: number;
  type?: 'highschool' | 'university' | 'both';
  source?: string;
  'detail-type'?: string;
  resources?: string[];
}

const configManager = new ConfigManager();
const emailService = new EmailService();

/**
 * 高校生プロ志望届データのスクレイピングLambda関数
 */
export const handler: Handler<ScrapingEvent, any> = async event => {
  log.info('Scraping Lambda invoked:', JSON.stringify(event, null, 2));
  const startTime = Date.now();

  try {
    // メモリ使用量を記録
    await monitoring.recordMemoryUsage();

    // prod環境での1日1回実行制限チェック（Frontendからの実行のみ適用）
    // EventBridge定期実行は制限から除外して、常にメール送信可能にする
    const environment = process.env.ENVIRONMENT || 'dev';
    const isEventBridgeSource =
      event.source === 'aws.events' ||
      event.source === 'EventBridge' ||
      event.source === 'EventBridge-Test' ||
      event['detail-type'] !== undefined ||
      (event.resources && event.resources.length > 0);

    // 定期実行（EventBridge）は稼働期間内のときだけ走らせる
    //
    // 志望届の公示はシーズンが限られるため通年で回す必要がない。EventBridgeは
    // 平日17:30 JSTに毎週発火させたうえで、ここで「今日が期間内か」を判定して
    // 期間外なら何もせず終了する。期間はSSMパラメータで持つのでコード変更なしに変えられる。
    // 未設定・不正・取得失敗はすべてスキップ（安全側）。
    // 手動実行（Frontend等）はシーズン外の再取得もあり得るため対象外にする。
    if (isEventBridgeSource) {
      const decision = await evaluateScrapingWindow(environment, name =>
        configManager.getSSMParameter(name)
      );

      if (!decision.shouldRun) {
        log.info('定期実行を稼働期間外としてスキップしました', {
          reason: decision.reason,
          today: decision.today,
          period: decision.period,
          environment,
          source: event.source,
        });

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: true,
            skipped: true,
            message: decision.reason,
            today: decision.today,
            period: decision.period,
            environment,
          }),
        };
      }

      log.info('定期実行が稼働期間内のため続行します', {
        today: decision.today,
        period: decision.period,
      });
    }

    // Frontendからの実行のみ1日1回制限を適用
    // EventBridge定期実行は制限なしで常に実行可能
    if (environment === 'prod' && event.source === 'Frontend') {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
      const lastExecutionDate = await getLastExecutionDate();

      if (lastExecutionDate === today) {
        log.info('本日のフロントエンドからのスクレイピングは既に実行済みです', {
          lastExecution: lastExecutionDate,
          today: today,
          environment: environment,
          source: event.source,
        });

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false, // フロントエンド用にfalseに変更
            skipped: true,
            message: '本日のスクレイピングは既に実行済みです',
            lastExecutionDate: lastExecutionDate,
            environment: environment,
            error: 'ALREADY_EXECUTED_TODAY', // エラーコード追加
          }),
        };
      }
    }

    // スクレイピング設定をS3からロード
    const scrapingConfig = await configManager.getScrapingConfig();
    log.info('Scraping configuration loaded:', {
      version: scrapingConfig.metadata?.version,
      source: scrapingConfig.metadata?.source,
      urls: Object.keys(scrapingConfig.scraping?.urls || {}),
    });

    // 年度パラメータの処理（未指定時は現在年を使用）
    const currentYear = new Date().getFullYear();
    const year = event.year || currentYear;

    // 年度の妥当性チェック（2020年〜現在年+1年までを許可）
    const minYear = 2020;
    const maxYear = currentYear + 1;
    if (year < minYear || year > maxYear) {
      throw new Error(`年度は${minYear}年から${maxYear}年の範囲で指定してください`);
    }

    const type = event.type || 'highschool'; // 'highschool', 'university', または 'both'

    log.info(`${year}年度の${type}データをスクレイピング開始`, {
      yearProvided: !!event.year,
      defaultYear: currentYear,
      requestedYear: year,
    });

    let result: any = { players: [] };

    if (type === 'both') {
      // 両方のデータを取得
      const [highschoolResult, universityResult] = await Promise.all([
        monitoring.measureOperation('ScrapeHighschool', () =>
          scrapeHighschoolPlayers(year, scrapingConfig)
        ),
        monitoring.measureOperation('ScrapeUniversity', () =>
          scrapeUniversityPlayers(year, scrapingConfig)
        ),
      ]);
      result = {
        highschool: highschoolResult,
        university: universityResult,
        players: [...(highschoolResult.players || []), ...(universityResult.players || [])],
        success: highschoolResult.success && universityResult.success,
        message: `高校生: ${highschoolResult.count}件, 大学生: ${universityResult.count}件`,
        count: (highschoolResult.count || 0) + (universityResult.count || 0),
      };
    } else if (type === 'highschool') {
      result = await monitoring.measureOperation('ScrapeHighschool', () =>
        scrapeHighschoolPlayers(year, scrapingConfig)
      );
    } else if (type === 'university') {
      result = await monitoring.measureOperation('ScrapeUniversity', () =>
        scrapeUniversityPlayers(year, scrapingConfig)
      );
    } else {
      throw new Error(`未対応のデータタイプ: ${type}`);
    }

    // スクレイピング状況をS3に保存
    await updateScrapingStatus({
      lastRun: new Date().toISOString(),
      status: result.success ? 'success' : 'failed',
      results:
        type === 'both'
          ? {
              highschool: {
                attempted: true,
                success: result.highschool?.success,
                recordsFound: result.highschool?.count,
                errorMessage: result.highschool?.error,
              },
              university: {
                attempted: true,
                success: result.university?.success,
                recordsFound: result.university?.count,
                errorMessage: result.university?.error,
              },
            }
          : {
              [type]: {
                attempted: true,
                success: result.success,
                recordsFound: result.count,
                errorMessage: result.error,
              },
            },
      nextScheduledRun: '',
    });

    // 正常終了時のみスクレイピング履歴を記録
    await handleScrapingHistoryRecording(type, result, environment, startTime, year);

    // メール通知の送信（EventBridgeからの定期実行時のみ送信）
    // EventBridgeのイベントは event.source が 'aws.events' または event['detail-type'] が存在する
    const isEventBridgeEvent =
      event.source === 'aws.events' ||
      event.source === 'EventBridge' ||
      event['detail-type'] !== undefined ||
      (event.resources && event.resources.length > 0);

    log.info('メール送信条件チェック:', {
      enableEmail: process.env.ENABLE_EMAIL_NOTIFICATION,
      eventSource: event.source,
      detailType: event['detail-type'],
      hasResources: !!(event.resources && event.resources.length > 0),
      isEventBridgeEvent: isEventBridgeEvent,
    });

    if (process.env.ENABLE_EMAIL_NOTIFICATION === 'true' && isEventBridgeEvent) {
      try {
        log.info('メール通知を送信します（新規選手情報付き）');

        // 前日データとの比較を実行
        let allNewPlayers = [];

        if (result.success) {
          // 高校生の新規選手を検出
          if ((type === 'highschool' || type === 'both') && result.highschool?.players) {
            const previousHighschool = await getPreviousPlayers('highschool', year);
            const newHighschool = detectNewPlayers(result.highschool.players, previousHighschool);
            newHighschool.forEach(p => (p.type = 'highschool'));
            allNewPlayers = allNewPlayers.concat(newHighschool);
          }

          // 大学生の新規選手を検出
          if ((type === 'university' || type === 'both') && result.university?.players) {
            const previousUniversity = await getPreviousPlayers('university', year);
            const newUniversity = detectNewPlayers(result.university.players, previousUniversity);
            newUniversity.forEach(p => (p.type = 'university'));
            allNewPlayers = allNewPlayers.concat(newUniversity);
          }

          // 単一タイプの場合
          if (type !== 'both' && result.players) {
            const previousPlayers = await getPreviousPlayers(type, year);
            const newPlayers = detectNewPlayers(result.players, previousPlayers);
            newPlayers.forEach(p => (p.type = type));
            allNewPlayers = newPlayers;
          }
        }

        log.info(`新規選手検出完了: ${allNewPlayers.length}名`);

        // 新規選手リストを含むメールを送信
        const emailResult: any = await emailService.sendScrapingCompletionEmailWithNewPlayers(
          {
            type: type,
            year: year,
            count: result.count,
            success: result.success,
            environment: environment,
            timestamp: new Date().toISOString(),
            results:
              type === 'both'
                ? [
                    {
                      type: 'highschool',
                      success: result.highschool?.success || false,
                      count: result.highschool?.count || 0,
                      error: result.highschool?.error,
                    },
                    {
                      type: 'university',
                      success: result.university?.success || false,
                      count: result.university?.count || 0,
                      error: result.university?.error,
                    },
                  ]
                : [
                    {
                      type: type,
                      success: result.success,
                      count: result.count,
                      error: result.error,
                    },
                  ],
            error: result.error,
          },
          allNewPlayers // 新規選手リストを第2引数として追加
        );

        if (emailResult.success) {
          log.info('メール通知送信成功', { messageId: emailResult.messageId });
        } else {
          log.warn('メール通知送信失敗', { error: emailResult.error });
        }
      } catch (emailError) {
        // メール送信エラーはスクレイピング処理自体には影響させない
        log.error('メール通知送信中のエラー', emailError);
      }
    }

    // prod環境でFrontend実行の場合のみ実行日を更新
    // EventBridge定期実行の場合は実行日を更新しない（何度でも実行可能にするため）
    if (environment === 'prod' && event.source === 'Frontend' && result.success) {
      await updateExecutionDate();
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: result.success,
        message: result.message,
        type: type,
        year: year,
        count: result.count,
        timestamp: new Date().toISOString(),
        environment: process.env.ENVIRONMENT,
        s3Bucket: process.env.S3_DATA_BUCKET,
        // 詳細な結果を追加
        results:
          type === 'both'
            ? [
                {
                  type: 'highschool',
                  success: result.highschool?.success || false,
                  count: result.highschool?.count || 0,
                  error: result.highschool?.error,
                },
                {
                  type: 'university',
                  success: result.university?.success || false,
                  count: result.university?.count || 0,
                  error: result.university?.error,
                },
              ]
            : [
                {
                  type: type,
                  success: result.success,
                  count: result.count,
                  error: result.error,
                },
              ],
      }),
    };
  } catch (error) {
    log.error('スクレイピングエラー:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'スクレイピングに失敗しました',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
