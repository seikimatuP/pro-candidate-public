# UI/UX レビュー用 Claude Code コマンド・スキル

フロントエンドの UI/UX を Claude Code でレビュー・改善する際に使えるスラッシュコマンドとスキルの一覧。全てユーザーのグローバル設定（`~/.claude/commands/`、`~/.claude/skills/`）に配置済みで、`/コマンド名` で呼び出せる。

## 使い方の筋

推奨フロー:

1. **診断**: `/critique` で全体レビュー（AI slop 検出・視覚階層・情報設計など）
2. **深掘り監査**: 指摘された領域を `/audit` or `/wcag-audit-patterns` で具体化
3. **改善アクション**: `/simplify` / `/polish` / `/quieter` など方向性に合うコマンドで修正

## レビュー・監査系

| コマンド                     | 用途                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/critique`                  | デザインディレクター視点の holistic レビュー。AI Slop 検出を最優先に、視覚階層・情報設計・感情的共鳴・マイクロコピーまで評価。優先課題と推奨コマンドを提示する |
| `/audit`                     | 全体監査                                                                                                                                                       |
| `/wcag-audit-patterns`       | WCAG アクセシビリティ監査                                                                                                                                      |
| `/fixing-accessibility`      | a11y 問題の修正                                                                                                                                                |
| `/fixing-motion-performance` | アニメーション・モーション性能修正                                                                                                                             |
| `/fixing-metadata`           | メタデータ修正                                                                                                                                                 |

## デザイン改善アクション

| コマンド     | 用途                               |
| ------------ | ---------------------------------- |
| `/polish`    | 仕上げ・磨き上げ                   |
| `/simplify`  | 複雑さの削減（AI slop 除去に有効） |
| `/bolder`    | もっと大胆に                       |
| `/quieter`   | もっと控えめに                     |
| `/delight`   | 遊び心を足す                       |
| `/clarify`   | 情報を明確化                       |
| `/normalize` | デザイン整合性の統一               |
| `/colorize`  | 色使いの調整                       |
| `/animate`   | アニメーション追加                 |
| `/adapt`     | レスポンシブ対応                   |
| `/harden`    | 堅牢化                             |
| `/optimize`  | 最適化                             |
| `/finish`    | 最終仕上げ                         |

## 設計思想・参照系

デザイン原則を参照したいとき。

| コマンド                      | 用途                     |
| ----------------------------- | ------------------------ |
| `/frontend-design`            | フロントエンド設計原則   |
| `/interface-design`           | UI 設計                  |
| `/interaction-design`         | インタラクション設計     |
| `/ui-ux-pro-max`              | 総合                     |
| `/web-design-guidelines`      | Web デザインガイドライン |
| `/baseline-ui`                | ベースライン UI          |
| `/canvas-design`              | キャンバス設計           |
| `/design-lab`                 | 実験・プロトタイプ       |
| `/12-principles-of-animation` | アニメーション 12 原則   |
| `/init-design`                | 初期設計                 |
| `/onboard`                    | オンボーディング         |
| `/extract`                    | パターン抽出             |

## このプロジェクト固有の注意点

デザイン方針は `.claude/skills/design-context/SKILL.md`（Skill 化済み。UI/UX 作業時に参照される）に
まとまっている。レビュー時はこれと矛盾しない方向で改善案を出すこと:

- **Brand Personality**: 親しみやすい・見やすい・信頼できる
- **カラーパレット**: インディゴ系プライマリ + ピンクアクセント
- **タイポグラフィ**: Inter + Noto Sans JP
- **アンチリファレンス**: Bloomberg Terminal 的な情報過多、業務システム的な無機質さ
- **既知の課題（2026-02-06 Audit）**: MUI テーマと dashboard.css の分裂、レイアウトの平坦さ、データの見せ方の単調さ、色使いの散漫、カードの没個性

特に `/critique` での AI slop 検出は、Dashboard 2周目改修 (`41876f5c` / `aa25c5c4`) で既に一部対応済みだが、他ページでの一貫性確認には引き続き有効。
