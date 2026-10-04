package product

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"stocktaking-app/internal/shared/httputil"
	"stocktaking-app/internal/shared/response"
)

// Handler は商品・SKUのHTTPハンドラー
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
	// Product
	mux.HandleFunc("GET /api/products", h.ListProducts)
	mux.HandleFunc("POST /api/products", h.CreateProduct)
	mux.HandleFunc("GET /api/products/{id}", h.GetProduct)
	mux.HandleFunc("PUT /api/products/{id}", h.UpdateProduct)
	mux.HandleFunc("DELETE /api/products/{id}", h.DeleteProduct)

	// SKU
	mux.HandleFunc("GET /api/skus", h.ListAllSKUs)
	mux.HandleFunc("GET /api/products/{id}/skus", h.ListSKUs)
	mux.HandleFunc("POST /api/products/{id}/skus", h.CreateSKU)
	mux.HandleFunc("PUT /api/skus/{id}", h.UpdateSKU)
	mux.HandleFunc("DELETE /api/skus/{id}", h.DeleteSKU)
}

// === Product Handlers ===

// ListProducts は商品一覧を返す
func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	products, err := h.usecase.GetAllProducts()
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	// nilの場合は空配列を返す
	if products == nil {
		products = []*Product{}
	}
	response.JSON(w, http.StatusOK, products)
}

// GetProduct は商品詳細を返す
func (h *Handler) GetProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	product, err := h.usecase.GetProductByID(id)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusOK, product)
}

// CreateProductRequest は商品作成リクエスト
type CreateProductRequest struct {
	Name string `json:"name"`
}

// CreateProduct は商品を作成する
func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var req CreateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "リクエストが不正です")
		return
	}

	product, err := h.usecase.CreateProduct(req.Name)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusCreated, product)
}

// UpdateProduct は商品を更新する
func (h *Handler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	var req CreateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "リクエストが不正です")
		return
	}

	product, err := h.usecase.UpdateProduct(id, req.Name)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusOK, product)
}

// DeleteProduct は商品を削除する
func (h *Handler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	err = h.usecase.DeleteProduct(id)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// === SKU Handlers ===

// ListAllSKUs は全SKU一覧を返す
func (h *Handler) ListAllSKUs(w http.ResponseWriter, r *http.Request) {
	skus, err := h.usecase.GetAllSKUs()
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	if skus == nil {
		skus = []*SKUDetail{}
	}
	response.JSON(w, http.StatusOK, skus)
}

// ListSKUs は商品のSKU一覧を返す
func (h *Handler) ListSKUs(w http.ResponseWriter, r *http.Request) {
	productID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	skus, err := h.usecase.GetSKUsByProductID(productID)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	if skus == nil {
		skus = []*SKU{}
	}
	response.JSON(w, http.StatusOK, skus)
}

// CreateSKURequest はSKU作成リクエスト
type CreateSKURequest struct {
	Price int `json:"price"`
}

// CreateSKU はSKUを作成する
func (h *Handler) CreateSKU(w http.ResponseWriter, r *http.Request) {
	productID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	var req CreateSKURequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "リクエストが不正です")
		return
	}

	sku, err := h.usecase.CreateSKU(productID, req.Price)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusCreated, sku)
}

// UpdateSKU はSKUを更新する
func (h *Handler) UpdateSKU(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	var req CreateSKURequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "リクエストが不正です")
		return
	}

	sku, err := h.usecase.UpdateSKU(id, req.Price)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	response.JSON(w, http.StatusOK, sku)
}

// DeleteSKU はSKUを削除する
func (h *Handler) DeleteSKU(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httputil.RespondErrorWithMessage(w, http.StatusBadRequest, "BAD_REQUEST", "IDが不正です")
		return
	}

	err = h.usecase.DeleteSKU(id)
	if err != nil {
		httputil.RespondError(w, r, err, h.logger)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
