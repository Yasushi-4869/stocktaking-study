# アーキテクチャ設計書

## 1. システム構成

```
┌─────────────────────────────────────────────────────────────┐
│  ローカルPC (Docker Compose)                                 │
│                                                             │
│  ┌───────────────┐     ┌───────────────┐    ┌───────────┐  │
│  │   Frontend    │────▶│   Backend     │───▶│ PostgreSQL│  │
│  │  React + Vite │     │   Go API      │    │           │  │
│  │   (Nginx)     │     │   :8080       │    │   :5432   │  │
│  │  :80 / :5173  │     └───────────────┘    └───────────┘  │
│  └───────────────┘              │                          │
│                                 ▼                          │
│                          ┌───────────┐                     │
│                          │ ./data/   │ ← ホストにマウント   │
│                          │  (CSV)    │                     │
│                          └───────────┘                     │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ 同一WiFiネットワーク
   ┌─────┴─────┐
   │ スマホ    │
   │ タブレット │
   └───────────┘
```

### 技術スタック

| レイヤー | 技術 | 備考 |
|----------|------|------|
| フロントエンド | React + TypeScript + Vite | スマホ・タブレット対応UI |
| バックエンド | Go (net/http) | REST API |
| データベース | PostgreSQL | 作業用DB |
| 永続化 | CSVファイル | Source of Truth |
| インフラ | Docker Compose | ローカル実行 |

---

## 2. データ永続化の方針

### 役割分担

| 保存先 | 役割 | 特徴 |
|--------|------|------|
| **CSV (SoT)** | 永続データ | ホストの`./data/`にマウント。コンテナ削除でも安全 |
| **PostgreSQL** | 作業用DB | 棚卸し作業中のデータ保持、中断・再開対応 |

### データフロー

```
┌─────────────────────────────────────────────────────────────┐
│                     データフロー                             │
│                                                             │
│   CSVファイル (SoT)            PostgreSQL (作業用)           │
│   ./data/                      コンテナ内                    │
│   ├── products.csv             ┌─────────────┐             │
│   ├── skus.csv          ──────▶│ 棚卸し開始時 │             │
│   └── sessions/                │  CSVから    │             │
│       └── 2024-01-15.csv       │  DBにロード  │             │
│                                └─────────────┘             │
│              ▲                       │                      │
│              │                       ▼                      │
│       ┌──────┴──────┐          ┌─────────────┐             │
│       │ 棚卸し完了時 │◀─────────│ 作業中は    │             │
│       │ CSVに出力   │          │ DBで管理    │             │
│       └─────────────┘          │ (中断対応)   │             │
│                                └─────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### フロー詳細

1. **棚卸し開始**: CSV → PostgreSQL にロード（数量は0リセット）
2. **作業中**: PostgreSQL で読み書き（リアルタイム更新）
3. **中断**: そのまま放置（DBに残る）
4. **再開**: DBから続きを作業
5. **完了**: PostgreSQL → CSV にエクスポート

---

## 3. データベース設計

### ER図

```
┌─────────────┐       ┌─────────────┐
│  products   │       │   users     │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ name        │       │ name        │
│ deleted_at  │       │ pin_hash    │
│ created_at  │       │ created_at  │
│ updated_at  │       └──────┬──────┘
└──────┬──────┘              │
       │ 1:N                 │
       ▼                     │
┌─────────────┐              │
│    skus     │              │
├─────────────┤              │
│ id (PK)     │              │
│ product_id  │─FK           │
│ price       │              │
│ deleted_at  │              │
│ created_at  │              │
│ updated_at  │              │
└──────┬──────┘              │
       │                     │
       │ 1:N                 │
       ▼                     │
┌─────────────┐       ┌──────┴──────┐
│ count_items │       │  sessions   │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ session_id  │─FK────│ name        │
│ sku_id      │─FK    │ status      │
│ quantity    │       │ started_at  │
│ user_id     │─FK────│ completed_at│
│ updated_at  │       └─────────────┘
└─────────────┘
```

### テーブル定義

#### products（商品マスタ）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | 商品ID |
| name | VARCHAR(255) | NOT NULL, UNIQUE | 商品名 |
| deleted_at | TIMESTAMP | | 削除日時（NULL=有効） |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

#### skus（SKU）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | SKU ID |
| product_id | INTEGER | FK → products, NOT NULL | 商品ID |
| price | INTEGER | NOT NULL | 価格（円） |
| deleted_at | TIMESTAMP | | 削除日時（NULL=有効） |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |
| | | UNIQUE(product_id, price) | 商品×価格でユニーク |

#### sessions（棚卸しセッション）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | セッションID |
| name | VARCHAR(255) | NOT NULL | セッション名 |
| status | VARCHAR(50) | NOT NULL | in_progress / completed |
| started_at | TIMESTAMP | NOT NULL | 開始日時 |
| completed_at | TIMESTAMP | | 完了日時（NULL可） |

#### count_items（カウント明細）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | カウントID |
| session_id | INTEGER | FK → sessions, NOT NULL | セッションID |
| sku_id | INTEGER | FK → skus, NOT NULL | SKU ID |
| quantity | INTEGER | NOT NULL, DEFAULT 0 | カウント数 |
| user_id | INTEGER | FK → users | 担当者ID（NULL可） |
| updated_at | TIMESTAMP | NOT NULL | 最終更新日時 |
| | | UNIQUE(session_id, sku_id) | セッション×SKUでユニーク |

#### users（担当者）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | ユーザーID |
| name | VARCHAR(255) | NOT NULL | 担当者名 |
| pin_hash | VARCHAR(255) | NOT NULL | PINコードのハッシュ |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |

### VIEW定義

#### sku_details（SKU詳細ビュー）

```sql
CREATE VIEW sku_details AS
SELECT
    s.id AS sku_id,
    p.id AS product_id,
    p.name AS product_name,
    s.price,
    s.deleted_at
