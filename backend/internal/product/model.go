package product

import "time"

// Product は商品を表す
type Product struct {
	ID        int64      `json:"id"`
	Name      string     `json:"name"`
	DeletedAt *time.Time `json:"-"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// SKU は商品の価格バリエーションを表す
type SKU struct {
	ID        int64      `json:"id"`
	ProductID int64      `json:"productId"`
	Price     int        `json:"price"`
	DeletedAt *time.Time `json:"-"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// SKUDetail はSKUと商品名を含む詳細情報（VIEW用）
type SKUDetail struct {
	SKUID       int64      `json:"skuId"`
	ProductID   int64      `json:"productId"`
	ProductName string     `json:"productName"`
	Price       int        `json:"price"`
	DeletedAt   *time.Time `json:"-"`
}
