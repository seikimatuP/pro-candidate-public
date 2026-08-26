# pro-candidate-aws（AWS CDK / TypeScript）

プロ野球志望届データ管理システムの AWS インフラを定義する CDK プロジェクト。

`cdk.json` が CDK Toolkit にアプリの実行方法を指示する。

## 構成の要点

- スタック定義: `lib/pro-candidate-aws-stack.ts`
- Construct: `lib/constructs/`（API Gateway・Lambda・Cognito・フロントエンド・監視など）
- Lambda 実装: `lambda/`（ランタイムは Node.js 22.x）

### 公開範囲と認証

- 認証不要（公開）の API は `GET /health` / `GET /statistics` / `GET /schools` /
  `GET /years/available` の4本のみ
- それ以外は Cognito 認証必須。実名・管理・運用系は Lambda 側でも
  `cognito:groups` の `admin` を検証する（二重防御）
- Cognito authorizer は **dev / prod の両方**に配線済み（`api-gateway-construct.ts`）
- `{proxy+}` は認証必須のまま維持する。公開したいパスだけを明示的なリソースとして追加すること
- admin グループは CDK 管理外。`scripts/ensure-cognito-admin.sh <dev|prod>` が冪等に用意する
  （CDK で `AWS::Cognito::UserPoolGroup` を作るとスタック全体がデプロイ不能になるため）

## コマンド

デプロイは GitHub Actions が行う。**手動の `cdk deploy` / `cdk destroy` は禁止**。

- `pnpm run build` TypeScript をコンパイル
- `pnpm run watch` 変更を監視してコンパイル
- `pnpm test` 単体テスト（このパッケージのみ Jest。ルート・フロントは Vitest）
- `pnpm run aws:diff` デプロイ済みスタックとの差分確認（リポジトリルートで実行）
- `pnpm run aws:synth` CloudFormation テンプレートの生成（リポジトリルートで実行）
