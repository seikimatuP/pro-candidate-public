import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface CloudFrontConstructProps {
  frontendBucket: s3.IBucket;
  stage: string;
  domainName?: string;
}

export class CloudFrontConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly distributionUrl: string;

  constructor(scope: Construct, id: string, props: CloudFrontConstructProps) {
    super(scope, id);

    // Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: `OAI for ${props.stage} frontend bucket`,
    });

    // Grant read permissions to CloudFront
    props.frontendBucket.grantRead(originAccessIdentity);

    // セキュリティヘッダーポリシー（Phase 3セキュリティ改善）
    const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      'SecurityHeadersPolicy',
      {
        responseHeadersPolicyName: `security-headers-${props.stage}`,
        comment: `Security headers for ${props.stage} environment`,
        securityHeadersBehavior: {
          // クリックジャッキング防止
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          // MIMEスニッフィング防止
          contentTypeOptions: {
            override: true,
          },
          // HTTPS強制（HSTS）
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.seconds(31536000), // 1年
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          // XSSフィルター（レガシーブラウザ対応）
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
          // リファラーポリシー
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
        },
        // カスタムヘッダー
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Permissions-Policy',
              value: 'geolocation=(), microphone=(), camera=(), payment=()',
              override: true,
            },
            {
              header: 'X-Permitted-Cross-Domain-Policies',
              value: 'none',
              override: true,
            },
          ],
        },
      }
    );

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(props.frontendBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeadersPolicy, // セキュリティヘッダー適用
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(300),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(300),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      comment: `Pro Baseball Frontend Distribution - ${props.stage}`,
      enabled: true,
    });

    this.distributionUrl = `https://${this.distribution.distributionDomainName}`;

    // Outputs
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionUrl', {
      value: this.distributionUrl,
      description: 'CloudFront Distribution URL (HTTPS)',
    });
  }
}
