# ==============================================================================
# 変数
# ==============================================================================

COMPOSE_DEV = docker compose -f docker-compose.dev.yml
COMPOSE_PROD = docker compose
DATABASE_URL ?= postgres://postgres:postgres@db:5432/inventory?sslmode=disable
MIGRATIONS_PATH = backend/db/migrations

# ==============================================================================
# Docker Compose
# ==============================================================================

.PHONY: up
up: ## 開発環境を起動
	$(COMPOSE_DEV) up -d

.PHONY: up-build
up-build: ## 開発環境をビルドして起動
	$(COMPOSE_DEV) up -d --build

.PHONY: down
down: ## 開発環境を停止
	$(COMPOSE_DEV) down

.PHONY: logs
logs: ## 全サービスのログを表示
	$(COMPOSE_DEV) logs -f

.PHONY: logs-backend
logs-backend: ## バックエンドのログを表示
	$(COMPOSE_DEV) logs -f backend

.PHONY: logs-frontend
logs-frontend: ## フロントエンドのログを表示
	$(COMPOSE_DEV) logs -f frontend

.PHONY: ps
ps: ## コンテナの状態を表示
	$(COMPOSE_DEV) ps

# ==============================================================================
# バックエンド
# ==============================================================================

.PHONY: backend-shell
backend-shell: ## バックエンドコンテナに入る
	$(COMPOSE_DEV) exec backend sh

.PHONY: backend-test
backend-test: ## バックエンドのテスト実行
	$(COMPOSE_DEV) exec backend go test -v ./...

.PHONY: backend-fmt
backend-fmt: ## バックエンドのコードフォーマット
	$(COMPOSE_DEV) exec backend go fmt ./...

.PHONY: backend-lint
backend-lint: ## バックエンドのリント
	$(COMPOSE_DEV) exec backend go vet ./...

# ==============================================================================
# フロントエンド
# ==============================================================================

.PHONY: frontend-shell
frontend-shell: ## フロントエンドコンテナに入る
	$(COMPOSE_DEV) exec frontend sh

.PHONY: frontend-test
frontend-test: ## フロントエンドのテスト実行
	$(COMPOSE_DEV) exec frontend npm test

.PHONY: frontend-lint
frontend-lint: ## フロントエンドのリント
	$(COMPOSE_DEV) exec frontend npm run lint

# ==============================================================================
# データベース
# ==============================================================================

.PHONY: db-shell
db-shell: ## DBコンテナに入る（psql）
	$(COMPOSE_DEV) exec db psql -U postgres -d inventory

.PHONY: migrate-up
migrate-up: ## マイグレーション実行
	$(COMPOSE_DEV) run --rm backend migrate -path db/migrations -database "$(DATABASE_URL)" up

.PHONY: migrate-down
migrate-down: ## マイグレーション1つ戻す
	$(COMPOSE_DEV) run --rm backend migrate -path db/migrations -database "$(DATABASE_URL)" down 1

.PHONY: migrate-down-all
migrate-down-all: ## マイグレーション全て戻す
	$(COMPOSE_DEV) run --rm backend migrate -path db/migrations -database "$(DATABASE_URL)" down -all

.PHONY: migrate-status
migrate-status: ## マイグレーション状態確認
	$(COMPOSE_DEV) run --rm backend migrate -path db/migrations -database "$(DATABASE_URL)" version

.PHONY: migrate-create
migrate-create: ## 新しいマイグレーションファイル作成 (NAME=xxx)
	$(COMPOSE_DEV) run --rm backend migrate create -ext sql -dir db/migrations -seq $(NAME)

# ==============================================================================
# 本番
# ==============================================================================

.PHONY: prod-up
prod-up: ## 本番環境を起動
	$(COMPOSE_PROD) up -d --build

.PHONY: prod-down
prod-down: ## 本番環境を停止
	$(COMPOSE_PROD) down

# ==============================================================================
# クリーンアップ
# ==============================================================================

.PHONY: clean
clean: ## コンテナ、ボリューム、イメージを削除
	$(COMPOSE_DEV) down -v --rmi local

.PHONY: clean-all
clean-all: ## 全てのDockerリソースを削除（注意）
	$(COMPOSE_DEV) down -v --rmi all

# ==============================================================================
# ヘルプ
# ==============================================================================

.PHONY: help
help: ## ヘルプ表示
	@echo "使用可能なコマンド:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
