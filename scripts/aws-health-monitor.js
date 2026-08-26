/**
 * AWS環境ヘルスモニタリングスクリプト
 * 定期的なシステム正常性チェックと問題早期発見
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class AWSHealthMonitor {
  constructor() {
    this.baseUrl = 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev';
    this.checkInterval = 300000; // 5分間隔
    this.logFile = path.join(__dirname, '../logs/health-monitor.log');
    this.alertThresholds = {
      responseTime: 5000, // 5秒
      errorRate: 5, // 5%
      consecutiveFailures: 3
    };
    this.consecutiveFailures = 0;
  }

  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const req = https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          resolve({
            statusCode: res.statusCode,
            responseTime,
            data: data ? JSON.parse(data) : null,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        });
      });
      
      req.on('error', (error) => {
        reject({
          error: error.message,
          responseTime: Date.now() - startTime,
          success: false
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject({
          error: 'Request timeout',
          responseTime: 10000,
          success: false
        });
      });
    });
  }

  async checkHealthEndpoint() {
    try {
      const result = await this.makeRequest(`${this.baseUrl}/health`);
      
      if (result.success && result.responseTime < this.alertThresholds.responseTime) {
        this.consecutiveFailures = 0;
        return {
          endpoint: 'health',
          status: 'healthy',
          responseTime: result.responseTime,
          statusCode: result.statusCode
        };
      } else {
        this.consecutiveFailures++;
        return {
          endpoint: 'health',
          status: 'warning',
          responseTime: result.responseTime,
          statusCode: result.statusCode,
          issue: result.responseTime >= this.alertThresholds.responseTime ? 'slow_response' : 'http_error'
        };
      }
    } catch (error) {
      this.consecutiveFailures++;
      return {
        endpoint: 'health',
        status: 'error',
        error: error.error || error.message,
        responseTime: error.responseTime || null
      };
    }
  }

  async checkPlayersAPI() {
    try {
      const result = await this.makeRequest(`${this.baseUrl}/players?type=highschool&year=2024`);
      
      if (result.success && result.data && result.data.success) {
        return {
          endpoint: 'players',
          status: 'healthy',
          responseTime: result.responseTime,
          dataCount: result.data.data ? result.data.data.length : 0
        };
      } else {
        return {
          endpoint: 'players',
          status: 'warning',
          responseTime: result.responseTime,
          statusCode: result.statusCode,
          issue: 'api_error'
        };
      }
    } catch (error) {
      return {
        endpoint: 'players',
        status: 'error',
        error: error.error || error.message,
        responseTime: error.responseTime || null
      };
    }
  }

  async runHealthCheck() {
    const timestamp = new Date().toISOString();
    console.log(`🔍 [${timestamp}] AWS環境ヘルスチェック開始`);
    
    const results = await Promise.all([
      this.checkHealthEndpoint(),
      this.checkPlayersAPI()
    ]);
    
    const report = {
      timestamp,
      results,
      consecutiveFailures: this.consecutiveFailures,
      overallStatus: this.calculateOverallStatus(results)
    };
    
    this.logResults(report);
    this.checkAlerts(report);
    
    return report;
  }

  calculateOverallStatus(results) {
    const errors = results.filter(r => r.status === 'error').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    if (errors > 0) return 'error';
    if (warnings > 0) return 'warning';
    return 'healthy';
  }

  logResults(report) {
    const logEntry = `${report.timestamp} - Status: ${report.overallStatus} - Failures: ${report.consecutiveFailures}/n`;
    
    // ログファイルに記録
    try {
      const logsDir = path.dirname(this.logFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('ログファイル書き込みエラー:', error.message);
    }
    
    // コンソール出力
    report.results.forEach(result => {
      const status = result.status === 'healthy' ? '✅' : 
                    result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${status} ${result.endpoint}: ${result.status} (${result.responseTime}ms)`);
      
      if (result.error) {
        console.log(`   エラー: ${result.error}`);
      }
      if (result.issue) {
        console.log(`   問題: ${result.issue}`);
      }
      if (result.dataCount !== undefined) {
        console.log(`   データ件数: ${result.dataCount}`);
      }
    });
  }

  checkAlerts(report) {
    if (this.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
      console.log('🚨 アラート: 連続失敗回数が閾値を超えました');
      console.log(`   連続失敗回数: ${this.consecutiveFailures}/${this.alertThresholds.consecutiveFailures}`);
    }
    
    const criticalErrors = report.results.filter(r => r.status === 'error');
    if (criticalErrors.length > 0) {
      console.log('🚨 クリティカルエラー検出:');
      criticalErrors.forEach(error => {
        console.log(`   - ${error.endpoint}: ${error.error}`);
      });
    }
  }

  async startMonitoring() {
    console.log('🚀 AWS環境モニタリング開始');
    console.log(`   チェック間隔: ${this.checkInterval / 1000}秒`);
    console.log(`   レスポンス時間閾値: ${this.alertThresholds.responseTime}ms`);
    console.log(`   連続失敗閾値: ${this.alertThresholds.consecutiveFailures}回`);
    
    // 初回チェック
    await this.runHealthCheck();
    
    // 定期実行
    setInterval(() => {
      this.runHealthCheck().catch(error => {
        console.error('ヘルスチェック実行エラー:', error);
      });
    }, this.checkInterval);
  }

  async runOnce() {
    return await this.runHealthCheck();
  }
}

// CLIから実行された場合
if (require.main === module) {
  const monitor = new AWSHealthMonitor();
  
  if (process.argv.includes('--continuous')) {
    monitor.startMonitoring();
  } else {
    monitor.runOnce().then(report => {
      console.log(`\n📊 総合ステータス: ${report.overallStatus}`);
      process.exit(report.overallStatus === 'healthy' ? 0 : 1);
    });
  }
}

module.exports = AWSHealthMonitor;