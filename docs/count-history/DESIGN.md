# カウント履歴機能 設計書

## 1. 概要

### 背景

現在、`count_items`テーブルは累計値のみを保持しており、「いつ・誰が・何個変更したか」の履歴が残らない。
棚卸し作業の追跡・検証のために、カウント変更履歴を記録・閲覧できる機能を追加する。

### ゴール

- すべてのカウント変更操作（増減・削除）を履歴として記録する
- 専用の履歴ページでフィルター付きで閲覧できるようにする

---

## 2. データベース設計

### 新規テーブル: `count_histories`

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | 履歴ID |
| session_id | INTEGER | FK → sessions, NOT NULL | セッションID |
| sku_id | INTEGER | FK → skus, NOT NULL | SKU ID |
| user_id | INTEGER | FK → users | 操作したユーザー（NULL可） |
| operation | VARCHAR(20) | NOT NULL | 操作種別: `count` / `delete` |
| change | INTEGER | NOT NULL | 変化量（例: +2, -1, -10） |
| quantity_after | INTEGER | NOT NULL | 操作後の累計値 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 操作日時 |

### インデックス

| インデックス | カラム | 用途 |
|---|---|---|
| idx_count_histories_session_id | session_id | セッション単位の絞り込み |
| idx_count_histories_sku_id | sku_id | SKU単位の絞り込み |
| idx_count_histories_created_at | created_at | 日時ソート・範囲検索 |

### マイグレーション

`000011_create_count_histories`

```sql
-- up
CREATE TABLE count_histories (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sku_id INTEGER NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('count', 'delete')),
    change INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_count_histories_session_id ON count_histories(session_id);
CREATE INDEX idx_count_histories_sku_id ON count_histories(sku_id);
CREATE INDEX idx_count_histories_created_at ON count_histories(created_at);

-- down
DROP TABLE IF EXISTS count_histories;
```

### ER図（追加部分）

```
                    ┌─────────────┐
                    │   users     │
                    └──────┬──────┘
                           │
count_items (既存)          │       count_histories (新規)
┌─────────────┐            │       ┌──────────────────┐
│ id          │            │       │ id               │
│ session_id  │──┐         │       │ session_id       │──FK→ sessions
│ sku_id      │  │         │       │ sku_id           │──FK→ skus
│ quantity    │  │         │       │ user_id          │──FK→ users
│ user_id     │  │         │       │ operation        │
│ updated_at  │  │         │       │ change           │
└─────────────┘  │         │       │ quantity_after   │
                 │         │       │ created_at       │
                 │         │       └──────────────────┘
                 │         │
                 ▼         │    商品情報は JOIN で取得:
            sessions       │    count_histories → skus → products
                           │
```

### `count_items`との役割分担

| テーブル | 役割 | 書き込みパターン |
|---|---|---|
| `count_items` | 現在の累計値（読み取り最適化） | UPSERT（上書き） |
| `count_histories` | 変更履歴（追跡用） | INSERT ONLY（追記のみ） |

---

## 3. 記録タイミング

### operation = `count`

以下のすべての操作で記録する:

| フロントの操作 | change の例 | 備考 |
|---|---|---|
| モーダルでSKU追加（既存価格に加算） | +3 | 既存SKUの数量を加算 |
| モーダルでSKU追加（新規） | +1 | 初回カウント |
| +/- ボタン | +1 / -1 | ボタン操作 |
| 数字を直接編集 | +5 / -3 | 編集前後の差分を記録 |

### operation = `delete`

| フロントの操作 | change の例 | 備考 |
|---|---|---|
| SKU削除 | -10 | 現在の数量分をマイナスで記録、quantity_after = 0 |

### 記録ロジック（バックエンド）

```
UpsertCount の処理フロー:
  1. 既存の count_item を取得（なければ quantity = 0）
  2. change = new_quantity - old_quantity
  3. count_items を UPSERT（従来通り）
  4. change != 0 の場合、count_histories に INSERT ← 新規追加

DeleteSKU の処理フロー:
  1. 現在のセッションの count_item を取得
  2. count がある場合、count_histories に operation='delete' で INSERT ← 新規追加
  3. SKU を論理削除（従来通り）
```

---

## 4. API設計

### 履歴取得エンドポイント

```
GET /api/histories
```

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| session_id | integer | - | セッションで絞り込み |
| product_id | integer | - | 商品で絞り込み（skus経由） |
| user_id | integer | - | ユーザーで絞り込み |
| operation | string | - | `count` / `delete` |
| from | string (ISO8601) | - | 開始日時 |
| to | string (ISO8601) | - | 終了日時 |
| sort | string | - | `asc` / `desc`（デフォルト: `desc`） |
| limit | integer | - | 取得件数（デフォルト: 50） |
| offset | integer | - | オフセット（ページネーション用） |

