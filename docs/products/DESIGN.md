# 商品機能 設計書

## 1. 概要

商品（Product）とSKU（商品×価格）のCRUD機能を実装する。

## 2. 実装するファイル

**バーティカルスライス構成（機能単位 + レイヤー）**

```
backend/internal/
├── product/                    # 商品機能（SKU含む）
│   ├── model.go                # Product, SKU 構造体
│   ├── repository.go           # Repository interface
│   ├── repository_postgres.go  # PostgreSQL実装
│   ├── usecase.go              # ビジネスロジック
│   └── handler.go              # APIハンドラー
│
└── shared/                     # 共通コード
    ├── database/
    │   └── postgres.go         # DB接続
    ├── response/
    │   └── json.go             # 共通レスポンスヘルパー
    └── config/
        └── config.go           # 設定
```

**設計方針:**
- ProductとSKUは同じ集約（Aggregate）として扱う
- Productが集約ルート（Aggregate Root）
- SKUは常にProductを通じてアクセス

## 3. Model（エンティティ）

### Product

```go
type Product struct {
    ID        int64
    Name      string
    DeletedAt *time.Time  // NULL = 有効
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

### SKU

```go
type SKU struct {
    ID        int64
    ProductID int64
    Price     int         // 円
    DeletedAt *time.Time  // NULL = 有効
    CreatedAt time.Time
    UpdatedAt time.Time
}

// SKUDetail はVIEWから取得する詳細情報
type SKUDetail struct {
    SKUID       int64
    ProductID   int64
    ProductName string
    Price       int
    DeletedAt   *time.Time
}
```

## 4. Repository Interface

### ProductRepository

```go
type ProductRepository interface {
    FindAll() ([]*model.Product, error)
    FindByID(id int64) (*model.Product, error)
    Create(product *model.Product) error
    Update(product *model.Product) error
    Delete(id int64) error  // 論理削除
}
```

### SKURepository

```go
type SKURepository interface {
    FindAll() ([]*model.SKUDetail, error)
    FindByProductID(productID int64) ([]*model.SKU, error)
    FindByID(id int64) (*model.SKU, error)
    Create(sku *model.SKU) error
    Update(sku *model.SKU) error
    Delete(id int64) error  // 論理削除
}
```

## 5. Usecase

### ProductUsecase

```go
type ProductUsecase struct {
    productRepo repository.ProductRepository
}

func (u *ProductUsecase) GetAll() ([]*model.Product, error)
func (u *ProductUsecase) GetByID(id int64) (*model.Product, error)
func (u *ProductUsecase) Create(name string) (*model.Product, error)
func (u *ProductUsecase) Update(id int64, name string) (*model.Product, error)
func (u *ProductUsecase) Delete(id int64) error
```

### SKUUsecase

```go
type SKUUsecase struct {
    skuRepo     repository.SKURepository
    productRepo repository.ProductRepository
}

func (u *SKUUsecase) GetAll() ([]*model.SKUDetail, error)
func (u *SKUUsecase) GetByProductID(productID int64) ([]*model.SKU, error)
func (u *SKUUsecase) Create(productID int64, price int) (*model.SKU, error)
func (u *SKUUsecase) Update(id int64, price int) (*model.SKU, error)
func (u *SKUUsecase) Delete(id int64) error
```

## 6. API エンドポイント

### Product API

| メソッド | パス | 説明 | リクエスト | レスポンス |
|----------|------|------|-----------|-----------|
| GET | `/api/products` | 一覧取得 | - | `[{id, name, createdAt}]` |
| GET | `/api/products/{id}` | 詳細取得 | - | `{id, name, createdAt}` |
| POST | `/api/products` | 作成 | `{name}` | `{id, name, createdAt}` |
| PUT | `/api/products/{id}` | 更新 | `{name}` | `{id, name, updatedAt}` |
| DELETE | `/api/products/{id}` | 削除 | - | `204 No Content` |

### SKU API

| メソッド | パス | 説明 | リクエスト | レスポンス |
|----------|------|------|-----------|-----------|
| GET | `/api/skus` | 全SKU一覧 | - | `[{skuId, productId, productName, price}]` |
| GET | `/api/products/{id}/skus` | 商品のSKU一覧 | - | `[{id, price, createdAt}]` |
| POST | `/api/products/{id}/skus` | SKU作成 | `{price}` | `{id, productId, price}` |
| PUT | `/api/skus/{id}` | SKU更新 | `{price}` | `{id, price, updatedAt}` |
| DELETE | `/api/skus/{id}` | SKU削除 | - | `204 No Content` |

## 7. レスポンス形式

### 成功時

```json
// 単一オブジェクト
{
  "id": 1,
  "name": "靴",
  "createdAt": "2024-01-15T10:00:00Z"
}

// 配列
[
  {"id": 1, "name": "靴"},
  {"id": 2, "name": "財布"}
]
```

### エラー時

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "商品が見つかりません"
  }
}
```

## 8. 実装順序

1. [ ] Model（product.go, sku.go）
2. [ ] Repository Interface
3. [ ] Repository 実装（PostgreSQL）
4. [ ] Usecase
5. [ ] Handler
6. [ ] main.go に組み込み
7. [ ] 動作確認

## 9. 補足

### 認証について

今回は **認証なし** で実装する（後で追加）。
先に動くものを作ることを優先。

### バリデーション

- 商品名: 必須、空文字不可
- 価格: 必須、0以上の整数
