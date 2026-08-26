# aws-sdk v2 → v3 移行プラン（実施記録）

作成日: 2026-07-17
実施日: 2026-07-17
対象: Dependabotアラート3件（aws-sdk low×2、uuid@8.0.0 medium×1）の根治
承認: マスター承認済み（msg 2857 項目3）

## 要約（最重要）

**当初想定と異なり、コードの移行作業は調査時点で既に完了していた。**

`pro-candidate-aws/lambda/` 配下の全Lambdaハンドラは、既に `@aws-sdk/client-*`（v3）で実装済みで、
`aws-sdk`（v2、`require('aws-sdk')` / `from 'aws-sdk'`）を読み込んでいる実コード（.ts/.js）は
リポジトリ全体で **0件**だった。テストのモックも `aws-sdk-client-mock`（v3対応）の `mockClient()` に
統一済みで、v2向けの `aws-sdk-mock` は依存宣言があるだけで実際にはどこからも import/require
されていなかった（`sinon`・`neotraverse` も同様に間接依存のみで直接使用なし）。

残っていた3件のDependabotアラートは、**使われていない依存関係の宣言が残っていたこと**が原因。
コード書き換えは不要で、対応は「不要な依存2行の削除＋lockfile再生成＋検証」で完了した。

Dependabotアラート対応表:

| #   | 深刻度 | パッケージ | 検出元                           | scope       | 原因                                                                                             | 結果                                    |
| --- | ------ | ---------- | -------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ | --------------------------------------- |
| 42  | low    | aws-sdk    | `pro-candidate-aws/package.json` | runtime     | `dependencies` に未使用の `aws-sdk@^2.1693.0` が残存                                             | 依存削除・lockfileから除去済み          |
| 43  | low    | aws-sdk    | `pnpm-lock.yaml`                 | development | root `devDependencies` の `aws-sdk-mock@^6.2.2` が内部で `aws-sdk@2.1693.0` を引き込む（未使用） | `aws-sdk-mock` を削除・連鎖して除去済み |
| 372 | medium | uuid       | `pnpm-lock.yaml`                 | development | `aws-sdk@2.1693.0` が `uuid@8.0.0`（<11.1.1）を固定                                              | `aws-sdk` 除去に伴い連鎖して除去済み    |

GitHubへのアラートクローズ反映は、コミットのpush後にDependabotが自動検知する想定（本タスクではpush未実施のため、pushは別途マスター/親エージェント側で実施）。

---

## 1. 現状（調査時点、変更前）

### 1-1. aws-sdk v2 の使用箇所

**なし。** リポジトリ全体（node_modules除外）を grep しても実コードでのv2読み込みは1件もヒットしない。
唯一の"v2"文字列の出現は `docs/work_logs/20251102.md:1295`（過去の作業日誌に残る旧実装スニペットの引用）
のみで、現行の `pro-candidate-aws/lambda/warmup-handler.ts` は既に `@aws-sdk/client-lambda` で
書き直されている。

### 1-2. `package.json` 内の "aws-sdk" 依存宣言（全workspace確認済み）

| workspace/場所             | ファイル                                           | 依存名                                         | 種別             | バージョン        | 実際の使用（変更前）             |
| -------------------------- | -------------------------------------------------- | ---------------------------------------------- | ---------------- | ----------------- | -------------------------------- |
| root                       | `package.json`                                     | `aws-sdk-mock`                                 | devDependencies  | `^6.2.2`          | **未使用**（import/require 0件） |
| root                       | `package.json`                                     | `@aws-sdk/client-*` 6種、`aws-sdk-client-mock` | dev/dependencies | `^3.x` / `^4.1.0` | 使用中                           |
| `pro-candidate-aws`        | `pro-candidate-aws/package.json` (dependencies)    | `aws-sdk`                                      | dependencies     | `^2.1693.0`       | **未使用**                       |
| `pro-candidate-aws`        | `pro-candidate-aws/package.json` (devDependencies) | `@aws-sdk/client-*` 6種                        | devDependencies  | `^3.1085.0`       | 使用中                           |
| `pro-candidate-aws/lambda` | `pro-candidate-aws/lambda/package.json`            | `@aws-sdk/client-*` 5種                        | dependencies     | `^3.450.0`        | 使用中                           |
| `frontend`                 | `frontend/package.json`                            | —                                              | —                | —                 | 該当なし                         |

### 1-3. 実際に使用されているAPI（コード読解、全て v3 で実装済み）

