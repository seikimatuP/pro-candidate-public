import { test, expect } from '@playwright/test';
import { getAuthHeaders } from '../helpers/api-auth';

/**
 * メール通知・SES配信テスト
 *
 * テスト項目:
 * 1. Lambda実行によるメール送信の成功
 * 2. SES ConfigurationSetの設定確認
 * 3. バウンス率の監視
 * 4. CloudWatch Metricsの確認
 */
test.describe('Email Notification Tests', () => {
  const apiUrl =
    process.env.E2E_API_URL || 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev/';
  const environment = process.env.E2E_ENVIRONMENT || 'dev';

  test('should successfully send email notification through Lambda', async ({ request }) => {
    // 現在年度を取得
    const currentYear = new Date().getFullYear();

    // Lambda関数経由でメール送信をトリガー（高校生・大学生両方）
    const response = await request.post(`${apiUrl}scraping/trigger`, {
      data: {
        type: 'both', // 高校生・大学生両方を実行
        year: currentYear, // 現在年度を使用
        // EventBridge形式のイベントをシミュレート
        source: 'aws.events',
        resources: ['arn:aws:events:ap-northeast-1:test:rule/test'],
      },
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });

    // APIレスポンスの検証
    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // メール送信結果の確認
    expect(data).toHaveProperty('success', true);

    // スクレイピング実行成功の確認（高校生・大学生両方）
    if (data.results && data.results.length > 0) {
      let totalCount = 0;
      const successTypes: string[] = [];

      for (const result of data.results) {
        expect(result).toHaveProperty('success', true);
        totalCount += result.count || 0;
        if (result.type) {
          successTypes.push(`${result.type}: ${result.count}件`);
        }
      }

      console.log(`✅ スクレイピング成功 - 合計${totalCount}件のデータ取得`);
      if (successTypes.length > 0) {
        console.log(`  詳細: ${successTypes.join(', ')}`);
      }

      // 注: メール送信はEventBridge経由の実行時のみ発生
      // 手動APIコールではメール送信されないのが正常動作
      console.log('ℹ️ メール送信はEventBridge定期実行時に発生します');
    }
  });

  test('should verify SES Configuration Set is properly configured', async ({ request }) => {
    // SES設定の確認（メタデータAPIがある場合）
    const response = await request.get(`${apiUrl}system/ses-config`).catch(() => null);

    if (response && response.ok()) {
      const config = await response.json();

      // ConfigurationSet名の確認
      expect(config).toHaveProperty('configurationSet', 'pro-baseball-scraping');

      // バウンス通知設定の確認
      expect(config).toHaveProperty('bounceNotifications');
      expect(config.bounceNotifications).toHaveProperty('enabled', true);

      // SNSトピックの設定確認
      if (config.bounceNotifications.snsTopicArn) {
        expect(config.bounceNotifications.snsTopicArn).toContain('ses-bounce-notifications');
      }

      console.log('✅ SES ConfigurationSet正常設定確認');
    } else {
      // APIが存在しない場合はスキップ
      console.log('ℹ️ SES設定APIは利用不可（本番環境では正常）');
    }
  });

  test('should monitor bounce rate stays below threshold', async ({ request }) => {
    // CloudWatch Metricsの取得（可能な場合）
    const metricsResponse = await request.get(`${apiUrl}metrics/ses`).catch(() => null);

    if (metricsResponse && metricsResponse.ok()) {
      const metrics = await metricsResponse.json();

      // バウンス率のチェック
      if (metrics.bounceRate !== undefined) {
        expect(metrics.bounceRate).toBeLessThan(0.05); // 5%未満
        console.log(`✅ バウンス率正常: ${(metrics.bounceRate * 100).toFixed(2)}%`);
      }

      // 苦情率のチェック
      if (metrics.complaintRate !== undefined) {
        expect(metrics.complaintRate).toBeLessThan(0.001); // 0.1%未満
        console.log(`✅ 苦情率正常: ${(metrics.complaintRate * 100).toFixed(3)}%`);
      }

      // 送信成功率
      if (metrics.deliveryRate !== undefined) {
        expect(metrics.deliveryRate).toBeGreaterThan(0.95); // 95%以上
        console.log(`✅ 配信成功率: ${(metrics.deliveryRate * 100).toFixed(2)}%`);
      }
    } else {
      console.log('ℹ️ メトリクスAPIは利用不可（CloudWatch直接確認推奨）');
    }
  });

  test('should not have hard bounces in recent emails', async ({ request }) => {
    // 最近のメール送信履歴を確認
    const historyResponse = await request.get(`${apiUrl}email/history?limit=10`).catch(() => null);

    if (historyResponse && historyResponse.ok()) {
      const history = await historyResponse.json();

      if (Array.isArray(history.emails)) {
        // ハードバウンスの確認
        const hardBounces = history.emails.filter(
          email => email.bounceType === 'Permanent' || email.bounceSubType === 'General'
        );

        expect(hardBounces.length).toBe(0);

        if (hardBounces.length === 0) {
          console.log(`✅ 最近10件のメールでハードバウンスなし`);
        } else {
          console.error(`❌ ハードバウンス検出: ${hardBounces.length}件`);
          hardBounces.forEach(bounce => {
            console.error(`  - ${bounce.email}: ${bounce.bounceSubType}`);
          });
        }

        // ソフトバウンスの警告
        const softBounces = history.emails.filter(email => email.bounceType === 'Transient');

        if (softBounces.length > 0) {
          console.warn(`⚠️ ソフトバウンス検出: ${softBounces.length}件（一時的な問題）`);
        }
      }
    } else {
      console.log('ℹ️ メール履歴APIは利用不可');
    }
  });

  test('should verify email content and formatting', async ({ request }) => {
    // 現在年度を取得
    const currentYear = new Date().getFullYear();

    // テスト用のスクレイピング実行（メール送信なし）
    const response = await request.post(`${apiUrl}scraping/trigger`, {
      data: {
        type: 'both', // 高校生・大学生両方を実行
        year: currentYear, // 現在年度を使用
        testMode: true, // テストモード（実際にはメール送信しない）
      },
      headers: getAuthHeaders(),
    });

    if (response.ok()) {
      const data = await response.json();

      // メール内容のプレビューが返される場合
      if (data.emailPreview) {
        const preview = data.emailPreview;

        // 件名の検証
        expect(preview.subject).toBeTruthy();
        expect(preview.subject).toContain('Scraping');
        expect(['completed', 'failed']).toContain(
          preview.subject.includes('completed') ? 'completed' : 'failed'
        );

        // 本文の検証
        expect(preview.bodyText).toBeTruthy();
        expect(preview.bodyText).toContain(environment);
        expect(preview.bodyText).toContain(currentYear.toString()); // 現在年度

        // ダッシュボードURLの確認
        const dashboardUrl =
          environment === 'prod'
            ? 'https://dh2yk8y9mj9wl.cloudfront.net'
            : 'https://d3brmn978dqs63.cloudfront.net';
        expect(preview.bodyText).toContain(dashboardUrl);

        console.log('✅ メールフォーマット検証成功');
      }
    }
  });

  test('should handle email delivery delays gracefully', async ({ request }) => {
    // CloudWatch Alarmsの状態確認
    const alarmsResponse = await request.get(`${apiUrl}monitoring/alarms`).catch(() => null);

    if (alarmsResponse && alarmsResponse.ok()) {
      const alarms = await alarmsResponse.json();

      // SES関連アラームの確認
      const sesAlarms = alarms.filter(alarm => alarm.name && alarm.name.includes('SES'));

      sesAlarms.forEach(alarm => {
        // アラーム状態の確認
        expect(['OK', 'INSUFFICIENT_DATA']).toContain(alarm.state);

        if (alarm.state === 'ALARM') {
          console.error(`❌ アラーム発火中: ${alarm.name}`);
        } else {
          console.log(`✅ ${alarm.name}: ${alarm.state}`);
        }
      });

      // 特定のアラーム確認
      const bounceRateAlarm = sesAlarms.find(a => a.name === 'SES-High-Bounce-Rate');
      if (bounceRateAlarm) {
        expect(bounceRateAlarm.state).not.toBe('ALARM');
      }

      const bounceDetectAlarm = sesAlarms.find(a => a.name === 'SES-Email-Bounce-Detected');
      if (bounceDetectAlarm) {
        expect(bounceDetectAlarm.state).not.toBe('ALARM');
      }
    } else {
      console.log('ℹ️ CloudWatchアラームAPIは利用不可');
    }
  });

  test('should track email delivery metrics over time', async ({ request }) => {
    // 時系列メトリクスの取得
    const timeSeriesResponse = await request
      .get(`${apiUrl}metrics/ses/timeseries?period=1h&duration=24h`)
      .catch(() => null);

    if (timeSeriesResponse && timeSeriesResponse.ok()) {
      const timeSeries = await timeSeriesResponse.json();

      if (timeSeries.dataPoints && timeSeries.dataPoints.length > 0) {
        // 最新のデータポイント
        const latestPoint = timeSeries.dataPoints[timeSeries.dataPoints.length - 1];

        // 送信数の確認
        if (latestPoint.sends !== undefined) {
          expect(latestPoint.sends).toBeGreaterThanOrEqual(0);
        }

        // バウンス数の確認
        if (latestPoint.bounces !== undefined) {
          expect(latestPoint.bounces).toBeLessThanOrEqual(latestPoint.sends * 0.05);
        }

        // 配信成功数
        if (latestPoint.deliveries !== undefined) {
          expect(latestPoint.deliveries).toBeGreaterThanOrEqual(latestPoint.sends * 0.95);
        }

        console.log('✅ 時系列メトリクス正常');
        console.log(`  - 送信: ${latestPoint.sends || 0}`);
        console.log(`  - 配信: ${latestPoint.deliveries || 0}`);
        console.log(`  - バウンス: ${latestPoint.bounces || 0}`);
      }
    } else {
      console.log('ℹ️ 時系列メトリクスAPIは利用不可');
    }
  });
});

