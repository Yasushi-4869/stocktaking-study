package httputil

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"stocktaking-app/internal/shared/domain"
)

// ErrorResponse はエラーレスポンスの形式
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail はエラーの詳細
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ValidationErrorResponse はバリデーションエラーレスポンスの形式
type ValidationErrorResponse struct {
	Error            ErrorDetail              `json:"error"`
	ValidationErrors []domain.ValidationError `json:"validationErrors,omitempty"`
}

// RespondError はエラーに応じた適切なHTTPレスポンスを返す
//
// エラーの種類に応じたHTTPステータスコード:
//   - ValidationErrors → 400 Bad Request
//   - ErrNotFound → 404 Not Found
//   - ErrConflict → 409 Conflict
//   - ErrForbidden → 403 Forbidden
//   - その他 → 500 Internal Server Error（ログ出力あり）
func RespondError(w http.ResponseWriter, r *http.Request, err error, logger *slog.Logger) {
	// ValidationErrors
	if ve, ok := domain.AsValidationErrors(err); ok {
		respondValidationError(w, ve)
		return
	}

	// ErrNotFound
	if errors.Is(err, domain.ErrNotFound) {
		respondJSON(w, http.StatusNotFound, ErrorResponse{
			Error: ErrorDetail{
				Code:    "NOT_FOUND",
				Message: "リソースが見つかりません",
			},
		})
		return
	}

	// ErrConflict
	if errors.Is(err, domain.ErrConflict) {
		respondJSON(w, http.StatusConflict, ErrorResponse{
			Error: ErrorDetail{
				Code:    "CONFLICT",
				Message: "リソースが競合しています",
			},
		})
		return
	}

	// ErrForbidden
	if errors.Is(err, domain.ErrForbidden) {
		respondJSON(w, http.StatusForbidden, ErrorResponse{
			Error: ErrorDetail{
				Code:    "FORBIDDEN",
				Message: "この操作は許可されていません",
			},
		})
		return
	}

	// その他のエラー → 500
	// 内部エラーはログに出力（デバッグ用）
	if logger != nil {
		logger.Error("internal server error",
			"error", err.Error(),
			"method", r.Method,
			"path", r.URL.Path,
		)
	}

	respondJSON(w, http.StatusInternalServerError, ErrorResponse{
		Error: ErrorDetail{
			Code:    "INTERNAL_ERROR",
			Message: "サーバーエラーが発生しました",
		},
	})
}

// respondValidationError はバリデーションエラーのレスポンスを返す
func respondValidationError(w http.ResponseWriter, ve domain.ValidationErrors) {
	respondJSON(w, http.StatusBadRequest, ValidationErrorResponse{
		Error: ErrorDetail{
			Code:    "VALIDATION_ERROR",
			Message: ve.Error(),
		},
		ValidationErrors: ve,
	})
}

// respondJSON はJSONレスポンスを返す
func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

// RespondErrorWithMessage はカスタムメッセージ付きでエラーレスポンスを返す
// パスパラメータのパースエラーなど、ドメインエラー以外のシンプルなエラーに使用
func RespondErrorWithMessage(w http.ResponseWriter, status int, code, message string) {
	respondJSON(w, status, ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}
