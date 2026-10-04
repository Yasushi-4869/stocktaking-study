package product

import (
	"fmt"

	"stocktaking-app/internal/shared/domain"
)

// Usecase は商品・SKUのビジネスロジックを提供する
type Usecase struct {
	productRepo ProductRepository
	skuRepo     SKURepository
}

// NewUsecase はUsecaseを生成する
func NewUsecase(productRepo ProductRepository, skuRepo SKURepository) *Usecase {
	return &Usecase{
		productRepo: productRepo,
		skuRepo:     skuRepo,
	}
}

// === Product ===

// GetAllProducts は全商品を取得する
func (u *Usecase) GetAllProducts() ([]*Product, error) {
	products, err := u.productRepo.FindAll()
	if err != nil {
		return nil, fmt.Errorf("GetAllProducts: %w", err)
	}
	return products, nil
}

// GetProductByID は指定IDの商品を取得する
func (u *Usecase) GetProductByID(id int64) (*Product, error) {
	product, err := u.productRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("GetProductByID: %w", err)
	}
	if product == nil {
		return nil, domain.ErrNotFound
	}
	return product, nil
}

// CreateProduct は商品を作成する
func (u *Usecase) CreateProduct(name string) (*Product, error) {
	if name == "" {
		return nil, domain.NewValidationError("name", "商品名は必須です")
	}
	product := &Product{Name: name}
	if err := u.productRepo.Create(product); err != nil {
		return nil, fmt.Errorf("CreateProduct: %w", err)
	}
	return product, nil
}

// UpdateProduct は商品を更新する
func (u *Usecase) UpdateProduct(id int64, name string) (*Product, error) {
	if name == "" {
		return nil, domain.NewValidationError("name", "商品名は必須です")
	}
	product, err := u.productRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("UpdateProduct: %w", err)
	}
	if product == nil {
		return nil, domain.ErrNotFound
	}
	product.Name = name
	if err := u.productRepo.Update(product); err != nil {
		return nil, fmt.Errorf("UpdateProduct: %w", err)
	}
	return product, nil
}

// DeleteProduct は商品を削除する（論理削除）
func (u *Usecase) DeleteProduct(id int64) error {
	product, err := u.productRepo.FindByID(id)
	if err != nil {
		return fmt.Errorf("DeleteProduct: %w", err)
	}
	if product == nil {
		return domain.ErrNotFound
	}
	if err := u.productRepo.Delete(id); err != nil {
		return fmt.Errorf("DeleteProduct: %w", err)
	}
	return nil
}

// === SKU ===

// GetAllSKUs は全SKUを取得する
func (u *Usecase) GetAllSKUs() ([]*SKUDetail, error) {
	skus, err := u.skuRepo.FindAll()
	if err != nil {
		return nil, fmt.Errorf("GetAllSKUs: %w", err)
	}
	return skus, nil
}

// GetSKUsByProductID は商品のSKU一覧を取得する
func (u *Usecase) GetSKUsByProductID(productID int64) ([]*SKU, error) {
	// 商品の存在確認
	product, err := u.productRepo.FindByID(productID)
	if err != nil {
		return nil, fmt.Errorf("GetSKUsByProductID: %w", err)
	}
	if product == nil {
		return nil, domain.ErrNotFound
	}
	skus, err := u.skuRepo.FindByProductID(productID)
	if err != nil {
		return nil, fmt.Errorf("GetSKUsByProductID: %w", err)
	}
	return skus, nil
}

// CreateSKU はSKUを作成する
func (u *Usecase) CreateSKU(productID int64, price int) (*SKU, error) {
	if price < 0 {
		return nil, domain.NewValidationError("price", "価格は0以上である必要があります")
	}
	// 商品の存在確認
	product, err := u.productRepo.FindByID(productID)
	if err != nil {
		return nil, fmt.Errorf("CreateSKU: %w", err)
	}
	if product == nil {
		return nil, domain.ErrNotFound
	}
	sku := &SKU{ProductID: productID, Price: price}
	if err := u.skuRepo.Create(sku); err != nil {
		return nil, fmt.Errorf("CreateSKU: %w", err)
	}
	return sku, nil
}

// UpdateSKU はSKUを更新する
func (u *Usecase) UpdateSKU(id int64, price int) (*SKU, error) {
	if price < 0 {
		return nil, domain.NewValidationError("price", "価格は0以上である必要があります")
	}
	sku, err := u.skuRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("UpdateSKU: %w", err)
	}
	if sku == nil {
		return nil, domain.ErrNotFound
	}
	sku.Price = price
	if err := u.skuRepo.Update(sku); err != nil {
		return nil, fmt.Errorf("UpdateSKU: %w", err)
	}
	return sku, nil
}

// DeleteSKU はSKUを削除する（論理削除）
func (u *Usecase) DeleteSKU(id int64) error {
	sku, err := u.skuRepo.FindByID(id)
	if err != nil {
		return fmt.Errorf("DeleteSKU: %w", err)
	}
	if sku == nil {
		return domain.ErrNotFound
	}
	if err := u.skuRepo.Delete(id); err != nil {
		return fmt.Errorf("DeleteSKU: %w", err)
	}
	return nil
}
