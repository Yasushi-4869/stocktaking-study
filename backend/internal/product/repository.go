package product

// ProductRepository は商品のデータアクセスを定義するインターフェース
type ProductRepository interface {
	FindAll() ([]*Product, error)
	FindByID(id int64) (*Product, error)
	Create(product *Product) error
	Update(product *Product) error
	Delete(id int64) error // 論理削除
}

// SKURepository はSKUのデータアクセスを定義するインターフェース
type SKURepository interface {
	FindAll() ([]*SKUDetail, error)
	FindByProductID(productID int64) ([]*SKU, error)
	FindByID(id int64) (*SKU, error)
	Create(sku *SKU) error
	Update(sku *SKU) error
	Delete(id int64) error // 論理削除
}