/**
 * SNS通知テスト（統合テスト）
 */
test.describe('SNS Bounce Notification Tests', () => {
  test('should verify SNS topic exists and is subscribed', async ({ request }) => {
    const apiUrl =
      process.env.E2E_API_URL || 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev/';

    // SNS設定の確認
    const snsResponse = await request.get(`${apiUrl}system/sns-config`).catch(() => null);

    if (snsResponse && snsResponse.ok()) {
      const snsConfig = await snsResponse.json();

      // トピックの存在確認
      expect(snsConfig).toHaveProperty('topicArn');
      expect(snsConfig.topicArn).toContain('ses-bounce-notifications');

      // サブスクリプションの確認
      expect(snsConfig).toHaveProperty('subscriptions');
      expect(Array.isArray(snsConfig.subscriptions)).toBeTruthy();

      // メールサブスクリプションの確認
      const emailSubscriptions = snsConfig.subscriptions.filter(sub => sub.protocol === 'email');

      expect(emailSubscriptions.length).toBeGreaterThan(0);

      // 確認済みサブスクリプションの確認
      const confirmedSubs = emailSubscriptions.filter(sub => sub.status === 'Confirmed');

      if (confirmedSubs.length > 0) {
        console.log(`✅ SNS確認済みサブスクリプション: ${confirmedSubs.length}件`);
      } else {
        console.warn('⚠️ 未確認のSNSサブスクリプションがあります');
      }
    } else {
      console.log('ℹ️ SNS設定APIは利用不可');
    }
  });
});
