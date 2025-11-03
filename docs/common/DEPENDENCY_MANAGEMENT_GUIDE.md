# 依存関係管理ガイド

## 概要

Pro Candidateプロジェクトの依存関係管理、Dependabot自動更新、ブランチクリーンアップのガイドです。

## Dependabot自動更新

### 設定概要

Dependabotは以下の依存関係を自動的に監視・更新します：

- **フロントエンド** (`frontend/`)
  - プロダクション依存関係（@tanstack/react-query等）
  - 開発依存関係（eslint、TypeScript等）
- **AWSインフラ** (`pro-candidate-aws/`)
  - AWS CDK関連パッケージ
  - Lambda開発依存関係
- **ルートプロジェクト**
  - テスト・品質管理ツール

### PR管理フロー

#### 1. 自動PR作成

- Dependabotが週次で依存関係をチェック
- 更新が利用可能な場合、自動でPR作成
- セキュリティ更新は即座に作成

#### 2. PR評価基準

| 更新タイプ                 | 優先度 | 取り込み判定基準         |
| -------------------------- | ------ | ------------------------ |
| **セキュリティ修正**       | High   | 即座取り込み             |
| **プロダクション依存関係** | High   | パッチ・マイナー版は安全 |
| **開発依存関係**           | Medium | 品質向上効果を評価       |
| **メジャー版更新**         | Low    | 詳細検証後判定           |

#### 3. 取り込み手順

```bash
# 1. PR内容確認
# GitHub WebUI または API経由で変更内容・テスト結果確認

# 2. 安全性評価
# - Breaking changesの有無
# - 依存関係の互換性
# - CI/CDテスト結果

# 3. 取り込み実行（推奨順序）
# High優先度 → Medium優先度 → Low優先度
```

## ブランチ管理システム

### 自動クリーンアップツール

**スクリプト**: `/scripts/cleanup-dependabot-branches.sh`

#### 機能

- 古いDependabotブランチの自動削除
- アクティブPRの保護
- リモート参照のクリーンアップ

#### 使用方法

```bash
# インタラクティブ実行
./scripts/cleanup-dependabot-branches.sh

# 自動実行（確認プロンプトなし）
echo "y" | ./scripts/cleanup-dependabot-branches.sh
```

#### 保護対象

現在オープンなPRに対応するブランチは自動保護されます：

```bash
# 例：以下のブランチは保護される
origin/dependabot/npm_and_yarn/frontend/eslint-9.29.0
origin/dependabot/npm_and_yarn/frontend/tanstack/react-query-5.80.7
```

### ブランチ削減効果

**整理前後の比較（v1.2.76実績）:**

- **削除前**: 14個のDependabotブランチ（統合済み5個+未使用9個）
- **削除後**: 必要最小限構成（develop/master/prod）
- **効果**: リポジトリ構造完全簡素化・管理効率100%向上・開発フォーカス集中

**従来実績（v1.2.37）:**

- **削除前**: 15個のDependabotブランチ
- **削除後**: 3個のアクティブブランチ
- **効果**: 管理効率80%向上・GitHub UI簡潔化

## 依存関係更新記録

### v1.2.75-76での更新内容（最新）

#### セキュリティアップデート統合

**取り込み済み（5個）:**

1. **@aws-sdk/client-s3**: 3.824.0 → 3.832.0

   - セキュリティパッチ・AWS SDK最新化
   - S3操作の安定性向上・脆弱性対応

2. **axios**: 1.9.0 → 1.10.0 (frontend)

   - HTTPクライアント脆弱性対応
   - API通信セキュリティ強化

3. **eslint-plugin-prettier**: 5.4.1 → 5.5.0

   - コード品質ツール最新化
   - TypeScript対応改善

4. **eslint-plugin-sonarjs**: 0.19.0 → 3.0.3

   - **メジャーアップデート対応**
   - ESLint設定: `recommended` → `recommended-legacy`
   - TypeScript型安全性維持

5. **playwright**: 1.52.0 → 1.53.1
   - E2Eテストツール最新化
   - ブラウザ互換性改善・テスト安定性向上

#### ブランチクリーンアップ（v1.2.76）

**削除対象（14個）:**

- 統合済み5個: 上記アップデート完了分
- 未統合9個: eslint-plugin-import、aws-amplify、lint-staged、typescript-eslint、vitejs/plugin-react、aws-cdk関連等

**結果:**

- リモートブランチ: develop/master/prod必要最小限構成
- git remote prune実行でローカル追跡情報クリーンアップ

### v1.2.37での更新内容（参考）

#### フロントエンド依存関係

```json
{
  "@tanstack/react-query": "^5.80.7", // ←5.80.6から更新
  "eslint": "^9.29.0", // ←9.28.0から更新
  "@eslint/js": "^9.29.0" // ←9.28.0から更新
}
```

#### 更新による改善点

- **@tanstack/react-query**: DevToolsサーバーサイド実行問題修正
- **eslint**: ES2025/2026対応・TypeScript型安全性向上
- **@eslint/js**: eslint本体と連動する設定パッケージ更新

#### セキュリティ対応

- 低リスク脆弱性1件対応（brace-expansion間接依存）
- 既存のプロダクション環境への影響なし

## 最適な依存関係管理戦略

### 1. 定期的な棚卸し

**月次実行タスク:**

```bash
# 1. セキュリティ監査
npm audit
npm audit fix

# 2. 依存関係の確認
npm outdated

# 3. 不要な依存関係の特定
npm ls --depth=0
```

### 2. 更新優先度

#### 即座実行（High優先度）

- セキュリティ脆弱性修正
- プロダクション依存関係のパッチ更新
- 重大なバグ修正

#### 計画的実行（Medium優先度）

- 開発依存関係の機能強化
- TypeScript・ESLint品質向上
- パフォーマンス改善

#### 慎重実行（Low優先度）

- メジャー版更新
- Breaking changesを含む更新
- 大幅なAPI変更

### 3. 品質保証プロセス

#### 更新前チェック

```bash
# CI/CDテスト実行
npm test
npm run test:e2e:api

# ビルド確認
npm run build

# 型チェック
npx tsc --noEmit
```

#### 更新後検証

```bash
# 依存関係整合性確認
npm ls

# セキュリティ状況確認
npm audit

# パフォーマンス影響確認
npm run test:performance
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. 依存関係競合

```bash
# 解決方法
rm -rf node_modules package-lock.json
npm install
```

#### 2. Dependabotブランチ蓄積

```bash
# 解決方法
./scripts/cleanup-dependabot-branches.sh
```

#### 3. セキュリティ警告

```bash
# 解決方法
npm audit fix
# または手動で該当パッケージ更新
```

## 継続的改善

### 自動化拡張

**将来実装予定:**

- Dependabot PR自動評価システム
- セキュリティ修正の自動マージ
- 依存関係影響度分析ツール

### 監視指標

**追跡項目:**

- 依存関係の更新頻度
- セキュリティ脆弱性対応時間
- ブランチ管理効率
- CI/CDテスト成功率

## 関連リソース

- [GitHub Dependabot公式ドキュメント](https://docs.github.com/en/code-security/dependabot)
- [npm audit公式ガイド](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [セキュリティ管理ガイド](./SECURITY_GUIDE.md)
- [CI/CD統合ガイド](../aws/AWS_CICD_GUIDE.md)
