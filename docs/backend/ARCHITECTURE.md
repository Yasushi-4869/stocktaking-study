# バックエンドアーキテクチャ設計

## 1. アーキテクチャパターン

**レイヤードアーキテクチャ + 依存性逆転の原則（クリーンアーキテクチャ風）**

### 依存方向

```
┌─────────────────────────────────────────────────────┐
│                      handler                        │
│                 (フレームワーク層)                     │
│            HTTPリクエスト/レスポンス処理                │
└───────────────────────┬─────────────────────────────┘
                        │ 依存
                        ▼
┌─────────────────────────────────────────────────────┐
│                      usecase                        │
│                 (ユースケース層)                      │
│               ビジネスロジック                         │
│                                                     │
│   ※ repository の「インターフェース」に依存              │
└───────────────────────┬─────────────────────────────┘
                        │ インターフェースに依存
                        ▼
┌─────────────────────────────────────────────────────┐
│                      domain                         │
│                 (ドメイン層: 中心)                    │
│         model（エンティティ）                          │
│         repository（インターフェース定義）              │
└─────────────────────────────────────────────────────┘
                        ▲
                        │ 実装
┌───────────────────────┴─────────────────────────────┐
│                      infra                          │
│                 (インフラ層)                         │
│         postgres（リポジトリ実装）                   │
│         middleware（認証など）                       │
└─────────────────────────────────────────────────────┘
```

### 各層の責務

| 層 | パッケージ | 責務 |
|----|-----------|------|
| フレームワーク | `handler` | HTTPの入出力、リクエストのパース・バリデーション、JSONレスポンス |
| ユースケース | `usecase` | ビジネスロジック、トランザクション管理 |
| ドメイン | `domain/model` | エンティティ（データ構造） |
| ドメイン | `domain/repository` | リポジトリのインターフェース定義 |
| インフラ | `infra/postgres` | PostgreSQLを使ったリポジトリ実装 |
| インフラ | `infra/middleware` | 認証ミドルウェアなど |

---

## 2. ディレクトリ構成

```
backend/
├── main.go                     # エントリーポイント、DI、サーバー起動
├── go.mod
├── go.sum
│
├── internal/
│   ├── domain/                 # ドメイン層（中心）
│   │   ├── model/              # エンティティ
│   │   │   ├── product.go      # Product構造体
│   │   │   ├── sku.go          # SKU構造体
│   │   │   ├── session.go      # Session構造体
│   │   │   ├── count_item.go   # CountItem構造体
│   │   │   └── user.go         # User構造体
│   │   │
│   │   └── repository/         # リポジトリインターフェース
│   │       ├── product.go      # ProductRepository interface
│   │       ├── sku.go          # SKURepository interface
│   │       ├── session.go      # SessionRepository interface
│   │       ├── count_item.go   # CountItemRepository interface
│   │       └── user.go         # UserRepository interface
│   │
│   ├── usecase/                # ユースケース層
│   │   ├── auth.go             # 認証ユースケース
│   │   ├── product.go          # 商品ユースケース
│   │   ├── sku.go              # SKUユースケース
│   │   ├── session.go          # セッションユースケース
│   │   ├── count.go            # カウントユースケース
│   │   └── export.go           # CSV出力ユースケース
│   │
│   ├── handler/                # ハンドラー層
│   │   ├── router.go           # ルーティング設定
│   │   ├── auth.go             # 認証API
│   │   ├── product.go          # 商品API
│   │   ├── sku.go              # SKU API
│   │   ├── session.go          # セッションAPI
│   │   ├── count.go            # カウントAPI
│   │   ├── user.go             # ユーザーAPI
│   │   └── response.go         # 共通レスポンスヘルパー
│   │
│   ├── infra/                  # インフラ層
│   │   ├── postgres/           # PostgreSQL実装
│   │   │   ├── db.go           # DB接続
│   │   │   ├── product.go      # ProductRepository実装
│   │   │   ├── sku.go          # SKURepository実装
│   │   │   ├── session.go      # SessionRepository実装
│   │   │   ├── count_item.go   # CountItemRepository実装
│   │   │   └── user.go         # UserRepository実装
│   │   │
│   │   └── middleware/
│   │       └── auth.go         # JWT認証ミドルウェア
│   │
│   └── config/                 # 設定
│       └── config.go           # 環境変数読み込み
│
├── db/
│   └── migrations/             # マイグレーション
│       ├── 000001_create_users.up.sql
│       ├── 000001_create_users.down.sql
│       ├── 000002_create_products.up.sql
│       └── ...
│
└── Dockerfile
```

