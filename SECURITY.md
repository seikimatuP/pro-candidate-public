# Security Policy - セキュリティポリシー

[English](#english) | [日本語](#日本語)

---

## English

### Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability in this project, please **do not** create a public GitHub issue. Instead:

1. **Email Security Report**: Send details to [security contact] with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested remediation (if any)

2. **Include**:
   - Your name and affiliation
   - How you discovered the vulnerability
   - Timeline for responsible disclosure

### Security Considerations

#### What We Protect

- ✅ **Source Code**: All TypeScript/JavaScript code is open source
- ✅ **Architecture**: Infrastructure as Code (AWS CDK) is public
- ✅ **Documentation**: Technical specifications and guides are public
- ✅ **Tests**: E2E and unit tests are public

#### What We Do NOT Publish

- 🔒 **Environment Variables**: `.env` files with sensitive data
- 🔒 **AWS Credentials**: IAM keys, SSO tokens, secrets
- 🔒 **API Keys**: Service credentials and authentication tokens
- 🔒 **Passwords**: Test user credentials and passwords

### Dependency Security

We use:

- **npm audit** for regular vulnerability scanning
- **Dependabot** for automated dependency updates
- **GitHub Security Features** for vulnerability detection

### Authentication & Secrets Management

This project uses:

- **AWS SSO** (IAM Identity Center) for CLI authentication
- **AWS Cognito** for application authentication (credentials not in code)
- **Environment Variables** for configuration (not in version control)

### Best Practices We Follow

1. **No Hardcoding Secrets**
   - All sensitive data stored in environment variables
   - AWS credentials managed via SSO

2. **Input Validation**
   - TypeScript strict mode enabled
   - XSS/SQL injection prevention in place

3. **HTTPS Enforcement**
   - CloudFront for HTTPS-only delivery
   - API Gateway with CORS security

4. **IAM Least Privilege**
   - Lambda functions with minimal required permissions
   - S3 bucket policies restrict access

5. **Monitoring & Logging**
   - CloudWatch logs for security events
   - Error tracking and reporting

### Version Security

- Current Stable: `v1.2.96`
- Framework: AWS Lambda, S3, API Gateway
- Node.js: 18.x or later (LTS)
- Dependencies: See `package-lock.json` for exact versions

---

## 日本語

### セキュリティ脆弱性の報告

セキュリティを重視しています。このプロジェクトでセキュリティ脆弱性を発見した場合、**GitHub Issues を公開で作成しないでください**。

代わりに以下の手順でご報告ください：

1. **メール報告**: セキュリティレポートを以下の情報とともに送信
   - 脆弱性の説明
   - 再現手順
   - 潜在的な影響
   - 推奨される対応策（あれば）

2. **含める情報**:
   - 報告者の名前と所属
   - 脆弱性の発見方法
   - 責任あるセキュリティ開示のタイムライン

### セキュリティ対策

#### 公開している情報

- ✅ **ソースコード**: すべての TypeScript/JavaScript コード
- ✅ **アーキテクチャ**: AWS CDK インフラストラクチャ
- ✅ **ドキュメント**: 技術仕様書とガイド
- ✅ **テスト**: E2E テストとユニットテスト

#### 公開していない情報

- 🔒 **環境変数**: `.env` ファイル（機密データ含む）
- 🔒 **AWS 認証**: IAM キー、SSO トークン、シークレット
- 🔒 **API キー**: サービス認証情報とトークン
- 🔒 **パスワード**: テストユーザーの認証情報

### 依存関係のセキュリティ

以下の手段でセキュリティを確保：

- **npm audit**: 定期的な脆弱性スキャン
- **Dependabot**: 自動依存関係更新
- **GitHub セキュリティ機能**: 脆弱性検知

### 認証・シークレット管理

本プロジェクトの採用技術：

- **AWS SSO** (IAM Identity Center) - CLI 認証
- **AWS Cognito** - アプリケーション認証（認証情報はコードに含まない）
- **環境変数** - 設定管理（バージョン管理外）

### 遵守しているベストプラクティス

1. **シークレットのハードコーディング禁止**
   - すべての機密データは環境変数で管理
   - AWS 認証情報は SSO で管理

2. **入力値検証**
   - TypeScript 厳密モード有効化
   - XSS/SQL インジェクション対策実装

3. **HTTPS 強制**
   - CloudFront による HTTPS 配信
   - API Gateway の CORS セキュリティ

4. **IAM 最小権限の原則**
   - Lambda 関数の権限を最小限に制限
   - S3 バケットポリシーでアクセス制限

5. **監視・ログ記録**
   - CloudWatch ログでセキュリティイベント記録
   - エラー追跡とレポート機能

### バージョンセキュリティ

- 現在の安定版: `v1.2.96`
- フレームワーク: AWS Lambda、S3、API Gateway
- Node.js: 18.x 以上（LTS）
- 依存関係: `package-lock.json` で正確なバージョン管理

---

## Security Audit History - セキュリティ監査履歴

| 日付       | 監査内容                     | 結果                                    |
| ---------- | ---------------------------- | --------------------------------------- |
| 2025-11-03 | Git 履歴機密情報確認         | ✅ テスト用パスワード発見・除外済み     |
| 2025-11-03 | `.env` ファイル Git 追跡削除 | ✅ 5 ファイル削除・.gitignore 更新      |
| 2025-11-03 | 公開リポジトリ作成           | ✅ セキュアなコンテンツのみプッシュ完了 |

---

## Questions?

セキュリティに関するご質問やご懸念がある場合は、GitHub Issues またはメールでお問い合わせください。
