package session

import "time"

// SessionStatus はセッションの状態を表す
type SessionStatus string

const (
	StatusInProgress SessionStatus = "in_progress"
	StatusCompleted  SessionStatus = "completed"
)

// Session は棚卸しセッションを表す
type Session struct {
	ID          int64         `json:"id"`
	Name        string        `json:"name"`
	Status      SessionStatus `json:"status"`
	StartedAt   time.Time     `json:"startedAt"`
	CompletedAt *time.Time    `json:"completedAt,omitempty"`
}

// SessionWithStats はセッションと統計情報を含む
type SessionWithStats struct {
	Session
	TotalCount  int `json:"totalCount"`  // カウント総数
	TotalAmount int `json:"totalAmount"` // 合計金額
}

// CountItem はカウント明細を表す
type CountItem struct {
	ID        int64     `json:"id"`
	SessionID int64     `json:"sessionId"`
	SKUID     int64     `json:"skuId"`
	Quantity  int       `json:"quantity"`
	UserID    *int64    `json:"userId,omitempty"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// CountItemWithSKU はカウント明細とSKU情報を含む
type CountItemWithSKU struct {
	ID          int64     `json:"id"`
	SessionID   int64     `json:"sessionId"`
	SKUID       int64     `json:"skuId"`
	ProductID   int64     `json:"productId"`
	ProductName string    `json:"productName"`
	Price       int       `json:"price"`
	Quantity    int       `json:"quantity"`
	UserID      *int64    `json:"userId,omitempty"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ProductLock は商品のロック状態を表す
type ProductLock struct {
	ID        int64     `json:"id"`
	SessionID int64     `json:"sessionId"`
	ProductID int64     `json:"productId"`
	LockedAt  time.Time `json:"lockedAt"`
}