### レスポンス例

```json
{
  "histories": [
    {
      "id": 1,
      "sessionId": 11,
      "sessionName": "2026年2月棚卸し",
      "skuId": 162,
      "productName": "Tシャツ",
      "price": 1900,
      "userId": null,
      "userName": null,
      "operation": "count",
      "change": 3,
      "quantityAfter": 10,
      "createdAt": "2026-02-10T07:02:55Z"
    }
  ],
  "total": 150
}
```

**ポイント:**
- レスポンスにはJOINで取得した `productName`, `price`, `sessionName`, `userName` を含める
- フロント側で追加のAPI呼び出しが不要になる
- `total` を返すことでページネーションUIが実装可能

---

## 5. バックエンド設計

### パッケージ構成

```
backend/internal/
├── shared/
│   └── database/
│       ├── postgres.go           # DB接続（既存）
│       ├── error.go              # エラーマッピング（既存）
│       └── tx.go                 # DBTX インターフェース + Transactor（新規）
├── history/                      ← 新規パッケージ
│   ├── model.go                  # CountHistory 構造体
│   ├── repository.go             # Repository インターフェース
│   ├── repository_postgres.go    # PostgreSQL実装
│   ├── usecase.go                # ビジネスロジック
│   └── handler.go                # HTTPハンドラー
├── session/
│   ├── repository_postgres.go    # DBTX対応に変更
│   └── usecase.go                # UpsertCount に履歴記録を追加
└── product/
    ├── repository_postgres.go    # DBTX対応に変更
    └── usecase.go                # DeleteSKU に履歴記録を追加
```

### 履歴記録の実装方針

`session.Usecase`の`UpsertCount`メソッド内で、カウント変更時に`count_histories`にINSERTする。

`history`パッケージの`Repository`を`session.Usecase`に注入（DI）する。

```
session.NewUsecase(
    sessionRepo,
    countItemRepo,
    productLockRepo,
    countHistoryRepo,   ← 追加
    transactor,         ← 追加
)
```

### トランザクション設計

#### 背景

現在のコードベースにはトランザクション機構がない。
`count_items`の更新と`count_histories`の挿入は不可分な操作であり、
片方だけ成功してもう片方が失敗すると不整合が起きるため、トランザクションで囲む必要がある。

#### DBTX インターフェース

Go の `*sql.DB` と `*sql.Tx` は共通のメソッド（`Exec`, `Query`, `QueryRow`）を持つが、
共通インターフェースが標準ライブラリに定義されていない。
そこで `DBTX` インターフェースを定義し、リポジトリが DB でも Tx でも動作できるようにする。

```go
// database/tx.go

// DBTX は *sql.DB と *sql.Tx の共通インターフェース
// リポジトリはこのインターフェースに依存することで、
// トランザクション内外どちらでも同じコードで動作する
type DBTX interface {
    Exec(query string, args ...any) (sql.Result, error)
    Query(query string, args ...any) (*sql.Rows, error)
    QueryRow(query string, args ...any) *sql.Row
}
```

#### Transactor（トランザクション実行器）

ユースケース層がトランザクションを開始・コミット・ロールバックするための仕組み。
コールバック関数にトランザクション（`DBTX`）を渡し、
関数内のすべてのDB操作を1つのトランザクションで実行する。

```go
// database/tx.go

// Transactor はトランザクションを管理する
type Transactor struct {
    db *sql.DB
}

func NewTransactor(db *sql.DB) *Transactor {
    return &Transactor{db: db}
}

// RunInTx はトランザクション内で fn を実行する
// fn がエラーを返した場合はロールバック、正常なら自動コミット
func (t *Transactor) RunInTx(fn func(tx DBTX) error) error {
    tx, err := t.db.Begin()
    if err != nil {
        return fmt.Errorf("begin transaction: %w", err)
    }

    if err := fn(tx); err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit()
}
```

#### リポジトリの変更

全リポジトリのコンストラクタを `*sql.DB` → `DBTX` に変更する。

```
変更前: func NewPostgresSessionRepository(db *sql.DB) *PostgresSessionRepository
変更後: func NewPostgresSessionRepository(db database.DBTX) *PostgresSessionRepository
```

`*sql.DB` は `DBTX` インターフェースを満たすため、
`main.go` での呼び出しは変更不要（`*sql.DB` をそのまま渡せる）。

