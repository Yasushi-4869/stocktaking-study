package main

import (
	"log"
	"log/slog"
	"net/http"
	"os"

	"stocktaking-app/internal/product"
	"stocktaking-app/internal/session"
	"stocktaking-app/internal/shared/config"
	"stocktaking-app/internal/shared/database"
	"stocktaking-app/internal/shared/response"
)

func main() {
	// ロガー初期化
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// 設定読み込み
	cfg := config.Load()

	// DB接続
	db := database.NewDB(cfg.DatabaseURL)
	defer db.Close()

	// Repository
	productRepo := product.NewPostgresProductRepository(db)
	skuRepo := product.NewPostgresSKURepository(db)

	// Usecase
	productUsecase := product.NewUsecase(productRepo, skuRepo)

	// Handler
	productHandler := product.NewHandler(productUsecase, logger)

	// Session Repository
	sessionRepo := session.NewPostgresSessionRepository(db)
	countItemRepo := session.NewPostgresCountItemRepository(db)
	productLockRepo := session.NewPostgresProductLockRepository(db)

	// Session Usecase
	sessionUsecase := session.NewUsecase(sessionRepo, countItemRepo, productLockRepo)

	// Session Handler
	sessionHandler := session.NewHandler(sessionUsecase, logger)

	// ルーター設定
	mux := http.NewServeMux()

	// ヘルスチェック
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// 商品API
	productHandler.RegisterRoutes(mux)

	// セッションAPI
	sessionHandler.RegisterRoutes(mux)

	// サーバー起動
	addr := ":" + cfg.Port
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
