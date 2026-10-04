package product

import (
	"database/sql"
	"fmt"
	"time"

	"stocktaking-app/internal/shared/database"
)

// PostgresProductRepository はProductRepositoryのPostgreSQL実装
type PostgresProductRepository struct {
	db *sql.DB
}

// NewPostgresProductRepository はPostgresProductRepositoryを生成する
func NewPostgresProductRepository(db *sql.DB) *PostgresProductRepository {
	return &PostgresProductRepository{db: db}
}

func (r *PostgresProductRepository) FindAll() ([]*Product, error) {
	query := `
		SELECT id, name, created_at, updated_at
		FROM products
		WHERE deleted_at IS NULL
		ORDER BY id
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("ProductRepository.FindAll: %w", database.MapDBError(err))
	}
	defer rows.Close()

	var products []*Product
	for rows.Next() {
		p := &Product{}
		if err := rows.Scan(&p.ID, &p.Name, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("ProductRepository.FindAll scan: %w", err)
		}
		products = append(products, p)
	}
	return products, nil
}

func (r *PostgresProductRepository) FindByID(id int64) (*Product, error) {
	query := `
		SELECT id, name, created_at, updated_at
		FROM products
		WHERE id = $1 AND deleted_at IS NULL
	`
	p := &Product{}
	err := r.db.QueryRow(query, id).Scan(&p.ID, &p.Name, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("ProductRepository.FindByID: %w", database.MapDBError(err))
	}
	return p, nil
}

func (r *PostgresProductRepository) Create(product *Product) error {
	query := `
		INSERT INTO products (name, created_at, updated_at)
		VALUES ($1, $2, $3)
		RETURNING id
	`
	now := time.Now()
	product.CreatedAt = now
	product.UpdatedAt = now
	err := r.db.QueryRow(query, product.Name, product.CreatedAt, product.UpdatedAt).Scan(&product.ID)
	if err != nil {
		return fmt.Errorf("ProductRepository.Create: %w", database.MapDBError(err))
	}
	return nil
}

func (r *PostgresProductRepository) Update(product *Product) error {
	query := `
		UPDATE products
		SET name = $1, updated_at = $2
		WHERE id = $3 AND deleted_at IS NULL
	`
	product.UpdatedAt = time.Now()
	_, err := r.db.Exec(query, product.Name, product.UpdatedAt, product.ID)
	if err != nil {
		return fmt.Errorf("ProductRepository.Update: %w", database.MapDBError(err))
	}
	return nil
}

func (r *PostgresProductRepository) Delete(id int64) error {
	query := `
		UPDATE products
		SET deleted_at = $1
		WHERE id = $2 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("ProductRepository.Delete: %w", database.MapDBError(err))
	}
	return nil
}

// PostgresSKURepository はSKURepositoryのPostgreSQL実装
type PostgresSKURepository struct {
	db *sql.DB
}

// NewPostgresSKURepository はPostgresSKURepositoryを生成する
func NewPostgresSKURepository(db *sql.DB) *PostgresSKURepository {
	return &PostgresSKURepository{db: db}
}

func (r *PostgresSKURepository) FindAll() ([]*SKUDetail, error) {
	query := `
		SELECT sku_id, product_id, product_name, price
		FROM sku_details
		WHERE deleted_at IS NULL
		ORDER BY product_id, price
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("SKURepository.FindAll: %w", database.MapDBError(err))
	}
	defer rows.Close()

	var skus []*SKUDetail
	for rows.Next() {
		s := &SKUDetail{}
		if err := rows.Scan(&s.SKUID, &s.ProductID, &s.ProductName, &s.Price); err != nil {
			return nil, fmt.Errorf("SKURepository.FindAll scan: %w", err)
		}
		skus = append(skus, s)
	}
	return skus, nil
}

func (r *PostgresSKURepository) FindByProductID(productID int64) ([]*SKU, error) {
	query := `
		SELECT id, product_id, price, created_at, updated_at
		FROM skus
		WHERE product_id = $1 AND deleted_at IS NULL
		ORDER BY price
	`
	rows, err := r.db.Query(query, productID)
	if err != nil {
		return nil, fmt.Errorf("SKURepository.FindByProductID: %w", database.MapDBError(err))
	}
	defer rows.Close()

	var skus []*SKU
	for rows.Next() {
		s := &SKU{}
		if err := rows.Scan(&s.ID, &s.ProductID, &s.Price, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("SKURepository.FindByProductID scan: %w", err)
		}
		skus = append(skus, s)
	}
	return skus, nil
}

func (r *PostgresSKURepository) FindByID(id int64) (*SKU, error) {
	query := `
		SELECT id, product_id, price, created_at, updated_at
		FROM skus
		WHERE id = $1 AND deleted_at IS NULL
	`
	s := &SKU{}
	err := r.db.QueryRow(query, id).Scan(&s.ID, &s.ProductID, &s.Price, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("SKURepository.FindByID: %w", database.MapDBError(err))
	}
	return s, nil
}

func (r *PostgresSKURepository) Create(sku *SKU) error {
	query := `
		INSERT INTO skus (product_id, price, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	now := time.Now()
	sku.CreatedAt = now
	sku.UpdatedAt = now
	err := r.db.QueryRow(query, sku.ProductID, sku.Price, sku.CreatedAt, sku.UpdatedAt).Scan(&sku.ID)
	if err != nil {
		return fmt.Errorf("SKURepository.Create: %w", database.MapDBError(err))
	}
	return nil
}

func (r *PostgresSKURepository) Update(sku *SKU) error {
	query := `
		UPDATE skus
		SET price = $1, updated_at = $2
		WHERE id = $3 AND deleted_at IS NULL
	`
	sku.UpdatedAt = time.Now()
	_, err := r.db.Exec(query, sku.Price, sku.UpdatedAt, sku.ID)
	if err != nil {
		return fmt.Errorf("SKURepository.Update: %w", database.MapDBError(err))
	}
	return nil
}

func (r *PostgresSKURepository) Delete(id int64) error {
	query := `
		UPDATE skus
		SET deleted_at = $1
		WHERE id = $2 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("SKURepository.Delete: %w", database.MapDBError(err))
	}
	return nil
}
