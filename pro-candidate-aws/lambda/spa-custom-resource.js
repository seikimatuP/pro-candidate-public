const {
  S3Client,
  PutBucketWebsiteCommand,
  GetBucketWebsiteCommand,
} = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

/**
 * SPA用S3 Website設定Custom Resource
 * CDK TypeScript型エラーを回避してRoutingRulesを設定
 */
exports.handler = async event => {
  console.log('SPA Custom Resource Event:', JSON.stringify(event, null, 2));

  const { RequestType, ResourceProperties, PhysicalResourceId } = event;
  const {
    BucketName,
    IndexDocument = 'index.html',
    ErrorDocument = 'index.html',
  } = ResourceProperties;

  const responseData = {};
  let physicalResourceId = PhysicalResourceId || `spa-config-${BucketName}`;

  try {
    switch (RequestType) {
      case 'Create':
      case 'Update':
        console.log(`${RequestType}: SPA設定をバケット ${BucketName} に適用中...`);

        // SPA用Website設定
        const websiteConfig = {
          IndexDocument: { Suffix: IndexDocument },
          ErrorDocument: { Key: ErrorDocument },
          RoutingRules: [
            {
              Condition: {
                HttpErrorCodeReturnedEquals: '404',
              },
              Redirect: {
                ReplaceKeyWith: IndexDocument,
              },
            },
          ],
        };

        const putCommand = new PutBucketWebsiteCommand({
          Bucket: BucketName,
          WebsiteConfiguration: websiteConfig,
        });

        await s3Client.send(putCommand);
        console.log(`✅ SPA設定完了: ${BucketName}`);

        // 設定確認
        const getCommand = new GetBucketWebsiteCommand({ Bucket: BucketName });
        const result = await s3Client.send(getCommand);
        console.log('適用された設定:', JSON.stringify(result, null, 2));

        responseData.Status = 'SUCCESS';
        responseData.BucketName = BucketName;
        responseData.WebsiteConfiguration = 'Applied';
        responseData.RoutingRules = 'Configured';
        break;

      case 'Delete':
        console.log(`Delete: SPA設定削除（${BucketName}）`);
        // バケット削除時は何もしない（S3バケット自体の削除でWebsite設定も削除される）
        responseData.Status = 'SUCCESS';
        responseData.Action = 'Deleted';
        break;

      default:
        throw new Error(`未対応のRequestType: ${RequestType}`);
    }

    return await sendResponse(event, 'SUCCESS', responseData, physicalResourceId);
  } catch (error) {
    console.error('❌ SPA Custom Resource エラー:', error);
    console.error('エラー詳細:', JSON.stringify(error, null, 2));
    console.error('スタック情報:', error.stack);

    // エラー詳細情報を記録
    responseData.Status = 'FAILED';
    responseData.ErrorMessage = error.message;
    responseData.ErrorName = error.name;
    responseData.ErrorCode = error.$metadata?.httpStatusCode || 'Unknown';

    // CloudFormationにFAILUREを返す（問題を明示的に通知）
    return await sendResponse(event, 'FAILED', responseData, physicalResourceId);
  }
};

/**
 * CloudFormationにレスポンスを送信
 */
async function sendResponse(event, responseStatus, responseData, physicalResourceId) {
  const responseBody = {
    Status: responseStatus,
    Reason: `See CloudWatch Log Stream: ${process.env.AWS_LAMBDA_LOG_STREAM_NAME || 'N/A'}`,
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  };

  console.log('Response body:', JSON.stringify(responseBody, null, 2));

  // Node.js標準HTTPSモジュールを使用（外部依存関係なし）
  const https = require('https');
  const url = require('url');

  return new Promise((resolve, reject) => {
    const parsedUrl = new url.URL(event.ResponseURL);
    const requestBody = JSON.stringify(responseBody);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PUT',
      headers: {
        'Content-Type': '',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, res => {
      console.log('CloudFormation response status:', res.statusCode);
      res.on('data', data => {
        console.log('CloudFormation response data:', data.toString());
      });
      res.on('end', () => {
        resolve(responseBody);
      });
    });

    req.on('error', error => {
      console.error('CloudFormation response error:', error);
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}
