package domain

import (
	"errors"
	"fmt"
	"strings"
)

// Sentinel Errors - アプリケーション共通のエラー
var (
	// ErrNotFound はリソースが見つからない場合のエラー
	ErrNotFound = errors.New("resource not found")

	// ErrConflict はリソースが競合している場合のエラー（重複など）
	ErrConflict = errors.New("resource conflict")

	// ErrInternal はシステム内部エラー
	ErrInternal = errors.New("internal system error")

	// ErrForbidden は操作が禁止されている場合のエラー（ロック中の操作など）
	ErrForbidden = errors.New("operation forbidden")
)

// ValidationError はバリデーションエラーの1項目
type ValidationError struct {
	Field  string `json:"field"`
	Reason string `json:"reason"`
}

// Error はerrorインターフェースを実装
func (v ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", v.Field, v.Reason)
}

// ValidationErrors は複数のバリデーションエラー
type ValidationErrors []ValidationError

// Error はerrorインターフェースを実装
func (ve ValidationErrors) Error() string {
	if len(ve) == 0 {
		return "validation failed"
	}
	if len(ve) == 1 {
		return ve[0].Error()
	}

	var msgs []string
	for _, v := range ve {
		msgs = append(msgs, v.Error())
	}
	return strings.Join(msgs, "; ")
}

// NewValidationError は単一のバリデーションエラーを作成
func NewValidationError(field, reason string) error {
	return ValidationErrors{{Field: field, Reason: reason}}
}

// IsValidationError はエラーがバリデーションエラーかどうかを判定
func IsValidationError(err error) bool {
	var ve ValidationErrors
	return errors.As(err, &ve)
}

// AsValidationErrors はエラーをValidationErrorsに変換
func AsValidationErrors(err error) (ValidationErrors, bool) {
	var ve ValidationErrors
	if errors.As(err, &ve) {
		return ve, true
	}
	return nil, false
}
