package session

import (
	"fmt"

	"stocktaking-app/internal/shared/domain"
)

// Usecase はセッション・カウントのビジネスロジックを提供する
type Usecase struct {
	sessionRepo     SessionRepository
	countItemRepo   CountItemRepository
	productLockRepo ProductLockRepository
}

// NewUsecase はUsecaseを生成する
func NewUsecase(sessionRepo SessionRepository, countItemRepo CountItemRepository, productLockRepo ProductLockRepository) *Usecase {
	return &Usecase{
		sessionRepo:     sessionRepo,
		countItemRepo:   countItemRepo,
		productLockRepo: productLockRepo,
	}
}

// GetAllSessionsWithStats は全セッションを統計情報付きで取得する
func (u *Usecase) GetAllSessionsWithStats() ([]*SessionWithStats, error) {
	sessions, err := u.sessionRepo.FindAll()
	if err != nil {
		return nil, fmt.Errorf("GetAllSessionsWithStats: %w", err)
	}

	result := make([]*SessionWithStats, 0, len(sessions))
	for _, s := range sessions {
		counts, err := u.countItemRepo.FindBySessionID(s.ID)
		if err != nil {
			return nil, fmt.Errorf("GetAllSessionsWithStats: %w", err)
		}

		totalCount := 0
		totalAmount := 0
		for _, c := range counts {
			totalCount += c.Quantity
			totalAmount += c.Price * c.Quantity
		}

		result = append(result, &SessionWithStats{
			Session:     *s,
			TotalCount:  totalCount,
			TotalAmount: totalAmount,
		})
	}

	return result, nil
}

// GetCurrentSession は現在の進行中セッションを統計情報付きで取得する
// 進行中セッションがなければ nil を返す
func (u *Usecase) GetCurrentSession() (*SessionWithStats, error) {
	session, err := u.sessionRepo.FindCurrent()
	if err != nil {
		return nil, fmt.Errorf("GetCurrentSession: %w", err)
	}

	if session == nil {
		return nil, nil
	}

	// 統計情報を計算
	counts, err := u.countItemRepo.FindBySessionID(session.ID)
	if err != nil {
		return nil, fmt.Errorf("GetCurrentSession: %w", err)
	}

	totalCount := 0
	totalAmount := 0
	for _, c := range counts {
		totalCount += c.Quantity
		totalAmount += c.Price * c.Quantity
	}

	return &SessionWithStats{
		Session:     *session,
		TotalCount:  totalCount,
		TotalAmount: totalAmount,
	}, nil
}

// CreateSession は新しいセッションを作成する
func (u *Usecase) CreateSession() (*Session, error) {
	session := &Session{}
	if err := u.sessionRepo.Create(session); err != nil {
		return nil, fmt.Errorf("CreateSession: %w", err)
	}
	return session, nil
}

// GetSessionByID は指定IDのセッションを統計情報付きで取得する
func (u *Usecase) GetSessionByID(id int64) (*SessionWithStats, error) {
	session, err := u.sessionRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("GetSessionByID: %w", err)
	}
	if session == nil {
		return nil, domain.ErrNotFound
	}

	counts, err := u.countItemRepo.FindBySessionID(id)
	if err != nil {
		return nil, fmt.Errorf("GetSessionByID: %w", err)
	}

	totalCount := 0
	totalAmount := 0
	for _, c := range counts {
		totalCount += c.Quantity
		totalAmount += c.Price * c.Quantity
	}

	return &SessionWithStats{
		Session:     *session,
		TotalCount:  totalCount,
		TotalAmount: totalAmount,
	}, nil
}

// CompleteSession はセッションを完了する
func (u *Usecase) CompleteSession(id int64) (*Session, error) {
	session, err := u.sessionRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("CompleteSession: %w", err)
	}
	if session == nil {
		return nil, domain.ErrNotFound
	}

	if err := u.sessionRepo.Complete(id); err != nil {
		return nil, fmt.Errorf("CompleteSession: %w", err)
	}

	// 更新後のセッションを返す
	updated, err := u.sessionRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("CompleteSession: %w", err)
	}
	return updated, nil
}

// GetCountsBySessionID はセッションの全カウントを取得する
func (u *Usecase) GetCountsBySessionID(sessionID int64) ([]*CountItemWithSKU, error) {
	// セッションの存在確認
	session, err := u.sessionRepo.FindByID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("GetCountsBySessionID: %w", err)
	}
	if session == nil {
		return nil, domain.ErrNotFound
	}

	counts, err := u.countItemRepo.FindBySessionID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("GetCountsBySessionID: %w", err)
	}
	return counts, nil
}

// UpsertCount はカウントを作成または更新する
func (u *Usecase) UpsertCount(sessionID, skuID int64, quantity int, userID *int64) (*CountItem, error) {
	if quantity < 0 {
		return nil, domain.NewValidationError("quantity", "数量は0以上である必要があります")
	}

	// セッションの存在確認
	session, err := u.sessionRepo.FindByID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("UpsertCount: %w", err)
	}
	if session == nil {
		return nil, domain.ErrNotFound
	}

	// ロック状態の確認
	locked, err := u.productLockRepo.IsLockedBySKU(sessionID, skuID)
	if err != nil {
		return nil, fmt.Errorf("UpsertCount: %w", err)
	}
	if locked {
		return nil, domain.ErrForbidden
	}

	item := &CountItem{
		SessionID: sessionID,
		SKUID:     skuID,
		Quantity:  quantity,
		UserID:    userID,
	}

	if err := u.countItemRepo.Upsert(item); err != nil {
		return nil, fmt.Errorf("UpsertCount: %w", err)
	}
	return item, nil
}

// GetLocksBySessionID はセッションの全ロックを取得する
func (u *Usecase) GetLocksBySessionID(sessionID int64) ([]*ProductLock, error) {
	// セッションの存在確認
	session, err := u.sessionRepo.FindByID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("GetLocksBySessionID: %w", err)
	}
	if session == nil {
		return nil, domain.ErrNotFound
	}

	return u.productLockRepo.FindBySessionID(sessionID)
}

// LockProduct は商品をロックする
func (u *Usecase) LockProduct(sessionID, productID int64) (*ProductLock, error) {
	// セッションの存在確認
	session, err := u.sessionRepo.FindByID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("LockProduct: %w", err)
	}
	if session == nil {
		return nil, domain.ErrNotFound
	}

	// 既にロックされているか確認
	existing, err := u.productLockRepo.FindBySessionAndProduct(sessionID, productID)
	if err != nil {
		return nil, fmt.Errorf("LockProduct: %w", err)
	}
	if existing != nil {
		return nil, domain.ErrConflict
	}

	lock := &ProductLock{
		SessionID: sessionID,
		ProductID: productID,
	}

	if err := u.productLockRepo.Create(lock); err != nil {
		return nil, fmt.Errorf("LockProduct: %w", err)
	}
	return lock, nil
}

// UnlockProduct は商品のロックを解除する
func (u *Usecase) UnlockProduct(sessionID, productID int64) error {
	// セッションの存在確認
	session, err := u.sessionRepo.FindByID(sessionID)
	if err != nil {
		return fmt.Errorf("UnlockProduct: %w", err)
	}
	if session == nil {
		return domain.ErrNotFound
	}

	return u.productLockRepo.Delete(sessionID, productID)
}
