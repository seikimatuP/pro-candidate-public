// @ts-nocheck
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { ScrapingHistoryService } from '../scraping-history-service';
import { log } from '../logger';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

export async function savePlayersDataToS3(players, type, year) {
  const bucketName = process.env.S3_DATA_BUCKET;
  log.debug(
    `S3保存開始: バケット=${bucketName}, タイプ=${type}, 年度=${year}, 選手数=${players.length}`
  );

  if (!bucketName) {
    throw new Error('S3_DATA_BUCKET environment variable not set');
  }

  const playersWithIds = players.map(player => ({
    ...player,
    id: player.id || uuidv4(),
    createdAt: player.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const dataFile = {
    metadata: {
      year,
      type,
      totalCount: playersWithIds.length,
      lastUpdated: new Date().toISOString(),
      version: '1.0',
    },
    players: playersWithIds,
  };

  const key = `players/${type}/${year}.json`;
  log.debug(`S3保存キー: ${key}`);

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(dataFile, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'record-count': playersWithIds.length.toString(),
        'data-type': type,
        year: year.toString(),
        'last-updated': new Date().toISOString(),
      },
    });

    log.debug('S3PutObjectCommand作成完了、送信中...');
    const result = await s3Client.send(command);
    log.debug('S3保存成功:', { ETag: result.ETag, VersionId: result.VersionId });

    log.info(`Successfully saved players data to ${key}`);

    try {
      await saveDailyHistory(playersWithIds, type, year);
    } catch (historyError) {
      log.warn('History save failed:', historyError);
    }

    try {
      await updateIndex(type);
    } catch (indexError) {
      log.warn('Index update failed:', indexError);
    }
  } catch (error) {
    log.error(`Failed to save players data to ${key}:`, error);
    throw error;
  }
}

export async function updateIndex(type) {
  const bucketName = process.env.S3_DATA_BUCKET;
  const indexKey = `players/${type}/index.json`;

  const index = {
    type,
    availableYears: [new Date().getFullYear()],
    totalRecords: 0,
    latestYear: new Date().getFullYear(),
    lastUpdated: new Date().toISOString(),
    files: [],
  };

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: indexKey,
        Body: JSON.stringify(index, null, 2),
        ContentType: 'application/json',
      })
    );

    log.info(`Successfully updated index for ${type}`);
  } catch (error) {
    log.error(`Failed to update index for ${type}:`, error);
  }
}

export async function updateScrapingStatus(status) {
  const bucketName = process.env.S3_DATA_BUCKET;
  const key = 'cache/scraping-status.json';

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(status, null, 2),
        ContentType: 'application/json',
        Metadata: {
          status: status.status,
          'last-run': status.lastRun,
          'updated-at': new Date().toISOString(),
        },
      })
    );

    log.info(`Updated scraping status: ${status.status}`);
  } catch (error) {
    log.error('Failed to update scraping status:', error);
  }
}

export async function handleScrapingHistoryRecording(type, result, environment, startTime, year) {
  try {
    if (!result.success) {
      log.info('スクレイピング失敗のため履歴は記録しません');
      return;
    }

    const bucketName = process.env.S3_DATA_BUCKET || 'pro-candidate-data-dev';
    const historyService = new ScrapingHistoryService(bucketName);
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    const lastExecutionDate = await historyService.getLastExecutionDate(type, environment);
    let daysSinceLastUpdate = null;

    if (lastExecutionDate) {
      const currentDate = new Date();
      const diffMs = currentDate - lastExecutionDate;
      daysSinceLastUpdate = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const differences = {};

    if (type === 'highschool' || type === 'both') {
      if (result.highschool?.success && result.highschool?.players) {
        differences.highschool = await historyService.calculateDifference(
          'highschool',
          result.highschool.players,
          environment
        );
      }
    }

    if (type === 'university' || type === 'both') {
      if (result.university?.success && result.university?.players) {
        differences.university = await historyService.calculateDifference(
          'university',
          result.university.players,
          environment
        );
      }
    }

    if (type !== 'both' && result.success && result.players) {
      differences[type] = await historyService.calculateDifference(
        type,
        result.players,
        environment
      );
    }

    if (Object.keys(differences).length === 0) {
      log.info('差分計算結果がないため履歴記録をスキップします');
      return;
    }

    const typeLabel =
      type === 'both'
        ? `${year}年度（高校生・大学生）`
        : type === 'highschool'
          ? `${year}年度（高校生）`
          : `${year}年度（大学生）`;

    const historyRecord = {
      id: `${new Date().toISOString().replace(/[:.]/g, '-')}_${type}_${year}`,
      timestamp: new Date().toISOString(),
      type,
      typeLabel,
      year,
      environment,
      duration,
      results: differences,
      summary: historyService.calculateSummary(differences),
      triggeredBy: 'manual',
      lastExecutionDate: lastExecutionDate ? lastExecutionDate.toISOString() : null,
      daysSinceLastUpdate,
      updatePeriod: daysSinceLastUpdate !== null ? `${daysSinceLastUpdate}日分` : '初回実行',
    };

    await historyService.saveScrapingHistory(historyRecord, environment);
    await historyService.updatePreviousCounts(differences, environment);

    log.info('スクレイピング履歴を記録しました:', {
      id: historyRecord.id,
      environment,
      duration,
      summary: historyRecord.summary,
    });
  } catch (error) {
    log.error('履歴記録エラー:', error);
  }
}

export async function saveDailyHistory(players, type, year) {
  const today = new Date().toISOString().split('T')[0];
  const historyKey = `history/${type}/${year}/${today}.json`;

  const historyData = {
    date: today,
    type: type,
    year: year,
    count: players.length,
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      school: p.school,
      position: p.position,
    })),
  };

  const params = {
    Bucket: process.env.S3_DATA_BUCKET,
    Key: historyKey,
    Body: JSON.stringify(historyData, null, 2),
    ContentType: 'application/json',
  };

  await s3Client.send(new PutObjectCommand(params));
  log.info(`履歴データ保存完了: ${historyKey}`);
}

export async function getPreviousPlayers(type, year) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const historyKey = `history/${type}/${year}/${yesterdayStr}.json`;

  try {
    const params = {
      Bucket: process.env.S3_DATA_BUCKET,
      Key: historyKey,
    };

    const response = await s3Client.send(new GetObjectCommand(params));
    const data = await response.Body.transformToString();
    const historyData = JSON.parse(data);

    return historyData.players || [];
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      log.info(`前日データなし: ${historyKey}`);
      return [];
    }
    log.error('前日データ取得エラー:', error);
    return [];
  }
}

export async function getLastExecutionDate() {
  const bucket = process.env.S3_DATA_BUCKET;
  if (!bucket) return null;

  const key = 'execution-tracking/last-execution.json';

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    const data = await response.Body.transformToString();
    const executionData = JSON.parse(data);

    return executionData.lastExecutionDate;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      log.info('実行履歴ファイルが存在しません。初回実行として処理します。');
      return null;
    }
    log.error('最終実行日の取得エラー:', error);
    return null;
  }
}

export async function updateExecutionDate() {
  const bucket = process.env.S3_DATA_BUCKET;
  if (!bucket) return;

  const today = new Date().toISOString().split('T')[0];
  const key = 'execution-tracking/last-execution.json';

  const executionData = {
    lastExecutionDate: today,
    lastExecutionTimestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'dev',
  };

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(executionData, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(command);
    log.info('実行日を更新しました:', executionData);
  } catch (error) {
    log.error('実行日の更新エラー:', error);
  }
}
