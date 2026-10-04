package session

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"stocktaking-app/internal/shared/httputil"
	"stocktaking-app/internal/shared/response"
)

// Handler はセッション・カウントのHTTPハンドラー
type Handler struct {
	usecase *Usecase
	logger  *slog.Logger
}

// NewHandler はHandlerを生成する
func NewHandler(usecase *Usecase, logger *slog.Logger) *Handler {
	return &Handler{usecase: usecase, logger: logger}
}

// RegisterRoutes はルーティングを登録する
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	// Session
	mux.HandleFunc("GET /api/sessions", h.ListSessions)
	mux.HandleFunc("GET /api/sessions/current", h.GetCurrentSession)
	mux.HandleFunc("POST /api/sessions", h.CreateSession)
	mux.HandleFunc("GET /api/sessions/{id}", h.GetSession)
	mux.HandleFunc("PUT /api/sessions/{id}/complete", h.CompleteSession)

	// Count
	mux.HandleFunc("GET /api/sessions/{id}/counts", h.ListCounts)
	mux.HandleFunc("POST /api/sessions/{id}/counts", h.UpsertCount)

	// Lock
	mux.HandleFunc("GET /api/sessions/{id}/locks", h.ListLocks)
	mux.HandleFunc("POST /api/sessions/{id}/locks", h.LockProduct)
	mux.HandleFunc("DELETE /api/sessions/{id}/locks/{productId}", h.UnlockProduct)

	// Export
	mux.HandleFunc("GET /api/sessions/{id}/export", h.ExportCSV)
}

// ListSessions はセッション一覧を返す（統計情報付き）
func (h *Handler) ListSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := h.usecase.GetAllSessionsWithStats()
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	if sessions == nil {
		sessions = []*SessionWithStats{}
	}
	response.JSON(w, http.StatusOK, sessions)
}

// GetCurrentSession は現在の進行中セッションを取得する
// 進行中セッションがなければ null を返す
func (h *Handler) GetCurrentSession(w http.ResponseWriter, r *http.Request) {
	session, err := h.usecase.GetCurrentSession()
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusOK, session)
}

// CreateSession は新規セッションを作成する
func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	session, err := h.usecase.CreateSession()
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusCreated, session)
}

// GetSession はセッション詳細を取得する
func (h *Handler) GetSession(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	session, err := h.usecase.GetSessionByID(id)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusOK, session)
}

// CompleteSession はセッションを完了する
func (h *Handler) CompleteSession(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	session, err := h.usecase.CompleteSession(id)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusOK, session)
}

// ListCounts はセッションの全カウントを取得する
func (h *Handler) ListCounts(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	counts, err := h.usecase.GetCountsBySessionID(id)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	// nilの場合は空配列を返す
	if counts == nil {
		counts = []*CountItemWithSKU{}
	}
	response.JSON(w, http.StatusOK, counts)
}

// UpsertCountRequest はカウントUpsertリクエスト
type UpsertCountRequest struct {
	SKUID    int64  `json:"skuId"`
	Quantity int    `json:"quantity"`
	UserID   *int64 `json:"userId,omitempty"`
}

// UpsertCount はカウントを作成/更新する
func (h *Handler) UpsertCount(w http.ResponseWriter, r *http.Request) {
	sessionID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	var req UpsertCountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "リクエストが不正です")
		return
	}

	item, err := h.usecase.UpsertCount(sessionID, req.SKUID, req.Quantity, req.UserID)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusOK, item)
}

// ListLocks はセッションの全ロックを取得する
func (h *Handler) ListLocks(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	locks, err := h.usecase.GetLocksBySessionID(id)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	if locks == nil {
		locks = []*ProductLock{}
	}
	response.JSON(w, http.StatusOK, locks)
}

// LockProductRequest はロック追加リクエスト
type LockProductRequest struct {
	ProductID int64 `json:"productId"`
}

// LockProduct は商品をロックする
func (h *Handler) LockProduct(w http.ResponseWriter, r *http.Request) {
	sessionID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	var req LockProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "リクエストが不正です")
		return
	}

	lock, err := h.usecase.LockProduct(sessionID, req.ProductID)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusCreated, lock)
}

// UnlockProduct は商品のロックを解除する
func (h *Handler) UnlockProduct(w http.ResponseWriter, r *http.Request) {
	sessionID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	productID, err := strconv.ParseInt(r.PathValue("productId"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "商品IDが不正です")
		return
	}

	err = h.usecase.UnlockProduct(sessionID, productID)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ExportCSV はセッションのカウントデータをCSVで出力する
func (h *Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	session, err := h.usecase.GetSessionByID(id)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}

	counts, err := h.usecase.GetCountsBySessionID(id)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}

	// ファイル名を生成
	filename := fmt.Sprintf("棚卸し_%s.csv", session.Name)

	// CSVレスポンスヘッダー設定
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	// BOM付きUTF-8（Excelで開くため）
	w.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// ヘッダー行
	writer.Write([]string{"商品名", "価格", "数量", "小計"})

	// データ行 + 商品別集計の準備
	type productSummary struct {
		name     string
		quantity int
		amount   int
	}
	var totalAmount int
	summaryOrder := []int64{}               // 商品の出現順を保持
	summaryMap := map[int64]*productSummary{} // productID → 集計

	for _, item := range counts {
		subtotal := item.Price * item.Quantity
		totalAmount += subtotal
		writer.Write([]string{
			item.ProductName,
			strconv.Itoa(item.Price),
			strconv.Itoa(item.Quantity),
			strconv.Itoa(subtotal),
		})

		if _, exists := summaryMap[item.ProductID]; !exists {
			summaryOrder = append(summaryOrder, item.ProductID)
			summaryMap[item.ProductID] = &productSummary{name: item.ProductName}
		}
		summaryMap[item.ProductID].quantity += item.Quantity
		summaryMap[item.ProductID].amount += subtotal
	}

	// 合計行
	writer.Write([]string{"", "", "合計", strconv.Itoa(totalAmount)})

	// 商品別集計テーブル
	writer.Write([]string{})
	writer.Write([]string{"商品別集計"})
	writer.Write([]string{"商品名", "数量", "小計"})
	for _, pid := range summaryOrder {
		s := summaryMap[pid]
		writer.Write([]string{
			s.name,
			strconv.Itoa(s.quantity),
			strconv.Itoa(s.amount),
		})
	}
	writer.Write([]string{"", "合計", strconv.Itoa(totalAmount)})
}
