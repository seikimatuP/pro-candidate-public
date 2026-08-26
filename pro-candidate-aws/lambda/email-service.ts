/**
 * メール通知サービス
 * AWS SESを使用してスクレイピング結果を通知
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { log } from './logger';

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface ScrapingResult {
  type: string;
  year: number;
  count: number;
  success: boolean;
  environment: string;
  timestamp: string;
  results?: {
    type: string;
    success: boolean;
    count: number;
    error?: string;
  }[];
  error?: string;
}

interface Player {
  name: string;
  school: string;
  type: string;
  position?: string;
  [key: string]: any;
}

export class EmailService {
  private fromAddress: string;
  private toAddress: string;
  private client: SESClient;

  constructor(client?: SESClient) {
    this.fromAddress = process.env.SENDER_EMAIL || 'yuta.nozue@gmail.com';
    this.toAddress = process.env.EMAIL_TO || 'yuta.nozue@gmail.com';
    this.client = client || sesClient;
  }

  /**
   * スクレイピング完了通知メールを送信（新規選手情報付き）
   */
  public async sendScrapingCompletionEmailWithNewPlayers(
    results: ScrapingResult,
    newPlayers: Player[] = []
  ): Promise<EmailResult> {
    try {
      const subject = this.generateSubject(results, newPlayers.length > 0);
      const htmlBody = this.generateHtmlBodyWithNewPlayers(results, newPlayers);
      const textBody = this.generateTextBodyWithNewPlayers(results, newPlayers);

      const command = new SendEmailCommand({
        Source: this.fromAddress,
        Destination: {
          ToAddresses: [this.toAddress],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const response = await this.client.send(command);
      log.info('メール送信成功:', response.MessageId);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      log.error('メール送信エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 件名を生成
   */
  private generateSubject(results: ScrapingResult, hasNewPlayers: boolean): string {
    const { type, success, environment } = results;
    const status = success ? '完了' : '失敗';
    const envPrefix = environment === 'prod' ? '' : `[${environment}] `;
    const dataType = this.getDataTypeLabel(type);
    const newPlayerBadge = hasNewPlayers ? '【新規選手あり】' : '';

    return `${envPrefix}${newPlayerBadge}プロ野球志望届スクレイピング${status}: ${dataType}`;
  }

  /**
   * 新規選手リストを含むHTML本文を生成
   */
  private generateHtmlBodyWithNewPlayers(results: ScrapingResult, newPlayers: Player[]): string {
    const {
      type,
      year,
      count,
      success,
      environment,
      timestamp,
      results: detailResults,
      error,
    } = results;
    const dataType = this.getDataTypeLabel(type);
    const statusColor = success ? '#28a745' : '#dc3545';
    const statusText = success ? '成功' : '失敗';
    const jstTime = new Date(timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    .header { background-color: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; margin-bottom: 20px; }
    .status-badge { display: inline-block; padding: 5px 10px; border-radius: 4px; color: white; font-weight: bold; background-color: ${statusColor}; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .info-table th, .info-table td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
    .info-table th { width: 30%; background-color: #f9f9f9; }
    .error-box { background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #f5c6cb; }
    .success-box { background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #c3e6cb; }
    .new-players-box { background-color: #e8f4fd; border: 1px solid #b8daff; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
    .player-list { margin: 0; padding-left: 20px; }
    .player-list li { margin-bottom: 5px; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 15px; }
    .highlight { color: #e60000; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>プロ野球志望届データ収集通知</h2>
    </div>
    
    <div class="content">
      <p><span class="status-badge">${statusText}</span> ${environment || 'dev'}環境でのスクレイピングが完了しました。</p>
      
      <table class="info-table">
        <tr><th>実行日時</th><td>${jstTime} (JST)</td></tr>
        <tr><th>データタイプ</th><td>${dataType}</td></tr>
        <tr><th>対象年度</th><td>${year}年</td></tr>
        <tr><th>取得件数</th><td><strong>${count}件</strong></td></tr>
      </table>`;

    // 新規選手がいる場合は表示
    if (newPlayers && newPlayers.length > 0) {
      const highschoolPlayers = newPlayers.filter(p => p.type === 'highschool');
      const universityPlayers = newPlayers.filter(p => p.type === 'university');

      html += `
      <div class="new-players-box">
        <h3 style="margin-top: 0; color: #0056b3;">🆕 新規提出者: ${newPlayers.length}名</h3>
        <p>前回の実行から新たに追加された選手です。</p>`;

      if (highschoolPlayers.length > 0) {
        html += `<h4>高校生 (${highschoolPlayers.length}名)</h4>
        <ul class="player-list">`;
        highschoolPlayers.forEach(player => {
          html += `<li><strong>${player.name}</strong> (${player.school}${player.position ? ' / ' + player.position : ''})</li>`;
        });
        html += `</ul>`;
      }

      if (universityPlayers.length > 0) {
        html += `<h4>大学生 (${universityPlayers.length}名)</h4>
        <ul class="player-list">`;
        universityPlayers.forEach(player => {
          html += `<li><strong>${player.name}</strong> (${player.school}${player.position ? ' / ' + player.position : ''})</li>`;
        });
        html += `</ul>`;
      }

      html += `</div>`;
    } else if (success) {
      html += `
      <div style="padding: 10px; background-color: #f8f9fa; border-radius: 5px; margin-bottom: 20px; color: #666;">
        <em>新規提出者はありません（前日から変更なし）</em>
      </div>`;
    }

    // エラーがある場合は表示
    if (error) {
      html += `
      <div class="error-box">
        <strong>エラー詳細:</strong><br>
        ${error}
      </div>`;
    }

    // 詳細結果がある場合は表示
    if (detailResults && Array.isArray(detailResults)) {
      html += `
      <h3>詳細結果</h3>
      <table class="info-table">
        <tr>
          <th>タイプ</th>
          <th>状態</th>
          <th>件数</th>
          <th>メッセージ</th>
        </tr>`;

      detailResults.forEach(result => {
        const statusIcon = result.success ? '✅' : '❌';
        html += `
        <tr>
          <td>${this.getDataTypeLabel(result.type)}</td>
          <td>${statusIcon}</td>
          <td>${result.count || 0}件</td>
          <td>${result.error || 'OK'}</td>
        </tr>`;
      });

      html += '</table>';
    }

    // 成功時のメッセージ
    if (success && count > 0) {
      const dashboardUrl = this.getDashboardUrl(environment);
      html += `
      <div class="success-box">
        スクレイピングが正常に完了し、${count}件のデータを取得しました。<br>
        データはS3バケットに保存されています。<br><br>
        <a href="${dashboardUrl}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">ダッシュボードで確認</a>
      </div>`;
    }

    html += `
      <div class="footer">
        <p>このメールは自動送信されています。</p>
        <p>プロ野球志望届データ収集システム</p>
        <p style="font-size: 11px; color: #999;">
          配信停止をご希望の場合は、システム管理者にご連絡ください。<br>
          このメールアドレスは送信専用です。
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * 新規選手リストを含むテキスト本文を生成
   */
  private generateTextBodyWithNewPlayers(results: ScrapingResult, newPlayers: Player[]): string {
    const { type, year, count, success, environment, timestamp } = results;
    const dataType = this.getDataTypeLabel(type);
    const jstTime = new Date(timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const dashboardUrl = this.getDashboardUrl(environment);

    let bodyText = '';

    if (success) {
      bodyText += 'プロ野球志望届データ収集が完了しました。\n\n';
      bodyText += '====================\n';
      bodyText += '実行情報\n';
      bodyText += '====================\n';
      bodyText += `日時: ${jstTime} (JST)\n`;
      bodyText += `種別: ${dataType}\n`;
      bodyText += `年度: ${year}年\n`;
      bodyText += `環境: ${environment || 'dev'}環境\n`;
      bodyText += `総件数: ${count}件\n`;
      bodyText += '\n';

      if (newPlayers && newPlayers.length > 0) {
        bodyText += '====================\n';
        bodyText += `新規選手（前日比）: ${newPlayers.length}名\n`;
        bodyText += '====================\n\n';

        // 高校生と大学生を分けてリスト化
        const highschoolPlayers = newPlayers.filter(p => p.type === 'highschool');
        const universityPlayers = newPlayers.filter(p => p.type === 'university');

        if (highschoolPlayers.length > 0) {
          bodyText += `【高校生】${highschoolPlayers.length}名\n`;
          bodyText += '--------------------\n';
          highschoolPlayers.forEach(player => {
            bodyText += `${player.name} (${player.school}${player.position ? ' / ' + player.position : ''})\n`;
          });
          bodyText += '\n';
        }

        if (universityPlayers.length > 0) {
          bodyText += `【大学生】${universityPlayers.length}名\n`;
          bodyText += '--------------------\n';
          universityPlayers.forEach(player => {
            bodyText += `${player.name} (${player.school}${player.position ? ' / ' + player.position : ''})\n`;
          });
          bodyText += '\n';
        }
      } else {
        bodyText += '新規選手: なし（前日から変更なし）\n\n';
      }

      bodyText += '====================\n';
      bodyText += 'ダッシュボード\n';
      bodyText += '====================\n';
      bodyText += `${dashboardUrl}\n\n`;
    } else {
      bodyText += 'スクレイピング実行でエラーが発生しました。\n';
      bodyText += `詳細: ${results.error || 'Unknown error'}\n\n`;
    }

    bodyText += '--------------------\n';
    bodyText += 'このメールは自動送信されています。\n';
    bodyText += 'プロ野球志望届データ収集システム';

    return bodyText;
  }

  /**
   * データタイプのラベルを取得
   */
  private getDataTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      highschool: '高校生',
      university: '大学生',
      both: '高校生・大学生',
    };
    return labels[type] || type;
  }

  /**
   * 環境に応じたダッシュボードURLを取得
   */
  private getDashboardUrl(environment: string): string {
    // 環境変数から取得（Lambda環境変数で設定）
    const dashboardUrl = process.env.DASHBOARD_URL;
    if (dashboardUrl) {
      return dashboardUrl;
    }

    // フォールバック（環境変数が設定されていない場合）
    const urls: { [key: string]: string } = {
      dev: 'https://d3brmn978dqs63.cloudfront.net/',
      prod: 'https://dh2yk8y9mj9wl.cloudfront.net/',
    };
    return urls[environment] || urls.dev;
  }
}