FROM skus s
JOIN products p ON s.product_id = p.id;
```

---

## 4. CSVファイル形式

### products.csv
```csv
id,name,created_at,updated_at
1,靴,2024-01-15T10:00:00Z,2024-01-15T10:00:00Z
2,財布,2024-01-15T10:00:00Z,2024-01-15T10:00:00Z
```

### skus.csv
```csv
id,product_id,price,deleted_at,created_at,updated_at
1,1,1600,,2024-01-15T10:00:00Z,2024-01-15T10:00:00Z
2,1,2700,,2024-01-15T10:00:00Z,2024-01-15T10:00:00Z
3,2,2700,,2024-01-15T10:00:00Z,2024-01-15T10:00:00Z
```

### sessions/2024-01-15.csv（棚卸し結果）
```csv
product_name,price,quantity,subtotal
靴,1600,3,4800
靴,2700,5,13500
財布,2700,2,5400
,,合計,23700
```

---

## 5. API設計

### 認証方式

- PINコード認証 → JWT発行
- 以降のリクエストは `Authorization: Bearer <token>` で認証
- 将来的にパスワード認証への拡張を考慮した設計

```
POST /api/auth/login
    │
    ▼
┌─────────────────────────────────────┐
│  PINコード検証 → JWT発行            │
│  { "token": "eyJhbG..." }           │
└─────────────────────────────────────┘
    │
    ▼
以降のリクエストはトークンで認証
Authorization: Bearer eyJhbG...
```

### エンドポイント一覧

#### 認証 API

| メソッド | エンドポイント | 説明 | 認証 |
|----------|---------------|------|------|
| POST | `/api/auth/login` | ログイン（PIN → JWT発行） | 不要 |
| POST | `/api/auth/logout` | ログアウト（トークン無効化） | 必要 |
| GET | `/api/auth/me` | 現在のユーザー情報取得 | 必要 |

**リクエスト/レスポンス例:**
```json
// POST /api/auth/login
// Request
{ "user_id": 1, "pin": "1234" }

// Response
{ "token": "eyJhbG...", "user": { "id": 1, "name": "お父さん" } }
```

#### ユーザー API

| メソッド | エンドポイント | 説明 | 認証 |
|----------|---------------|------|------|
| GET | `/api/users` | ユーザー一覧取得 | 必要 |
| POST | `/api/users` | ユーザー作成（PIN設定） | 必要 |
| PUT | `/api/users/{id}` | ユーザー更新 | 必要 |
| DELETE | `/api/users/{id}` | ユーザー削除（論理削除） | 必要 |

#### 商品 API

| メソッド | エンドポイント | 説明 | 認証 |
|----------|---------------|------|------|
| GET | `/api/products` | 商品一覧取得 | 必要 |
| POST | `/api/products` | 商品作成 | 必要 |
| PUT | `/api/products/{id}` | 商品更新 | 必要 |
| DELETE | `/api/products/{id}` | 商品削除（論理削除） | 必要 |

#### SKU API

| メソッド | エンドポイント | 説明 | 認証 |
|----------|---------------|------|------|
| GET | `/api/skus` | 全SKU一覧取得 | 必要 |
| GET | `/api/products/{id}/skus` | 商品に紐づくSKU一覧 | 必要 |
| POST | `/api/products/{id}/skus` | SKU追加（価格追加） | 必要 |
| PUT | `/api/skus/{id}` | SKU更新 | 必要 |
| DELETE | `/api/skus/{id}` | SKU削除（論理削除） | 必要 |

#### セッション API

| メソッド | エンドポイント | 説明 | 認証 |
|----------|---------------|------|------|
| GET | `/api/sessions` | セッション一覧取得 | 必要 |
| GET | `/api/sessions/{id}` | セッション詳細取得 | 必要 |
| POST | `/api/sessions` | 新規棚卸し開始（`in_progress`で作成） | 必要 |
| PUT | `/api/sessions/{id}` | セッション更新（名前変更など） | 必要 |
| POST | `/api/sessions/{id}/complete` | 棚卸し完了 | 必要 |
| POST | `/api/sessions/{id}/reopen` | セッション再オープン | 必要 |

**状態遷移:**
```
in_progress → completed
     ↑            │
     └── reopen ──┘
```

**制約:**
- 同時に `in_progress` のセッションは1つのみ

#### カウント API

| メソッド | エンドポイント | 説明 | 認証 |
|----------|---------------|------|------|
| GET | `/api/sessions/{id}/counts` | カウント一覧取得 | 必要 |
| PUT | `/api/counts/{id}` | カウント更新（数量 + 更新者を記録） | 必要 |

**リクエスト/レスポンス例:**
```json
// PUT /api/counts/123
// Request
{ "quantity": 5 }

// Response
{
  "id": 123,
  "sku_id": 1,
  "product_name": "靴",
  "price": 1600,
  "quantity": 5,
  "user_id": 1,
  "user_name": "お父さん",
  "updated_at": "2024-01-15T15:30:00Z"
}
```

#### エクスポート API

| メソッド | エンドポイント | 説明 | 認証 |
|----------|---------------|------|------|
| GET | `/api/sessions/{id}/export` | 棚卸し結果をCSVダウンロード | 必要 |

**CSV出力形式:**
```csv
商品名,価格,数量,小計
靴,1600,3,4800
靴,2700,5,13500
財布,2700,2,5400

合計,,,23700
```

---

## 6. 今後の設計項目

- [x] API設計（エンドポイント一覧）
- [x] 画面設計（ワイヤーフレーム）→ `docs/SCREENS.md`
- [ ] エラーハンドリング方針
