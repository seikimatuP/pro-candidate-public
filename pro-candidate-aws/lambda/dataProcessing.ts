import { Handler } from 'aws-lambda';
import { log } from './logger';

export const handler: Handler = async event => {
  log.info('Data Processing Lambda invoked:', JSON.stringify(event, null, 2));

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Data processing completed',
      timestamp: new Date().toISOString(),
      environment: process.env.ENVIRONMENT,
      s3Bucket: process.env.S3_DATA_BUCKET,
    }),
  };

  return response;
};
