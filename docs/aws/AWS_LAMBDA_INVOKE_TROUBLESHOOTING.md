# AWS Lambda invoke JSON payload 文字化け問題 - 完全解決ガイド

## 問題の概要

AWS Lambda invokeでJSONペイロードを渡す際に発生する文字化けエラー：

```
An error occurred (InvalidRequestContentException) when calling the Invoke operation: Could not parse request body into json: Could not parse payload into json: Unexpected character ('·' (code 183)): expected a valid value (JSON String, Number, Array, Object or token 'null', 'true' or 'false')
```

## 🔍 問題の根本原因

### 1. 文字エンコーディング問題

- **問題**: シェル変数の展開とAWS CLIの内部処理での文字解釈の齟齬
- **症状**: 文字コード183（中点 '·'）などの予期しない文字が混入
- **原因**: Bashの文字列展開とAWS CLIのJSON解析処理の相互作用

### 2. エスケープ処理問題

- **問題**: JSON内の特殊文字（引用符、スペース等）の不適切な処理
- **症状**: JSON構文エラー、予期しない文字の出現
- **原因**: シェルによる文字列解釈とJSON形式の要求の不一致

### 3. 改行文字・空白文字の混入

- **問題**: 意図しない改行文字や空白文字がペイロードに含まれる
- **症状**: JSON解析エラー、予期しないバイナリデータ
- **原因**: echo コマンドのデフォルト動作（改行文字追加）

## ✅ 解決方法

### 🥇 方法1: ファイル使用（最も推奨）

```bash
# JSONファイルを作成
echo '{"type": "both", "year": 2024}' > payload.json

# ファイルを指定してLambda invoke
aws lambda invoke \
    --function-name your-function-name \
    --payload file://payload.json \
    response.json
```

**利点:**

- 確実性が高い
- デバッグしやすい
- 複雑なJSONでも対応可能
- 文字エンコーディング問題を完全回避

### 🥈 方法2: Base64エンコード

```bash
# Base64エンコード
PAYLOAD=$(echo -n '{"type": "both", "year": 2024}' | base64)

# Base64ペイロードでLambda invoke
aws lambda invoke \
    --function-name your-function-name \
    --payload "$PAYLOAD" \
    response.json
```

**利点:**

- 文字エンコーディング問題を回避
- 日本語文字を含むJSONでも安全
- バイナリデータの混入を防止

### 🥉 方法3: jq使用（JSON検証付き）

```bash
# jqで検証・圧縮
PAYLOAD=$(echo '{"type": "both", "year": 2024}' | jq -c .)

# 検証済みペイロードでLambda invoke
aws lambda invoke \
    --function-name your-function-name \
    --payload "$PAYLOAD" \
    response.json
```

**利点:**

- JSON構文検証
- 圧縮による確実な形式
- エラーの早期発見

### 🏃 方法4: Heredoc使用

```bash
# Heredocでペイロード作成
PAYLOAD=$(cat <<'EOF'
{"type": "both", "year": 2024}
EOF
)

# HeredocペイロードでLambda invoke
aws lambda invoke \
    --function-name your-function-name \
    --payload "$PAYLOAD" \
    response.json
```

**利点:**

- 複数行JSONでも対応
- 変数展開の制御が容易
- 可読性が高い

## 🔧 デバッグ方法

### 1. JSON構文確認

```bash
echo '{"type": "both", "year": 2024}' | jq .
```

### 2. 文字エンコーディング確認

```bash
echo -n '{"type": "both", "year": 2024}' | hexdump -C
```

### 3. AWS CLI詳細ログ

```bash
aws lambda invoke --debug --function-name your-function --payload '...' response.json
```

### 4. 段階的テスト

```bash
# 最小JSONから開始
echo '{"test": "value"}' | jq .
aws lambda invoke --function-name your-function --payload '{"test": "value"}' response.json
```

## 🚨 よくある問題と対策

### 問題1: 日本語文字を含むJSON

```bash
# ❌ 問題のあるケース
PAYLOAD='{"message": "こんにちは", "year": 2024}'
aws lambda invoke --function-name func --payload "$PAYLOAD" response.json

# ✅ 解決方法
echo '{"message": "こんにちは", "year": 2024}' > payload.json
aws lambda invoke --function-name func --payload file://payload.json response.json
```

### 問題2: 複雑なJSON構造