対象リポジトリ（5つ）:
- `session.NewPostgresSessionRepository`
- `session.NewPostgresCountItemRepository`
- `session.NewPostgresProductLockRepository`
- `product.NewPostgresProductRepository`
- `product.NewPostgresSKURepository`

#### UpsertCount でのトランザクション利用

```go
func (u *Usecase) UpsertCount(sessionID, skuID int64, quantity int, userID *int64) (*CountItem, error) {
    // バリデーション・ロックチェック（従来通り）
    // ...

    var item *CountItem
    err := u.transactor.RunInTx(func(tx database.DBTX) error {
        // tx を使ったリポジトリを生成
        countItemRepo := session.NewPostgresCountItemRepository(tx)
        historyRepo := history.NewPostgresCountHistoryRepository(tx)

        // 1. 既存の数量を取得
        existing, err := countItemRepo.FindBySessionAndSKU(sessionID, skuID)
        // ...

        oldQuantity := 0
        if existing != nil {
            oldQuantity = existing.Quantity
        }

        // 2. count_items を UPSERT（従来通り）
        item = &CountItem{...}
        if err := countItemRepo.Upsert(item); err != nil {
            return err
        }

        // 3. 差分がある場合のみ履歴を記録
        change := quantity - oldQuantity
        if change != 0 {
            h := &CountHistory{
                SessionID:     sessionID,
                SKUID:         skuID,
                UserID:        userID,
                Operation:     "count",
                Change:        change,
                QuantityAfter: quantity,
            }
            return historyRepo.Create(h)
        }
        return nil
    })
    // ...
}
```

**ポイント:**
- `RunInTx` のコールバック内で tx を使ったリポジトリを生成する
- コールバックがエラーを返せば自動ロールバック
- 正常終了すれば自動コミット
- `count_items` 更新と `count_histories` 挿入が必ず同時に成功/失敗する

#### DeleteSKU でのトランザクション利用

`product.Usecase.DeleteSKU` にも同じ仕組みを適用する。

```go
func (u *Usecase) DeleteSKU(id int64) error {
    err := u.transactor.RunInTx(func(tx database.DBTX) error {
        skuRepo := product.NewPostgresSKURepository(tx)
        historyRepo := history.NewPostgresCountHistoryRepository(tx)

        // 1. 現在のセッションのカウントを取得
        // 2. カウントがあれば operation='delete' で履歴記録
        // 3. SKU を論理削除（従来通り）
    })
    return err
}
```

**注意:** `DeleteSKU` は `product` パッケージにあるが、現在のセッションの `count_items` を参照する必要がある。
`product.Usecase` に `sessionRepo`（または `countItemRepo`）を追加で注入するか、
引数で `sessionID` を受け取る設計にする。

---

## 6. フロントエンド設計

### 画面フロー（更新）

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ログイン  │────▶│  ホーム  │────▶│ 棚卸し  │
└─────────┘     └─────────┘     └─────────┘
                     │               │
                     │               ▼
                     │          ┌─────────┐
                     │          │  集計   │
                     │          └─────────┘
                     │               │
                     ▼               ▼
               ┌─────────┐     ┌─────────┐
               │商品管理  │     │CSV出力  │
               └─────────┘     └─────────┘

               ┌─────────┐
               │  履歴   │ ← 新規
               └─────────┘
```

### 履歴画面 (`/history`)

| # | 画面名 | パス | 概要 |
|---|---|---|---|
| 7 | 操作履歴 | `/history` | カウント変更履歴の閲覧・フィルタリング |

### ワイヤーフレーム

```
┌──────────────────────────────────────┐
│ 操作履歴                      [ホーム] │
├──────────────────────────────────────┤
│                                      │
│  ── フィルター ────────────────────  │
│  ┌──────────┐ ┌──────────┐           │
│  │セッション ▼│ │商品     ▼│           │
│  └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐           │
│  │ユーザー  ▼│ │操作種別  ▼│           │
│  └──────────┘ └──────────┘           │
│  ┌──────────────────────┐            │
│  │ 2026/02/10 ~ 2026/02/10│            │
│  └──────────────────────┘            │
│                                      │
│  ── 履歴一覧（新しい順）──────────  │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 07:02:55  Tシャツ ¥1,900     │    │
│  │ +3 → 10個                    │    │
│  │ セッション #11               │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ 07:02:51  Tシャツ ¥2,300     │    │
│  │ +1 → 3個                     │    │
│  │ セッション #11               │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ 07:02:42  Tシャツ ¥5,900     │    │
│  │ 🗑 削除 -7 → 0個             │    │
│  │ セッション #11               │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌────────────────────────────┐      │
│  │      もっと読み込む          │      │
│  └────────────────────────────┘      │
└──────────────────────────────────────┘
```

### フィルター仕様

| フィルター | UIコンポーネント | デフォルト値 |
|---|---|---|
| セッション | ドロップダウン | すべて |
| 商品 | ドロップダウン | すべて |
| ユーザー | ドロップダウン | すべて |
| 操作種別 | ドロップダウン（count / delete） | すべて |
| 日時範囲 | 日付ピッカー | なし（全期間） |

ソート: 新しい順（デフォルト）/ 古い順

### フロントエンドの構成

```
frontend/src/
├── pages/
│   └── HistoryPage.tsx        ← 新規
├── features/history/
│   └── hooks/
│       └── useHistory.ts      ← 新規（TanStack Query）
└── components/
    └── HistoryFilter.tsx      ← 新規（フィルターUI）