---

## 3. 依存性注入（DI）

`main.go` で各層のインスタンスを生成し、依存を注入する。

```go
func main() {
    // 設定読み込み
    cfg := config.Load()

    // DB接続
    db := postgres.NewDB(cfg.DatabaseURL)

    // Repository（インフラ層）
    userRepo := postgres.NewUserRepository(db)
    productRepo := postgres.NewProductRepository(db)
    skuRepo := postgres.NewSKURepository(db)
    sessionRepo := postgres.NewSessionRepository(db)
    countItemRepo := postgres.NewCountItemRepository(db)

    // Usecase（ユースケース層）
    authUsecase := usecase.NewAuthUsecase(userRepo, cfg.JWTSecret)
    productUsecase := usecase.NewProductUsecase(productRepo)
    skuUsecase := usecase.NewSKUUsecase(skuRepo, productRepo)
    sessionUsecase := usecase.NewSessionUsecase(sessionRepo, skuRepo, countItemRepo)
    countUsecase := usecase.NewCountUsecase(countItemRepo)

    // Handler（ハンドラー層）
    authHandler := handler.NewAuthHandler(authUsecase)
    productHandler := handler.NewProductHandler(productUsecase)
    // ...

    // Router設定 & サーバー起動
    router := handler.NewRouter(authHandler, productHandler, ...)
    http.ListenAndServe(":8080", router)
}
```

---

## 4. 使用ライブラリ

| 用途 | ライブラリ | 理由 |
|------|-----------|------|
| ルーティング | 標準 `net/http` | Go 1.22以降でパスパラメータ対応、外部依存ゼロ |
| DB接続 | `database/sql` + `lib/pq` | 標準的 |
| マイグレーション | `golang-migrate` | 定番ツール |
| JWT | `golang-jwt/jwt/v5` | 定番 |
| 環境変数 | `os.Getenv` or `godotenv` | シンプル |

### ルーティング例（Go 1.22+）

```go
mux := http.NewServeMux()

// メソッド + パス でルーティング
mux.HandleFunc("GET /api/products", listProducts)
mux.HandleFunc("POST /api/products", createProduct)
mux.HandleFunc("GET /api/products/{id}", getProduct)
mux.HandleFunc("PUT /api/products/{id}", updateProduct)
mux.HandleFunc("DELETE /api/products/{id}", deleteProduct)

// パスパラメータの取得
func getProduct(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    // ...
}
```

---

## 5. エラーハンドリング方針

### カスタムエラー型

```go
// internal/domain/error.go
type AppError struct {
    Code    string // "NOT_FOUND", "VALIDATION_ERROR" など
    Message string
    Err     error  // 元のエラー（ラップ用）
}

func (e *AppError) Error() string {
    return e.Message
}
```

### HTTPステータスコードとの対応

| エラーコード | HTTPステータス |
|-------------|---------------|
| NOT_FOUND | 404 |
| VALIDATION_ERROR | 400 |
| UNAUTHORIZED | 401 |
| CONFLICT | 409 |
| INTERNAL_ERROR | 500 |

---

## 6. 実装順序

1. **基盤構築**
   - [ ] go.mod 初期化
   - [ ] ディレクトリ構成作成
   - [ ] DB接続（infra/postgres/db.go）
   - [ ] マイグレーション設定

2. **認証機能**
   - [ ] User model & repository
   - [ ] Auth usecase（PIN検証、JWT発行）
   - [ ] Auth handler & middleware

3. **商品管理機能**
   - [ ] Product, SKU model & repository
   - [ ] Product, SKU usecase
   - [ ] Product, SKU handler

4. **棚卸し機能**
   - [ ] Session, CountItem model & repository
   - [ ] Session, Count usecase
   - [ ] Session, Count handler

5. **エクスポート機能**
   - [ ] Export usecase（CSV生成）
   - [ ] Export handler