```bash
# ❌ 問題のあるケース
PAYLOAD='{"data": {"items": [{"id": 1, "name": "test"}]}, "meta": {"count": 1}}'

# ✅ 解決方法
cat > payload.json << 'EOF'
{
  "data": {
    "items": [
      {"id": 1, "name": "test"}
    ]
  },
  "meta": {
    "count": 1
  }
}
EOF
aws lambda invoke --function-name func --payload file://payload.json response.json
```

### 問題3: 環境変数を含むJSON

```bash
# ❌ 問題のあるケース
YEAR=2024
PAYLOAD="{\"type\": \"both\", \"year\": $YEAR}"

# ✅ 解決方法
YEAR=2024
jq -n --arg year "$YEAR" '{"type": "both", "year": ($year | tonumber)}' > payload.json
aws lambda invoke --function-name func --payload file://payload.json response.json
```

## 📊 修正された verify-lambda-environment.sh

プロジェクトの`scripts/verify-lambda-environment.sh`は以下の修正を適用済み：

1. **ファイル使用方式の採用**

   ```bash
   # 修正前（問題あり）
   PAYLOAD='{"type": "both", "year": 2024}'
   aws lambda invoke --function-name "$FUNCTION_NAME" --payload "$PAYLOAD" response.json

   # 修正後（解決済み）
   PAYLOAD_FILE="/tmp/lambda-payload-${attempt}.json"
   echo '{"type": "both", "year": 2024}' > "$PAYLOAD_FILE"
   aws lambda invoke --function-name "$FUNCTION_NAME" --payload "file://$PAYLOAD_FILE" response.json
   ```

2. **デバッグ情報の追加**

   - ペイロード内容の確認
   - バイト情報の表示
   - 実行コマンドの詳細ログ

3. **一時ファイルのクリーンアップ**
   - 実行後の自動クリーンアップ
   - セキュリティとディスク容量の配慮

## 🛠️ 専用デバッグツール

> ⚠️ **注意**: 以下の `scripts/lambda-invoke-debug.sh` は現在リポジトリに存在しない。
> 上記の「解決方法」「デバッグ方法」の手順を直接使うこと。

`scripts/lambda-invoke-debug.sh`を使用して包括的なデバッグが可能：

```bash
# 基本的なデバッグ
./scripts/lambda-invoke-debug.sh your-function-name

# 詳細デバッグモード
./scripts/lambda-invoke-debug.sh your-function-name --debug

# 特定の方法でテスト
./scripts/lambda-invoke-debug.sh your-function-name --method base64

# ドライランモード（実際に実行せずテスト）
./scripts/lambda-invoke-debug.sh your-function-name --dry-run

# カスタムペイロード
./scripts/lambda-invoke-debug.sh your-function-name --payload '{"custom": "data"}'
```

## 📋 チェックリスト

Lambda invoke実行前の確認事項：

- [ ] JSON構文の確認（`jq`コマンド使用）
- [ ] 文字エンコーディングの確認（`hexdump`使用）
- [ ] 改行文字の確認（`echo -n`使用）
- [ ] 特殊文字のエスケープ確認
- [ ] Lambda関数の存在確認
- [ ] AWS CLI認証情報の確認
- [ ] タイムアウト設定の確認

## 🎯 ベストプラクティス

1. **常にファイル使用を優先**

   - 文字化け問題を確実に回避
   - デバッグとメンテナンスが容易

2. **JSON構文の事前検証**

   - `jq`コマンドで構文チェック
   - エラーの早期発見

3. **詳細ログの活用**

   - 問題発生時の調査を効率化
   - 実行コマンドと結果の記録

4. **段階的なテスト**

   - 小さなJSONから開始
   - 複雑性を段階的に追加

5. **環境別の設定管理**
   - 開発・本番環境での設定分離
   - 環境固有の値の動的生成

## 🔗 関連資料

- [AWS CLI Lambda invoke公式ドキュメント](https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html)
- [JSON処理のベストプラクティス](https://stedolan.github.io/jq/manual/)
- [Bash文字列処理ガイド](https://www.gnu.org/software/bash/manual/bash.html#Shell-Parameter-Expansion)

---

**最終更新**: 2025-06-18  
**適用バージョン**: v1.2.42+  
**検証環境**: AWS CLI 2.27.27, Ubuntu 24.04 LTS, Bash 5.2
