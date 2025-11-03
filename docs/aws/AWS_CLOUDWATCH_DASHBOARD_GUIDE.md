# AWS CloudWatch ダッシュボード利用ガイド

**最終更新**: 2025-06-08  
**Version**: 1.0  
**対象**: プロ野球志望届データ収集システム

---

## 📋 概要

このドキュメントでは、プロ野球志望届データ収集システムのAWS CloudWatchダッシュボードの使い方、各ウィジェットの見方、トラブルシューティング方法について説明します。

## 🔗 ダッシュボードへのアクセス

### 開発環境
**URL**: https://ap-northeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#dashboards:name=pro-baseball-dashboard-dev

### 本番環境
**URL**: https://ap-northeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#dashboards:name=pro-baseball-dashboard-prod

### アクセス手順
1. AWS Management Consoleにログイン
2. CloudWatchサービスに移動
3. 左側メニューから「ダッシュボード」を選択
4. `pro-baseball-dashboard-{環境}` を選択

---

## 📊 ダッシュボード構成

ダッシュボードは以下の5つのセクションで構成されています：

### Row 1: Lambda Functions Overview
### Row 2: Error Analysis  
### Row 3: Single Value Metrics (24h stats)
### Row 4: Real-time Error Logs
### Row 5: Log Monitoring Guide

---

## 🎯 各ウィジェットの詳細説明

### Row 1: Lambda Functions Overview

#### 1.1 Lambda Functions - Invocations
- **表示内容**: Lambda関数の呼び出し回数（時系列）
- **対象関数**: 
  - `pro-baseball-scraping-{env}`: データスクレイピング関数
  - `pro-baseball-api-{env}`: API処理関数
  - `pro-baseball-processing-{env}`: データ処理関数
- **統計**: Sum（合計値）
- **期間**: 5分間隔

**📈 読み方:**
- **正常な状態**: スクレイピング関数は定期実行により一定間隔でスパイク
- **注意が必要**: 
  - API関数で異常に高い呼び出し（DDoS攻撃の可能性）
  - スクレイピング関数の呼び出しが停止（スケジューラーの問題）

#### 1.2 Lambda Functions - Duration
- **表示内容**: Lambda関数の実行時間（ミリ秒）
- **統計**: Average（平均値）
- **期間**: 5分間隔

**📈 読み方:**
- **正常な範囲**:
  - API関数: 1,000-5,000ms
  - スクレイピング関数: 30,000-180,000ms（30秒-3分）
  - データ処理関数: 5,000-30,000ms
- **注意が必要**:
  - 300,000ms（5分）に近づく → タイムアウトの危険
  - 通常より大幅に長い → パフォーマンス問題

#### 1.3 X-Ray Response Time & Error Rate
- **表示内容**: X-Rayによる分散トレーシングデータ
- **左軸**: レスポンス時間（ms）
- **右軸**: エラー率（%）

**📈 読み方:**
- **正常な状態**: エラー率 < 1%、レスポンス時間安定
- **注意が必要**: エラー率 > 5% または急激なレスポンス時間増加

### Row 2: Error Analysis

#### 2.1 Lambda Error Rate (%)
- **表示内容**: エラー率の計算結果（エラー数/呼び出し数 × 100）
- **計算式**: `(errors / invocations) * 100`

**📈 読み方:**
- **正常な状態**: 0-1%
- **要注意**: 1-5%
- **緊急対応**: 5%以上

#### 2.2 Combined Lambda Errors
- **表示内容**: 全Lambda関数のエラー数合計
- **計算式**: `scrapingErrors + apiErrors + dataErrors`

**📈 読み方:**
- **正常な状態**: 1時間あたり0-2個のエラー
- **要注意**: 1時間あたり3-10個のエラー
- **緊急対応**: 1時間あたり10個以上のエラー

### Row 3: Single Value Metrics (24h stats)

#### 3.1 Lambda Invocations (24h)
- **表示内容**: 過去24時間のAPI関数呼び出し総数
- **正常な範囲**: 100-1,000回/日（アクセス量により変動）

#### 3.2 Lambda Errors (24h)
- **表示内容**: 過去24時間のスクレイピング関数エラー総数
- **正常な範囲**: 0-5個/日
- **要対応**: 10個以上/日

#### 3.3 Avg Lambda Duration
- **表示内容**: 過去1時間のAPI関数平均実行時間
- **正常な範囲**: 1,000-5,000ms
- **要対応**: 10,000ms以上

