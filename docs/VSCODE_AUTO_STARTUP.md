# VSCode自動起動設定ガイド

**最終更新**: 2025-06-29

## 🚀 概要

VSCode起動時に開発サーバーとPlaywrightを自動起動する設定を実装。手動でnpmコマンドを実行する必要がなくなり、開発効率が大幅に向上。

## 📋 設定内容

### 自動起動タスク（2個）

#### 1. 🚀 開発サーバー自動起動

- **コマンド**: `npm run dev`
- **URL**: http://localhost:5173
- **検出パターン**: "Local:" → "ready in"（Vite起動完了）

#### 2. 🎭 Playwright UIモード自動起動

- **コマンド**: `npm run e2e:server`
- **URL**: http://localhost:9323
- **検出パターン**: "Express server" → "http://localhost:9323"

### 手動制御タスク（3個）

#### 3. 📱 フロントエンドのみ起動

- 開発サーバーのみ単独起動

#### 4. 🧪 E2Eテストのみ起動

- Playwrightサーバーのみ単独起動

#### 5. 🛑 全サーバー停止

- `pkill -f "vite|playwright"` で一括停止

## ⚙️ 設定ファイル

**ファイルパス**: `.vscode/tasks.json`

### 自動起動の仕組み

```json
{
  "runOptions": {
    "runOn": "folderOpen" // VSCode起動時に自動実行
  },
  "isBackground": true, // バックグラウンド実行
  "problemMatcher": {
    "background": {
      "beginsPattern": "Local:",
      "endsPattern": "ready in" // 起動完了検出
    }
  }
}
```

### 表示設定

```json
{
  "presentation": {
    "echo": true, // コマンド表示
    "reveal": "always", // 常にターミナル表示
    "focus": false, // フォーカスしない
    "panel": "dedicated", // 専用パネル
    "showReuseMessage": false
  }
}
```

## 🎯 使用方法

### 自動起動

1. **VSCode起動**:

   ```bash
   code /home/ynozue/pro_candidate
   ```

2. **自動実行確認**:
   - 開発サーバー: http://localhost:5173
   - Playwright E2E: http://localhost:9323

### 手動制御

1. **タスク実行**:

   - `Ctrl+Shift+P` → `Tasks: Run Task`
   - `Terminal` → `Run Task...`

2. **サーバー停止**:
   - 🛑 全サーバー停止タスク実行
   - または各パネルで `Ctrl+C`

## 📊 メリット

✅ **即座開発開始**: VSCode起動だけで全環境準備完了  
✅ **並列実行**: 開発サーバーとE2Eが同時起動  
✅ **個別制御**: 必要なサービスのみ起動可能  
✅ **停止簡単**: 1クリックで全サーバー停止  
✅ **状況可視化**: 各サーバーの状態を専用パネルで確認  
✅ **手動不要**: npmコマンド手動実行が不要

## 🔧 トラブルシューティング

### ポート競合

```bash
# ポート使用状況確認
lsof -i :5173
lsof -i :9323

# プロセス強制終了
pkill -f vite
pkill -f playwright
```

### タスク再実行

```bash
# VSCodeリロード
Ctrl+Shift+P → "Developer: Reload Window"
```

### 設定無効化

tasks.jsonから`"runOn": "folderOpen"`を削除すると自動起動を無効化可能。

## 📝 関連ドキュメント

- [プロジェクトドキュメント](README.md)
- [E2Eテストガイド](development/TESTING/E2E_TESTING.md)
- [AWS環境設定](aws/AWS_INFRASTRUCTURE_DOCUMENTATION.md)