| ファイル                                               | サービス                   | API                                                                |
| ------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------ |
| `pro-candidate-aws/lambda/config-manager.ts`           | SSM / Secrets Manager / S3 | `GetParameterCommand`, `GetSecretValueCommand`, `GetObjectCommand` |
| `pro-candidate-aws/lambda/email-service.ts`            | SES                        | `SendEmailCommand`                                                 |
| `pro-candidate-aws/lambda/monitoring-helper.ts`        | CloudWatch                 | `PutMetricDataCommand`                                             |
| `pro-candidate-aws/lambda/scraping.ts`                 | S3                         | `PutObjectCommand`, `GetObjectCommand`                             |
| `pro-candidate-aws/lambda/scraping-history-service.ts` | S3                         | `PutObjectCommand`, `GetObjectCommand`                             |
| `pro-candidate-aws/lambda/warmup-handler.ts`           | Lambda                     | `InvokeCommand`                                                    |
| `pro-candidate-aws/lambda/api.ts`                      | S3 / Lambda                | `GetObjectCommand`, `ListObjectsV2Command`, `InvokeCommand`        |
| `pro-candidate-aws/lambda/utils/cache-invalidation.js` | CloudFront                 | `CreateInvalidationCommand`                                        |
| `src/services/s3-data-service.ts`                      | S3                         | `@aws-sdk/client-s3` 経由                                          |
| `frontend/src/services/legacy/cognito-auth.ts`         | Cognito Identity Provider  | `@aws-sdk/client-cognito-identity-provider`                        |

### 1-4. テストのモック方式（変更前から実装済み）

v3方式に統一済み: `aws-sdk-client-mock` の `mockClient(S3Client)` / `mockClient(SSMClient)` /
`mockClient(SecretsManagerClient)` / `mockClient(LambdaClient)` を使用
（`tests/unit/services/config-manager.test.ts`, `scraping.test.ts`, `api.test.ts`,
`scraping-history-service.test.ts`, `tests/integration/backend/api-handler.test.ts`）。
v2方式の `aws-sdk-mock`（root devDependencies）はテストコードから一切参照されていなかった。

## 2. 移行対応表（実装済み、参考として記録）

以下は既にコードに反映されている v2→v3 の書き換えパターン。今後新規に AWS API を呼ぶ箇所を
追加する際のリファレンスとして残す。

| v2 API                                                     | v3パッケージ・コマンド                                                               | インスタンス生成の差分                                          | レスポンス/Body の差分                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `new AWS.S3()` → `.getObject().promise()`                  | `@aws-sdk/client-s3` → `S3Client` + `GetObjectCommand`                               | `new S3Client({ region })` をモジュールスコープで作成し使い回す | `Body` が `Readable`/`ReadableStream` になるため `transformToString()` 等が必要。本リポジトリでは対応済み |
| `new AWS.S3()` → `.putObject().promise()`                  | `S3Client` + `PutObjectCommand`                                                      | 同上                                                            | 差分なし                                                                                                  |
| `new AWS.CloudWatch()` → `.putMetricData().promise()`      | `@aws-sdk/client-cloudwatch` → `CloudWatchClient` + `PutMetricDataCommand`           | 同上                                                            | 差分なし                                                                                                  |
| `new AWS.SES()` → `.sendEmail().promise()`                 | `@aws-sdk/client-ses` → `SESClient` + `SendEmailCommand`                             | 同上                                                            | 差分なし                                                                                                  |
| `new AWS.Lambda()` → `.invoke().promise()`                 | `@aws-sdk/client-lambda` → `LambdaClient` + `InvokeCommand`                          | 同上                                                            | `Payload` が `Uint8Array` になる点に注意（既存コードは対応済み）                                          |
| `new AWS.SSM()` → `.getParameter().promise()`              | `@aws-sdk/client-ssm` → `SSMClient` + `GetParameterCommand`                          | 同上                                                            | 差分なし                                                                                                  |
| `new AWS.SecretsManager()` → `.getSecretValue().promise()` | `@aws-sdk/client-secrets-manager` → `SecretsManagerClient` + `GetSecretValueCommand` | 同上                                                            | 差分なし                                                                                                  |
| `new AWS.CloudFront()` → `.createInvalidation().promise()` | `@aws-sdk/client-cloudfront` → `CloudFrontClient` + `CreateInvalidationCommand`      | 同上                                                            | 差分なし                                                                                                  |
| エラーハンドリング（v2: `err.code`）                       | v3: `err.name` / `err instanceof ServiceException`                                   | —                                                               | 既存コードはtry/catchでのログ出力中心                                                                     |

## 3. 実施内容（2026-07-17）

