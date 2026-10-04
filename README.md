# 棚卸し管理アプリ

商品在庫（洋服・雑貨など）の棚卸し作業を効率化するWebアプリケーション。
家族4人でローカルネットワーク内で使用することを想定した、個人学習用プロジェクトです。

## 背景

これまで紙に正の字を書いてカウントしていた棚卸し作業を、複数人が同時にスマホ・タブレットから操作できるWebアプリに置き換える目的で開発しました。Go（バックエンド）とReact（フロントエンド）の学習を兼ねています。

## 主な機能

- **商品マスタ管理**: 商品（カテゴリ）× 価格 の組み合わせでSKUを管理
- **棚卸しセッション**: 前回の商品マスタを引き継ぎつつ数量だけリセットして新規棚卸しを開始、中断・再開も可能
- **カウント操作**: ワンタップで+1、または数値を直接入力
- **同時作業対応**: 誰がどの商品をカウント中か表示し、重複カウントを防止
- **CSV出力**: 棚卸し結果をCSVとしてダウンロード（CSVがSource of Truth）
- **集計表示**: 商品種類別・全体の合計金額を表示

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React + TypeScript + Vite |
| バックエンド | Go（標準 `net/http`） |
| データベース | PostgreSQL（作業用） |
| 永続化 | CSVファイル（Source of Truth） |
| インフラ | Docker Compose |

## アーキテクチャ

バックエンドはレイヤードアーキテクチャ（`handler` → `usecase` → `repository`）で構成しています。

```
backend/
├── main.go
├── internal/
│   ├── product/     # 商品・SKU管理
│   ├── session/     # 棚卸しセッション管理
│   ├── shared/       # config, database, httputil など共通処理
│   └── tools/
└── db/migrations/   # golang-migrate によるDBマイグレーション

frontend/
├── src/
│   ├── pages/        # 画面単位のコンポーネント
│   ├── components/    # 再利用コンポーネント（ui/含む）
│   ├── features/      # 機能単位のフック
│   ├── hooks/
│   └── api/
```

詳細な設計は以下を参照してください。

- [要件定義](docs/REQUIREMENTS.md)
- [アーキテクチャ設計](docs/ARCHITECTURE.md)
- [画面設計](docs/SCREENS.md)
- [バックエンド設計](docs/backend/ARCHITECTURE.md)

## 開発環境の起動

```bash
# 開発環境を起動（ビルド込み）
make up-build

# マイグレーション実行
make migrate-up
```

起動後、以下にアクセスできます。

- フロントエンド: http://localhost:5173
- 本番相当: http://localhost

その他のコマンドは `make help` で確認できます。

## ディレクトリ構成

```
stocktaking_app/
├── backend/            # Go API サーバー
├── frontend/           # React フロントエンド
├── docs/               # 要件定義・設計ドキュメント
├── data/               # CSVファイル保存先（gitignore対象）
├── docker-compose.yml       # 本番用
├── docker-compose.dev.yml  # 開発用
└── Makefile            # 開発コマンド集
```