#### 3.4 Lambda Success Rate %
- **表示内容**: API関数の成功率
- **計算式**: `100 - (errors / invocations * 100)`
- **正常な範囲**: 95%以上
- **要対応**: 90%未満

#### 3.5 Estimated Cost (USD)
- **表示内容**: 推定月額料金
- **目標値**: $0.50未満
- **警告**: $0.50以上（アラームが発動）

#### 3.6 Free Tier Usage %
- **表示内容**: Lambda無料枠使用率
- **計算式**: `(lambda_gb_seconds / 400000) * 100`
- **正常な範囲**: 80%未満
- **要注意**: 80%以上

### Row 4: Real-time Error Logs

#### 4.1 Error Logs Query Section
CloudWatch Logs Insightsで実行可能なクエリが表示されています。

**使用方法:**
1. 表示されているクエリをコピー
2. [Logs Insights](https://ap-northeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#logsV2:logs-insights)にアクセス
3. クエリを貼り付けて実行

**クエリ例:**
```
SOURCE '/aws/lambda/pro-baseball-scraping-prod' | SOURCE '/aws/lambda/pro-baseball-api-prod' | SOURCE '/aws/lambda/pro-baseball-processing-prod'
| fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

#### 4.2 Quick Links
各Lambda関数のログへの直接リンクが提供されています。

### Row 5: Log Monitoring Guide

#### 5.1 詳細ガイドと参考リンク
- CloudWatch Logs Insightsの使用方法
- X-Rayトレーシングコンソールへのリンク
- Lambda管理コンソールへのリンク

---

## 🚨 アラートとしきい値

### 自動アラーム設定

以下のアラームが設定されており、SNSトピック経由でメール通知されます：

#### 1. Scraping Function Error Alarm
- **条件**: スクレイピング関数のエラー数 ≥ 3（5分間で2回連続）
- **対応**: スクレイピング処理の調査

#### 2. Combined Lambda Error Alarm  
- **条件**: 全Lambda関数のエラー数合計 ≥ 5（5分間で3回連続）
- **対応**: システム全体の調査

#### 3. Lambda Duration Alarm
- **条件**: スクレイピング関数の実行時間 ≥ 300秒（5分間で2回連続）
- **対応**: パフォーマンス調査、タイムアウト対策

#### 4. Cost Alarm
- **条件**: 推定料金 ≥ $0.50
- **対応**: 即座にコスト確認、必要に応じてリソース停止

---

## 📊 日常的な監視手順

### 毎日の確認事項（5分程度）

1. **ダッシュボードにアクセス**
2. **Row 3の24時間統計を確認**:
   - Success Rate: 95%以上か？
   - Error数: 10個未満か？
   - Cost: $0.50未満か？
3. **Row 2のエラー分析を確認**:
   - Error Rateが急激に上昇していないか？
4. **Row 4のエラーログを確認**:
   - 新しいエラーパターンがないか？

### 週次の詳細確認（15分程度）

1. **Row 1の傾向分析**:
   - Lambda呼び出し数の傾向
   - 実行時間の傾向
   - X-Rayメトリクスの傾向
2. **ログ詳細確認**:
   - Logs Insightsでエラーログの詳細分析
   - X-Rayでトレース分析
3. **コスト分析**:
   - 無料枠使用率の確認
   - コスト傾向の分析

---

## 🔧 トラブルシューティング

### 共通的な問題と対処法

#### エラー率が高い場合

**Step 1: エラーの詳細を確認**
1. Row 4のエラーログセクションからLogs Insightsにアクセス
2. エラーメッセージの内容を確認
3. エラーが発生している関数を特定

**Step 2: エラーパターンの分析**
```sql
SOURCE '/aws/lambda/pro-baseball-scraping-prod'
| fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc
```

**Step 3: 対応策の実施**
- スクレイピングエラー: URLの確認、レート制限の調整
- API関数エラー: 入力データの検証、認証の確認
- データ処理エラー: S3権限の確認、データ形式の検証

#### レスポンス時間が長い場合

**Step 1: X-Rayトレースの確認**
1. ダッシュボードからX-Rayコンソールにアクセス
2. Service Mapで遅延の原因を特定
3. 個別のトレースを確認

**Step 2: ボトルネックの特定**
- S3アクセスの遅延
- 外部APIの応答遅延
- データ処理の重さ

**Step 3: 最適化の実施**
- S3アクセスパターンの最適化
- キャッシュの活用
- バッチサイズの調整

#### コストが予算を超過している場合

**Step 1: コスト詳細の確認**
1. [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home)にアクセス
2. サービス別のコスト内訳を確認
3. 日別の使用量変化を確認

**Step 2: 高コスト要因の特定**
- Lambda実行時間の増加
- API Gateway呼び出し数の増加
- CloudWatch ログの増加

**Step 3: コスト削減策の実施**
- 不要なスケジュール実行の停止
- ログレベルの調整
- キャッシュによる重複処理の削減

### エマージェンシー対応

#### システム全体の停止が必要な場合

**緊急停止手順:**
1. [Lambda Console](https://ap-northeast-1.console.aws.amazon.com/lambda/home?region=ap-northeast-1)にアクセス
2. 各関数の「設定」→「環境変数」で`EMERGENCY_STOP=true`を追加
3. EventBridgeルール（スケジューラー）を無効化

**復旧手順:**
1. 問題の根本原因を解決
2. 環境変数`EMERGENCY_STOP`を削除
3. EventBridgeルールを再有効化
4. ダッシュボードで正常動作を確認

---

## 📱 モバイル対応

### CloudWatch Mobileアプリ

iOSおよびAndroid用のCloudWatch Mobileアプリでダッシュボードの確認が可能です。

**設定手順:**
1. App Store / Google PlayでAWS Consoleアプリをダウンロード
2. IAM認証情報でログイン
3. CloudWatch → Dashboards → `pro-baseball-dashboard-{env}`を選択

**モバイルでの確認事項:**
- アラーム状態の確認
- 重要メトリクスの数値確認
- エラー発生状況の確認

---

## 🔔 通知設定

### SNSトピック

アラーム通知は以下のSNSトピックから送信されます：
- **開発環境**: `arn:aws:sns:ap-northeast-1:131492497870:pro-baseball-alerts-dev`
- **本番環境**: `arn:aws:sns:ap-northeast-1:131492497870:pro-baseball-alerts-prod`

### メール通知の設定

新しいメールアドレスを通知に追加する場合：

1. [SNS Console](https://ap-northeast-1.console.aws.amazon.com/sns/v3/home?region=ap-northeast-1)にアクセス
2. 該当のトピックを選択
3. 「サブスクリプションを作成」をクリック
4. プロトコル「Email」、エンドポイントにメールアドレスを入力
5. 確認メールが送信されるため、確認リンクをクリック

---

## 📚 参考資料

### AWS公式ドキュメント
- [CloudWatch ダッシュボード](https://docs.aws.amazon.com/cloudwatch/latest/monitoring/CloudWatch_Dashboards.html)
- [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html)
- [AWS X-Ray](https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html)

### プロジェクト固有ドキュメント
- [AWS インフラストラクチャ文書](AWS_INFRASTRUCTURE_DOCUMENTATION.md)
- [エラーハンドリングガイド](../common/ERROR_HANDLING_GUIDE.md)
- [パフォーマンス最適化](../common/PERFORMANCE_OPTIMIZATION.md)

### よくある質問

**Q: ダッシュボードが表示されない**  
A: IAM権限を確認してください。CloudWatchReadOnlyAccess権限が必要です。

**Q: メトリクスにデータが表示されない**  
A: Lambda関数が実行されているか確認してください。初回実行後にメトリクスが表示されます。

**Q: アラームメールが届かない**  
A: SNSサブスクリプションの確認状態を確認してください。未確認の場合は確認メールのリンクをクリックしてください。

**Q: コストが予想より高い**  
A: CloudWatch ダッシュボードは$3/月の料金が発生します。また、ログ保存期間とアラーム数を確認してください。

---

## 💡 ベストプラクティス

### 効率的な監視方法

1. **優先度をつけた確認**:
   - 毎日: Row 3の24時間統計
   - 週次: Row 1の傾向分析
   - 月次: コストとパフォーマンス最適化

2. **アラーム設定の最適化**:
   - 誤検知を減らすため、しきい値を定期的に見直し
   - 重要度に応じた通知先の分類

3. **ログ管理**:
   - ログレベルを適切に設定（本番：WARN、開発：DEBUG）
   - 古いログの自動削除設定

4. **定期的なレビュー**:
   - 月次でダッシュボード構成の見直し
   - 新しいメトリクスの追加検討

---

**最終更新**: 2025-06-08  
**文書管理者**: システム管理チーム  
**レビュー周期**: 月次