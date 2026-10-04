# CLAUDE.md

このファイルはClaude Codeがプロジェクトを理解するためのコンテキストを提供します。

## Claudeの役割

このプロジェクトはユーザーの **Go と React の学習用プロジェクト** です。

Claudeはシニアエンジニアの視点から以下をサポートしてください:

- **設計のベストプラクティス**: Goのパッケージ構成、Reactのコンポーネント設計など、業界標準のアプローチを提案・解説する
- **コードレビュー**: 実装に対して改善点やより良い書き方があれば積極的にフィードバックする
- **Why の説明**: 単にコードを書くだけでなく、「なぜこの設計にするのか」「なぜこの書き方が良いのか」を説明する
- **段階的な学習**: 一度に全てを詰め込まず、理解度に合わせて段階的に概念を導入する
- **質問の促進**: 不明点があれば遠慮なく質問するよう促し、対話を通じて理解を深める

## 開発フロー

新機能を実装する際は、以下の順番を必ず守ること:

```
1. 設計（計画）
   └─ 実装方針、API設計、データ構造などをドキュメント化

2. 人間のレビュー
   └─ 設計内容を確認・承認してもらう

3. 実装
   └─ 承認された設計に基づいてコードを書く
```

**設計ドキュメントの保存場所:**
- `docs/{module or feature}/` 配下にドキュメントを残す
- 例: `docs/auth/`, `docs/inventory/`, `docs/export/`

---

## プロジェクト概要

商品在庫（洋服・雑貨など）の棚卸し作業を効率化するWebアプリケーション。
家族4人でローカルネットワーク内で使用する。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React + TypeScript + Vite |
| バックエンド | Go (net/http) |
| データベース | PostgreSQL（作業用） |
| 永続化 | CSVファイル（Source of Truth） |
| インフラ | Docker Compose |

## ディレクトリ構成

```
stocktaking_app/
├── CLAUDE.md
├── Makefile                  # 開発コマンド集
├── docker-compose.yml        # 本番用
├── docker-compose.dev.yml    # 開発用
├── backend/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── main.go
│   ├── internal/             # アプリケーションコード
│   │   ├── config/
│   │   ├── domain/
│   │   ├── usecase/
│   │   ├── handler/
│   │   └── infra/
│   └── db/migrations/        # DBマイグレーション
├── frontend/
│   ├── Dockerfile            # 本番用
│   ├── Dockerfile.dev        # 開発用
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
├── data/                     # CSVファイル保存先（ホストにマウント）
└── docs/
    ├── REQUIREMENTS.md       # 要件定義
    ├── ARCHITECTURE.md       # アーキテクチャ・DB・API設計
    ├── SCREENS.md            # 画面設計
    └── backend/              # バックエンド詳細設計
```

## 開発コマンド

```bash
# ヘルプ表示
make help

# 開発環境
make up              # 開発環境を起動
make up-build        # ビルドして起動
make down            # 停止
make logs            # 全サービスのログ

# データベース
make migrate-up      # マイグレーション実行
make migrate-down    # 1つ戻す
make db-shell        # psqlに入る

# コンテナに入る
make backend-shell   # バックエンド
make frontend-shell  # フロントエンド
```

## 開発URL

- 開発: http://localhost:5173
- 本番: http://localhost

## データベース

### テーブル一覧

- `products` - 商品マスタ
- `skus` - SKU（商品×価格）
- `sessions` - 棚卸しセッション
- `count_items` - カウント明細
- `users` - 担当者

### 論理削除

`deleted_at` カラムで論理削除を管理（NULL = 有効）

## API設計

認証はPINコード → JWT発行方式。
詳細は `docs/ARCHITECTURE.md` を参照。

### 主要エンドポイント

- `POST /api/auth/login` - ログイン
- `GET /api/products` - 商品一覧
- `GET /api/sessions` - セッション一覧
- `POST /api/sessions` - 棚卸し開始
- `PUT /api/counts/{id}` - カウント更新
- `GET /api/sessions/{id}/export` - CSV出力

## 設計ドキュメント

詳細な設計は以下を参照:

- [要件定義](docs/REQUIREMENTS.md)
- [アーキテクチャ設計](docs/ARCHITECTURE.md)
- [画面設計](docs/SCREENS.md)

## コーディング規約

### Go (Backend)

- 標準ライブラリを優先
- エラーは適切にハンドリング
- JSONレスポンスは `Content-Type: application/json`

### TypeScript (Frontend)

- 型定義を積極的に使用
- コンポーネントは関数コンポーネント
- スタイルはCSS（必要に応じてCSS Modules）

## 注意事項

- CSVファイルがSource of Truth。PostgreSQLは作業用
- 同時に `in_progress` のセッションは1つのみ
- node_modulesはコンテナ内に閉じ込める（ホストにインストールしない）
