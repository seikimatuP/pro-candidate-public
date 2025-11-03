# プロ野球志望届データ収集ツール - AWS アーキテクチャ構成図

## 全体アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           AWS Cloud (ap-northeast-1)                                │
│                                                                                     │
│  ┌─────────────────┐    ┌──────────────────┐   ┌─────────────────────────────────┐  │
│  │   Frontend      │    │    API Layer     │   │     Backend Processing          │  │
│  │                 │    │                  │   │                                 │  │
│  │ ┌─────────────┐ │    │ ┌──────────────┐ │   │ ┌─────────────┐ ┌─────────────┐ │  │
│  │ │   S3 Bucket │ │    │ │ API Gateway  │ │   │ │  Lambda     │ │  Lambda     │ │  │
│  │ │  Static Web │◄┼────┼─┤   REST API   │◄┼───┼─┤  Scraping   │ │ Processing  │ │  │
│  │ │   Hosting   │ │    │ │ 3 Endpoints  │ │   │ │    Dev      │ │     Dev     │ │  │
│  │ └─────────────┘ │    │ └──────────────┘ │   │ └─────────────┘ └─────────────┘ │  │
│  │                 │    │                  │   │       │               │         │  │
│  │ React 19.1.0    │    │ ┌──────────────┐ │   │       ▼               ▼         │  │
│  │ TypeScript      │    │ │   Lambda     │ │   │ ┌─────────────────────────────┐ │  │
│  │ Material-UI     │    │ │   API Dev    │ │   │ │      External Sources       │ │  │
│  │ Redux Toolkit   │    │ │  Node.js 18  │ │   │ │  NPB Official Websites      │ │  │
│  └─────────────────┘    │ └──────────────┘ │   │ │ ・High School Players       │ │  │
│                         └────────┼─────────┘   │ │ ・University Players        │ │  │
│                                  ▼             │ └─────────────────────────────┘ │  │
│                                                └─────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                        Data Storage (S3 + JSON)                             │    │
│  │                                                                             │    │
│  │ ┌─────────────┐ ┌───────────────────────────────────────────────────────┐   │    │
│  │ │   S3 Bucket │ │              Data Structure                           │   │    │
│  │ │ Data Storage│ │                                                       │   │    │
│  │ │   JSON      │ │  /players/                                            │   │    │
│  │ │   Files     │ │  ├── highschool/                                      │   │    │
│  │ └─────────────┘ │  │   ├── 2025.json (Player Data)                      │   │    │
│  │                 │  │   ├── 2024.json                                    │   │    │
│  │                 │  │   └── index.json (Metadata)                        │   │    │
│  │                 │  ├── university/                                      │   │    │
│  │                 │  │   ├── 2025.json                                    │   │    │
│  │                 │  │   └── index.json                                   │   │    │
│  │                 │  ├── combined/                                        │   │    │
│  │                 │  │   └── latest.json (Aggregated Data)                │   │    │
│  │                 │  └── cache/                                           │   │    │
│  │                 │      └── scraping-status.json                         │   │    │
│  │                 └───────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                      Security & Monitoring                                  │    │
│  │                                                                             │    │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │    │
│  │ │     IAM     │ │ CloudWatch  │ │   Budget    │ │      Cost Tracking      │ │    │
│  │ │   Roles &   │ │ Monitoring  │ │   Alerts    │ │   Monthly: $0.49        │ │    │
│  │ │  Policies   │ │    Logs     │ │   $1.00     │ │   Free Tier: 85%        │ │    │
│  │ │Least Priv.  │ │Error Track. │ │ Threshold   │ │   Anomaly Detection     │ │    │
│  │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                   Infrastructure as Code (AWS CDK)                          │    │
│  │                                                                             │    │
│  │ ┌─────────────┐ ┌───────────────────────────────────────────────────────┐   │    │
│  │ │  AWS CDK    │ │                CDK Constructs                         │   │    │
│  │ │ TypeScript  │ │                                                       │   │    │
│  │ │ProBaseball  │ │ ・SimpleFrontendConstruct (S3 Static Website)         │   │    │
│  │ │ Stack-dev   │ │ ・LambdaConstruct (3 Lambda Functions)                │   │    │
│  │ └─────────────┘ │ ・ApiGatewayConstruct (REST API)                      │   │    │
│  │                 │ ・S3Construct (Data Storage)                          │   │    │
│  │                 │ ・IAM Roles and Policies                              │   │    │
│  │                 └───────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## データフロー詳細

```
1. 【データ収集フロー】
   外部サイト → Lambda(Scraping) → S3(JSON保存) → インデックス更新

2. 【API アクセスフロー】
   Frontend → API Gateway → Lambda(API) → S3(データ取得) → JSON Response

3. 【ユーザーアクセスフロー】
   Browser → S3 Static Website → React App → API calls → Data Display
```

## 主要コンポーネント詳細

### Frontend Layer

- **S3 Static Website Hosting**
  - Bucket: `pro-candidate-frontend-dev`
  - URL: `http://pro-candidate-frontend-dev.s3-website-ap-northeast-1.amazonaws.com`
  - Technology: React 19.1.0 + TypeScript + Material-UI

### API Layer

- **API Gateway**

  - Type: REST API
  - Endpoints: `/players`, `/schools`, `/health`
  - CORS enabled
  - Lambda integration

- **Lambda Functions**
  - `pro-baseball-api-dev` (Node.js 18.x)
  - `pro-baseball-scraping-dev` (Data Collection)
  - `pro-baseball-processing-dev` (Data Processing)

### Data Storage

- **S3 Bucket**: `pro-candidate-data-dev`
- **Structure**: JSON-based file system
- **Benefits**: 99%+ cost reduction vs DynamoDB

### Security & Monitoring

- **IAM**: Least privilege access
- **CloudWatch**: Comprehensive logging
- **Cost Management**: $0.49/month target

## 技術スタック

| Layer          | Technology                 | Purpose                |
| -------------- | -------------------------- | ---------------------- |
| Frontend       | React 19.1.0 + TypeScript  | User Interface         |
| API            | AWS API Gateway + Lambda   | RESTful API            |
| Data           | S3 + JSON                  | Data Storage           |
| Infrastructure | AWS CDK (TypeScript)       | Infrastructure as Code |
| Monitoring     | CloudWatch + Budget Alerts | Observability          |
| Security       | IAM Roles + Policies       | Access Control         |

## 運用コスト (月額)

| Service     | Estimated Cost | Usage             |
| ----------- | -------------- | ----------------- |
| Lambda      | $0.20          | 1M requests       |
| S3          | $0.15          | 5GB storage       |
| API Gateway | $0.10          | 1M requests       |
| CloudWatch  | $0.04          | Monitoring        |
| **Total**   | **$0.49**      | **85% Free Tier** |

## デプロイメント状況

✅ **Phase 4 Complete (100%)**

- Frontend deployed to S3
- API Gateway + Lambda active
- S3 data storage ready
- Cost monitoring active

🚀 **Ready for Phase 5 Testing**