1. `pro-candidate-aws/package.json` の `dependencies` から `"aws-sdk": "^2.1693.0"` を削除
2. root `package.json` の `devDependencies` から `"aws-sdk-mock": "^6.2.2"` を削除
3. `pnpm install --lockfile-only -r` でlockfileを再生成（全workspace対象、node_modules本体は
   ディスク節約のため最小限のみ更新）
4. `pnpm-lock.yaml` の差分を確認: **削除のみ137行、追加0行**。削除されたのは
   `aws-sdk@2.1693.0` とその直接の推移依存（`buffer`, `events@1.1.1`, `ieee754`, `jmespath`,
   `querystring`, `sax`, `url`, `util`, `uuid@8.0.0`, `xml2js`, `xmlbuilder`）、
   および `aws-sdk-mock@6.2.2` とその依存（`neotraverse`, `sinon@21.0.1` ※`aws-sdk-client-mock`
   が使う `sinon@18.0.1` は別バージョンとして温存）のみ。他パッケージのバージョン変更・巻き上げは
   一切なし（追加行0件で確認）
5. ローカルテスト実行:
   - `vitest run` で aws-sdk 関連の unit テスト5ファイル（config-manager, scraping, api,
     scraping-history-service, email-service）を実行 → **141 passed, 5 skipped, 0 failed**
   - `vitest run tests/integration/backend/api-handler.test.ts` → **4 passed, 0 failed**
   - `pro-candidate-aws` の `tsc --noEmit` → **エラー0件**（依存削除によるコンパイル影響なし）
   - `pro-candidate-aws` の `jest` はテスト実行前に失敗（後述の既知の別課題）

## 4. 結果

### 検証結果サマリー

| 検証項目                                        | 結果                                       |
| ----------------------------------------------- | ------------------------------------------ |
| `pnpm-lock.yaml` から `aws-sdk@2.1693.0` 消滅   | ○                                          |
| `pnpm-lock.yaml` から `aws-sdk-mock@6.2.2` 消滅 | ○                                          |
| `pnpm-lock.yaml` から `uuid@8.0.0` 消滅         | ○                                          |
| 他依存への巻き上げ・バージョン変更              | なし（diff追加行0件で確認）                |
| root vitest（aws-sdk関連5ファイル）             | 141 passed / 5 skipped / 0 failed          |
| root vitest（integration api-handler）          | 4 passed / 0 failed                        |
| `pro-candidate-aws` tsc --noEmit                | エラー0件                                  |
| `pro-candidate-aws` jest                        | **未検証**（下記の既知課題により実行不可） |

### 既知の課題（本対応とは無関係、要別途対応）

`pro-candidate-aws` の `jest` 実行時に以下のエラーでテストスイートが起動しない:

```
TypeError: Cannot read properties of undefined (reading 'fileExists')
  at ConfigSet._resolveTsConfig (ts-jest/dist/legacy/config/config-set.js:516)
```

原因は `ts-jest@29.4.11` が `typescript@">=4.3 <7"` を要求するのに対し、
`pro-candidate-aws/package.json` の `typescript` が `~7.0.2` に上がっており、
ts-jest内部のTypeScript API呼び出しが7系の構造変更に対応できていないため
（`pnpm install` 時点で peer dependency 警告として検出済み）。
`aws-sdk` を削除する前から存在していた組み合わせであり、今回の依存削除が原因ではない
（`tsc --noEmit` 自体は問題なくエラー0件で通ることから、TypeScriptコンパイル自体は正常）。
CDKスタックのユニットテストカバレッジという観点では未検証のまま残るため、別タスクとして
`ts-jest` のバージョンアップ、または `typescript` のダウングレードでの解消を推奨する。

### Dependabotアラートの最終確認

pushしていないため、GitHub側でのアラート自動クローズは未確認。push後にマスター/親エージェント側で
`gh api repos/seikimatuP/pro_candidate/dependabot/alerts/42` 等でクローズを確認すること。

## 5. 完了判定

- [x] Dependabotアラート原因（未使用のaws-sdk v2系依存）を特定・除去
- [x] `pnpm-lock.yaml` から対象パッケージ3件が消滅し、他依存への影響なしを確認
- [x] 関連する root ユニット・統合テストが全て緑
- [x] `pro-candidate-aws` の `tsc` ビルドが正常
- [ ] `pro-candidate-aws` の `jest` 実行（既知の別課題によりブロック、本対応の範囲外）
- [ ] Dependabotアラート #42・#43・#372 のクローズ確認（push後に別途実施）
- [ ] dev環境への通常デプロイフロー確認（push後に別途実施）

---

本ドキュメントは実施記録。コード変更・commitは完了。**pushは未実施**（マスター/親エージェント側で
まとめて実施）。
