# SPA CDK Custom Resource 設計案

## 概要

CDK TypeScript型エラーを回避しつつ、SPA RoutingRulesを自動設定するCustom Resource実装案

## 実装アプローチ

### 1. Custom Resource Lambda関数

```typescript
// spa-custom-resource.ts
export const handler = async (event: any) => {
  const { RequestType, ResourceProperties } = event;
  const { BucketName } = ResourceProperties;

  if (RequestType === 'Create' || RequestType === 'Update') {
    await s3
      .putBucketWebsite({
        Bucket: BucketName,
        WebsiteConfiguration: {
          IndexDocument: { Suffix: 'index.html' },
          ErrorDocument: { Key: 'index.html' },
          RoutingRules: [
            {
              Condition: { HttpErrorCodeReturnedEquals: '404' },
              Redirect: { ReplaceKeyWith: 'index.html' },
            },
          ],
        },
      })
      .promise();
  }
};
```

### 2. CDK Construct

```typescript
// simple-frontend-construct.ts
import { CustomResource } from 'aws-cdk-lib';

// S3バケット作成後
const spaConfig = new CustomResource(this, 'SPAConfiguration', {
  serviceToken: spaCustomResourceProvider.serviceToken,
  properties: {
    BucketName: this.bucket.bucketName,
  },
});
```

## 利点・欠点

### 利点

- 完全自動化
- CDK管理下での設定
- インフラ変更時の整合性保証

### 欠点

- 実装複雑性増加
- デバッグの困難性
- 現在の手動管理で十分

## 推奨

現段階では **CI/CD自動修正アプローチ** を推奨
