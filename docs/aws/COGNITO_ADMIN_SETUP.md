# Cognito 管理者セットアップ（admin グループ）

実名を含むAPI・画面は「Cognito 認証済み」かつ「`admin` グループ所属」でなければ利用できない。
この文書は、デプロイ後に管理者を使える状態にするまでの手順をまとめたもの。

## 認可の仕組み（二重防御）

| 層             | 何をするか                                                        | 実装                                                           |
| -------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| API Gateway    | `Authorization` ヘッダーの Cognito ID トークンを検証。無ければ401 | `lib/constructs/api-gateway-construct.ts`（dev/prod とも有効） |
| Lambda         | ID トークンの `cognito:groups` に `admin` が無ければ403           | `lambda/api.ts` の `isAdminRequest`                            |
| フロントエンド | `ProtectedRoute requireAdmin` でログイン画面／権限エラーへ誘導    | `frontend/src/App.tsx`                                         |

認証不要（公開）なのは次の4本と、それを使うトップの集計ダッシュボードのみ。

- `GET /health`
- `GET /statistics`（氏名・学校名を含まない集計だけを返す）
- `GET /schools`
- `GET /years/available`

> **dev も prod と同じ認証構成**。以前は dev だけ authorizer 無しで動いていたが、
> それでは admin 限定化を dev で検証できず「dev では通るのに prod だけ401」という
> 環境差の温床になっていたため揃えた（`pro-candidate-aws-stack.ts`）。

## CDK が作るもの／作らないもの

CDK（`lib/constructs/cognito-construct.ts`）が作るのは User Pool と Client、Domain まで。
**`admin` グループ・ユーザーの作成・グループへの所属は作らない**。
したがってデプロイしただけでは誰も admin ではなく、管理機能は全て403になる。

`admin` グループを CDK で持たないのは、dev / prod の User Pool に CloudFormation の
管理外で作られた `admin` グループが既にあるため。`AWS::Cognito::UserPoolGroup` を
新規作成しようとすると CloudFormation の Early Validation
（`AWS::EarlyValidation::ResourceExistenceCheck`）がチェンジセットごと失敗させ、
スタック全体がデプロイできなくなる（2026-08-23 に dev で発生）。
既存グループを削除してから取り込むと所属ユーザーが失われるため、
グループは後述のスクリプトで冪等に用意する方式にしている。

また `selfSignUpEnabled: false` のため、一般ユーザーが自分で登録することはできない。
アカウントは運営者が招待・作成する。

## 自動化（CI）

E2E 用アカウントについては、デプロイ後に次のステップが冪等に実行される。

- `.github/workflows/deploy-infra.yml` の `Ensure Cognito admin user`
- `.github/workflows/e2e-test.yml` の `Ensure Cognito admin user`

いずれも `scripts/ensure-cognito-admin.sh <dev|prod>` を Doppler 経由で実行し、
`COGNITO_USERNAME` / `COGNITO_PASSWORD`（Doppler の `e2e_dev` / `e2e_prod` config）を使う。
リポジトリに認証情報の実値は置かない。

スクリプトの挙動（`scripts/ensure-cognito-admin.sh` の実行順）:

1. 対象ユーザーの所属グループを読み取り、**既に `admin` に居れば書き込み系 API を一切呼ばずに終了する**
2. （未所属のときだけ）`admin` グループが無ければ作る（既にあれば触らない）
3. 対象ユーザーが居なければ作る（`COGNITO_PASSWORD` を恒久パスワードとして設定。
   既存ユーザーのパスワードは変更しない）
4. `admin` グループへ追加（何度実行しても安全）
5. 所属を読み直して検証

1 の早期終了は意図的なもの。CI に渡している AWS 認証情報では
`cognito-idp:AdminAddUserToGroup` が拒否されるため、既に所属済みのユーザーに対して
毎回グループ追加を試みるとデプロイが失敗する。
逆に言うと、**まだ admin に居ないユーザーを CI が所属させることはできない**。
prod で未所属の場合は、次章の手動手順で運営者が追加する必要がある。

## 手動セットアップ（運営者アカウントを増やすとき）

E2E 用以外の管理者を追加する場合は手作業で行う。パスワードはシェル履歴に残さないこと。

```bash
# 1) User Pool ID を確認
#    dev
aws cloudformation describe-stacks --stack-name ProBaseballStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' --output text
#    prod
aws cloudformation describe-stacks --stack-name ProBaseballStack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' --output text

# 2) ユーザー作成（招待メールを送る場合は --message-action を外す）
read -rs NEW_PASSWORD   # 画面に表示されない形で入力する
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "運用者のユーザー名" \
  --user-attributes Name=email,Value=admin@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "運用者のユーザー名" \
  --password "$NEW_PASSWORD" \
  --permanent
unset NEW_PASSWORD

# 3) admin グループへ追加
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$USER_POOL_ID" \
  --username "運用者のユーザー名" \
  --group-name admin

# 4) 確認
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "運用者のユーザー名" \
  --query 'Groups[].GroupName'
```

グループを追加・削除した後は、対象ユーザーが **再ログイン**するまで
ID トークンの `cognito:groups` は更新されない点に注意。

## prod へ反映するときのチェックリスト

> **現況（2026-08-23）**: この認証構成は dev にのみ反映済みで、**prod は未反映**（旧状態）。
> prod 反映は GO を取ってから行う。

1. `ProBaseballStack-prod` をデプロイする
2. E2E 用アカウントが `admin` に居ること（未所属なら CI では追加できないので、
   下記の手動手順か、権限のある認証情報で `scripts/ensure-cognito-admin.sh prod` を実行する）
3. 運営者アカウントを上記の手動手順で `admin` グループへ追加すること
4. 追加済みの管理者に再ログインしてもらうこと
5. `gh workflow run e2e-test.yml --ref <branch> -f environment=prod` で確認する

## トラブルシューティング

| 症状                                 | 原因                                                     | 対処                                                   |
| ------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------ |
| 管理画面が全て403                    | admin グループ未所属、またはグループ追加後に未再ログイン | `admin-list-groups-for-user` で確認 → 再ログイン       |
| API が401                            | `Authorization` ヘッダー無し／トークン期限切れ           | 再ログインしてトークンを取り直す                       |
| E2E の setup で認証情報エラー        | Doppler の `COGNITO_PASSWORD` 未設定                     | `doppler secrets set` で `e2e_dev` / `e2e_prod` に登録 |
| ログイン後すぐ「パスワード変更」画面 | `admin-create-user` の一時パスワードのまま               | `admin-set-user-password --permanent` を実行           |
