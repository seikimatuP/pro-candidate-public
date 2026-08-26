import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { Handler } from 'aws-lambda';
import { log } from './logger';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const FUNCTIONS_TO_WARMUP = [
  'pro-baseball-scraping-dev',
  'pro-baseball-api-dev',
  'pro-baseball-scraping-prod',
  'pro-baseball-api-prod',
];

interface WarmupResult {
  functionName: string;
  status: 'success' | 'error';
  duration?: number;
  statusCode?: number;
  error?: string;
}

async function warmupFunction(functionName: string): Promise<WarmupResult> {
  try {
    const startTime = Date.now();

    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event', // 非同期呼び出し
      Payload: JSON.stringify({
        _warmup: true, // ウォームアップ識別フラグ
        timestamp: new Date().toISOString(),
      }),
    });

    const response = await lambdaClient.send(command);

    const duration = Date.now() - startTime;
    log.info(`✅ Warmed up ${functionName} in ${duration}ms`);

    return {
      functionName,
      status: 'success',
      duration,
      statusCode: response.StatusCode,
    };
  } catch (error: any) {
    log.error(`❌ Warmup failed for ${functionName}:`, error.message);
    return {
      functionName,
      status: 'error',
      error: error.message,
    };
  }
}

export const handler: Handler = async event => {
  log.info('🚀 Lambda Warmup initiated', {
    timestamp: new Date().toISOString(),
    event: event,
  });

  try {
    // すべての関数を並列ウォームアップ
    const results = await Promise.all(FUNCTIONS_TO_WARMUP.map(fn => warmupFunction(fn)));

    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'error').length;

    const summary = {
      timestamp: new Date().toISOString(),
      totalFunctions: results.length,
      successCount,
      failureCount,
      results,
      message: `Warmed up ${successCount}/${results.length} functions`,
    };

    log.info('📊 Warmup Summary:', JSON.stringify(summary, null, 2));

    return {
      statusCode: failureCount === 0 ? 200 : 206,
      body: JSON.stringify(summary),
    };
  } catch (error: any) {
    log.error('❌ Warmup process failed:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Warmup process failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
