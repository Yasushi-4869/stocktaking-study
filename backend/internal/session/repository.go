package session

// SessionRepository はセッションのデータアクセスを定義するインターフェース
type SessionRepository interface {
	FindAll() ([]*Session, error)
	FindByID(id int64) (*Session, error)
	FindCurrent() (*Session, error) // status = 'in_progress' のセッションを返す
	Create(session *Session) error
	Complete(id int64) error // status を 'completed' に変更
}

// CountItemRepository はカウント明細のデータアクセスを定義するインターフェース
type CountItemRepository interface {
	FindBySessionID(sessionID int64) ([]*CountItemWithSKU, error)
	FindBySessionAndSKU(sessionID, skuID int64) (*CountItem, error)
	Upsert(item *CountItem) error // 存在すれば更新、なければ作成
}

// ProductLockRepository は商品ロックのデータアクセスを定義するインターフェース
type ProductLockRepository interface {
	FindBySessionID(sessionID int64) ([]*ProductLock, error)
	FindBySessionAndProduct(sessionID, productID int64) (*ProductLock, error)
	IsLockedBySKU(sessionID, skuID int64) (bool, error) // SKU経由で商品のロック状態を確認
	Create(lock *ProductLock) error
	Delete(sessionID, productID int64) error
}
