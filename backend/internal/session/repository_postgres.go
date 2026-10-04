package session

import (
	"database/sql"
	"fmt"
	"time"

	"stocktaking-app/internal/shared/database"
)

// PostgresSessionRepository はSessionRepositoryのPostgreSQL実装
type PostgresSessionRepository struct {
	db *sql.DB
}

// NewPostgresSessionRepository はPostgresSessionRepositoryを生成する
func NewPostgresSessionRepository(db *sql.DB) *PostgresSessionRepository {
	return &PostgresSessionRepository{db: db}
}

func (r *PostgresSessionRepository) FindAll() ([]*Session, error) {
	query := `
		SELECT id, name, status, started_at, completed_at
		FROM sessions
		ORDER BY id DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("SessionRepository.FindAll: %w", database.MapDBError(err))
	}
	defer rows.Close()

	var sessions []*Session
	for rows.Next() {
		s := &Session{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Status, &s.StartedAt, &s.CompletedAt); err != nil {
			return nil, fmt.Errorf("SessionRepository.FindAll scan: %w", err)
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (r *PostgresSessionRepository) FindByID(id int64) (*Session, error) {
	query := `
		SELECT id, name, status, started_at, completed_at
		FROM sessions
		WHERE id = $1
	`
	s := &Session{}
	err := r.db.QueryRow(query, id).Scan(
		&s.ID, &s.Name, &s.Status, &s.StartedAt, &s.CompletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("SessionRepository.FindByID: %w", database.MapDBError(err))
	}
	return s, nil
}

func (r *PostgresSessionRepository) FindCurrent() (*Session, error) {
	query := `
		SELECT id, name, status, started_at, completed_at
		FROM sessions
		WHERE status = 'in_progress'
		ORDER BY id DESC
		LIMIT 1
	`
	s := &Session{}
	err := r.db.QueryRow(query).Scan(
		&s.ID, &s.Name, &s.Status, &s.StartedAt, &s.CompletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("SessionRepository.FindCurrent: %w", database.MapDBError(err))
	}
	return s, nil
}

func (r *PostgresSessionRepository) Create(session *Session) error {
	query := `
		INSERT INTO sessions (name, status, started_at)
		VALUES ($1, $2, $3)
		RETURNING id
	`
	now := time.Now()
	session.Status = StatusInProgress
	session.StartedAt = now
	// 自動生成の名前（日時ベース）
	session.Name = now.Format("2006-01-02 15:04")
	err := r.db.QueryRow(query, session.Name, session.Status, session.StartedAt).Scan(&session.ID)
	if err != nil {
		return fmt.Errorf("SessionRepository.Create: %w", database.MapDBError(err))
	}
	return nil
}

func (r *PostgresSessionRepository) Complete(id int64) error {
	query := `
		UPDATE sessions
		SET status = 'completed', completed_at = $1
		WHERE id = $2 AND status = 'in_progress'
	`
	now := time.Now()
	_, err := r.db.Exec(query, now, id)
	if err != nil {
		return fmt.Errorf("SessionRepository.Complete: %w", database.MapDBError(err))
	}
	return nil
}

// PostgresCountItemRepository はCountItemRepositoryのPostgreSQL実装
type PostgresCountItemRepository struct {
	db *sql.DB
}

// NewPostgresCountItemRepository はPostgresCountItemRepositoryを生成する
func NewPostgresCountItemRepository(db *sql.DB) *PostgresCountItemRepository {
	return &PostgresCountItemRepository{db: db}
}

func (r *PostgresCountItemRepository) FindBySessionID(sessionID int64) ([]*CountItemWithSKU, error) {
	query := `
		SELECT
			ci.id, ci.session_id, ci.sku_id,
			s.product_id, p.name as product_name, s.price,
			ci.quantity, ci.user_id, ci.updated_at
		FROM count_items ci
		JOIN skus s ON s.id = ci.sku_id
		JOIN products p ON p.id = s.product_id
		WHERE ci.session_id = $1
		ORDER BY p.id, s.price
	`
	rows, err := r.db.Query(query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("CountItemRepository.FindBySessionID: %w", database.MapDBError(err))
	}
	defer rows.Close()

	var items []*CountItemWithSKU
	for rows.Next() {
		item := &CountItemWithSKU{}
		if err := rows.Scan(
			&item.ID, &item.SessionID, &item.SKUID,
			&item.ProductID, &item.ProductName, &item.Price,
			&item.Quantity, &item.UserID, &item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("CountItemRepository.FindBySessionID scan: %w", err)
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *PostgresCountItemRepository) FindBySessionAndSKU(sessionID, skuID int64) (*CountItem, error) {
	query := `
		SELECT id, session_id, sku_id, quantity, user_id, updated_at
		FROM count_items
		WHERE session_id = $1 AND sku_id = $2
	`
	item := &CountItem{}
	err := r.db.QueryRow(query, sessionID, skuID).Scan(
		&item.ID, &item.SessionID, &item.SKUID,
		&item.Quantity, &item.UserID, &item.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("CountItemRepository.FindBySessionAndSKU: %w", database.MapDBError(err))
	}
	return item, nil
}

func (r *PostgresCountItemRepository) Upsert(item *CountItem) error {
	// PostgreSQLのON CONFLICT（UPSERT）を使用
	query := `
		INSERT INTO count_items (session_id, sku_id, quantity, user_id, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (session_id, sku_id)
		DO UPDATE SET quantity = $3, user_id = $4, updated_at = $5
		RETURNING id
	`
	now := time.Now()
	item.UpdatedAt = now
	err := r.db.QueryRow(query,
		item.SessionID, item.SKUID, item.Quantity, item.UserID,
		item.UpdatedAt,
	).Scan(&item.ID)
	if err != nil {
		return fmt.Errorf("CountItemRepository.Upsert: %w", database.MapDBError(err))
	}
	return nil
}

// PostgresProductLockRepository はProductLockRepositoryのPostgreSQL実装
type PostgresProductLockRepository struct {
	db *sql.DB
}

// NewPostgresProductLockRepository はPostgresProductLockRepositoryを生成する
func NewPostgresProductLockRepository(db *sql.DB) *PostgresProductLockRepository {
	return &PostgresProductLockRepository{db: db}
}

func (r *PostgresProductLockRepository) FindBySessionID(sessionID int64) ([]*ProductLock, error) {
	query := `
		SELECT id, session_id, product_id, locked_at
		FROM product_locks
		WHERE session_id = $1
		ORDER BY locked_at DESC
	`
	rows, err := r.db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var locks []*ProductLock
	for rows.Next() {
		lock := &ProductLock{}
		if err := rows.Scan(&lock.ID, &lock.SessionID, &lock.ProductID, &lock.LockedAt); err != nil {
			return nil, err
		}
		locks = append(locks, lock)
	}
	return locks, nil
}

func (r *PostgresProductLockRepository) FindBySessionAndProduct(sessionID, productID int64) (*ProductLock, error) {
	query := `
		SELECT id, session_id, product_id, locked_at
		FROM product_locks
		WHERE session_id = $1 AND product_id = $2
	`
	lock := &ProductLock{}
	err := r.db.QueryRow(query, sessionID, productID).Scan(
		&lock.ID, &lock.SessionID, &lock.ProductID, &lock.LockedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return lock, nil
}

func (r *PostgresProductLockRepository) IsLockedBySKU(sessionID, skuID int64) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM product_locks pl
			JOIN skus s ON s.product_id = pl.product_id
			WHERE pl.session_id = $1 AND s.id = $2
		)
	`
	var exists bool
	err := r.db.QueryRow(query, sessionID, skuID).Scan(&exists)
	return exists, err
}

func (r *PostgresProductLockRepository) Create(lock *ProductLock) error {
	query := `
		INSERT INTO product_locks (session_id, product_id, locked_at)
		VALUES ($1, $2, $3)
		RETURNING id
	`
	now := time.Now()
	lock.LockedAt = now
	return r.db.QueryRow(query, lock.SessionID, lock.ProductID, lock.LockedAt).Scan(&lock.ID)
}

func (r *PostgresProductLockRepository) Delete(sessionID, productID int64) error {
	query := `
		DELETE FROM product_locks
		WHERE session_id = $1 AND product_id = $2
	`
	_, err := r.db.Exec(query, sessionID, productID)
	return err
}
