package database

import (
	"errors"

	"github.com/lib/pq"
	"stocktaking-app/internal/shared/domain"
)

// PostgreSQLエラーコード
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const (
	pqUniqueViolation     = "unique_violation"
	pqForeignKeyViolation = "foreign_key_violation"
	pqNotNullViolation    = "not_null_violation"
	pqCheckViolation      = "check_violation"
)

// MapDBError はPostgreSQLのエラーをドメインエラーに変換する
//
// 変換ルール:
//   - unique_violation → ErrConflict（重複エラー）
//   - foreign_key_violation → ErrNotFound（参照先が存在しない）
//   - not_null_violation → ValidationError
//   - check_violation → ValidationError
//   - その他 → そのまま返す
func MapDBError(err error) error {
	if err == nil {
		return nil
	}

	var pqErr *pq.Error
	if !errors.As(err, &pqErr) {
		return err
	}

	switch pqErr.Code.Name() {
	case pqUniqueViolation:
		return domain.ErrConflict
	case pqForeignKeyViolation:
		return domain.ErrNotFound
	case pqNotNullViolation:
		// カラム名が取得できる場合はValidationErrorに
		if pqErr.Column != "" {
			return domain.NewValidationError(pqErr.Column, "必須項目です")
		}
		return domain.NewValidationError("unknown", "必須項目が不足しています")
	case pqCheckViolation:
		if pqErr.Constraint != "" {
			return domain.NewValidationError(pqErr.Constraint, "制約違反です")
		}
		return domain.NewValidationError("unknown", "制約違反です")
	default:
		return err
	}
}