```

### ナビゲーション

ヘッダーまたはホーム画面から「操作履歴」へのリンクを追加する。

---

## 7. 既存コードへの影響範囲

### 変更が必要な既存ファイル

| ファイル | 変更内容 | リスク |
|---|---|---|
| `shared/database/` | `DBTX`インターフェース + `Transactor` を追加（新規ファイル） | なし（追加のみ） |
| `session/repository_postgres.go` | コンストラクタの引数を `*sql.DB` → `database.DBTX` に変更 | 低（インターフェース互換） |
| `product/repository_postgres.go` | 同上 | 低（同上） |
| `session/usecase.go` | `NewUsecase` に `countHistoryRepo` と `transactor` を追加、`UpsertCount` にトランザクション + 履歴記録を追加 | 中 |
| `product/usecase.go` | `DeleteSKU` に履歴記録を追加 | 中 |
| `main.go` | `Transactor` 生成、新しい Repository/Handler の初期化、ルーティング追加 | 低 |

### 影響がないもの

| 対象 | 理由 |
|---|---|
| フロントエンド既存機能 | 既存APIのリクエスト・レスポンスは変わらない |
| `count_items` テーブル | スキーマ変更なし |
| セッション管理API | 無関係 |
| ロック機能 | 無関係 |
| CSV出力 | 無関係 |

### リポジトリの `DBTX` 移行について

`*sql.DB` は `DBTX` インターフェースを満たすため、`main.go` では `*sql.DB` をそのまま渡せる。

```go
// main.go - 変更不要（*sql.DB は DBTX を満たす）
db := database.NewDB(cfg.DatabaseURL)
sessionRepo := session.NewPostgresSessionRepository(db) // db は DBTX 互換
```

つまり **リポジトリのコンストラクタ引数の型が変わるだけで、呼び出し側のコードは変更不要**。

---

## 8. 実装ステップ

| # | 作業内容 | 対象 | 備考 |
|---|---|---|---|
| 1 | `DBTX` インターフェース + `Transactor` 作成 | `shared/database/tx.go` | 新規ファイル |
| 2 | 全リポジトリを `*sql.DB` → `DBTX` に変更 | `session/`, `product/` | 型変更のみ |
| 3 | マイグレーション作成（`count_histories`テーブル） | `db/migrations/` | 000011 |
| 4 | `history` パッケージ作成（model, repository, handler） | `history/` | 新規パッケージ |
| 5 | `session.UpsertCount` にトランザクション + 履歴記録を追加 | `session/usecase.go` | 既存ロジック修正 |
| 6 | `product.DeleteSKU` に履歴記録を追加 | `product/usecase.go` | 既存ロジック修正 |
| 7 | `main.go` に Transactor・History の初期化とルーティング追加 | `main.go` | |
| 8 | `GET /api/histories` エンドポイント実装 | `history/handler.go` | |
| 9 | 履歴ページ実装（HistoryPage + フィルター） | Frontend | |
| 10 | ナビゲーションに履歴リンク追加 | Frontend | |

---

## 9. 考慮事項

### パフォーマンス

- `count_histories` は INSERT ONLY なのでロック競合のリスクが低い
- 家族4人の利用規模では、インデックスがあればクエリ性能は問題なし
- ページネーション（limit/offset）で一度に返すデータ量を制限
- トランザクションによるオーバーヘッドはこの規模では無視できる

### データ整合性

- `count_items` の更新と `count_histories` の挿入をトランザクションで囲むことで、不可分性を保証する
- `count_items` が正（Source of Truth）、`count_histories` は参考情報という位置づけは変わらない

### 将来の拡張

- `operation` の種類を増やす場合は CHECK 制約を更新するだけでOK
- ユーザー認証が実装されたら `user_id` が自動的に記録される
- `DBTX` + `Transactor` の仕組みは今後の他機能でも再利用可能
