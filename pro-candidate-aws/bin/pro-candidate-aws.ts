#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProCandidateAwsStack } from '../lib/pro-candidate-aws-stack';
import {
  loadCdkConfig,
  getEnvironmentConfig,
  getAwsConfig,
  getResourceConfig,
  getTagsConfig,
} from '../lib/config/cdk-config';

const app = new cdk.App();

// 設定を読み込み
const cdkConfig = loadCdkConfig();
const awsConfig = getAwsConfig();
const resourceConfig = getResourceConfig();

// 環境設定（環境変数で上書き可能）
const account = process.env.CDK_DEFAULT_ACCOUNT || awsConfig.account;
const region = process.env.CDK_DEFAULT_REGION || awsConfig.region;

// 共通スタック設定関数
const createStack = (stage: 'dev' | 'prod') => {
  const envConfig = getEnvironmentConfig(stage);
  const tags = getTagsConfig(stage);

  return new ProCandidateAwsStack(app, envConfig.stackName, {
    env: {
      account: account,
      region: region,
    },
    stage: stage,
    tableName: resourceConfig.dynamodb.tableName,
    enableScheduling: envConfig.enableScheduling,
    alertEmail: envConfig.alertEmail,

    // スタック設定
    description: `${cdkConfig.project.description} - ${stage} environment`,
    tags: tags,
  });
};

// dev環境スタック
createStack('dev');

// prod環境スタック
createStack('prod');
