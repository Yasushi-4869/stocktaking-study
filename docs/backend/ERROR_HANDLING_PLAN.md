# バックエンド エラーハンドリング実装計画 (改訂版)

この計画書は、`docs/backend/ERROR_HANDLING.md` で定義されたエラーハンドリング戦略を段階的に実装するためのロードマップです。
各フェーズは独立してテスト・検証可能であり、変更範囲を最大5ファイル程度に抑えるように設計されています。

## Phase 1: 基盤作成（強化版）

**目標:** アプリケーション全体で使用する共通エラー定義、バリデーションエラーの具体的な構造、DBエラー変換ヘルパー、そして **共通エラーハンドリング関数** を実装する。この段階では既存コードは変更しないため、コンパイルエラーは発生しない。

**変更対象ファイル:**
1.  `backend/internal/shared/domain/error.go` (新規/更新): `ErrNotFound`, `ErrConflict` などの Sentinel Errors と `ValidationError` 構造体を定義。`ValidationError` は `map[string]string` を持つ形式にする。
2.  `backend/internal/shared/database/error.go` (新規): PostgreSQLのエラー (`pq.Error`) を `domain` エラーに変換する `MapDBError` 関数を実装。
3.  `backend/internal/shared/http/error.go` (新規): 共通エラーハンドリング関数 `RespondError(w, r, err)` を実装。これは `shared/response/json.go` のヘルパー関数を利用する。
4.  `backend/internal/shared/http/http.go` (新規): HTTP関連の共通ユーティリティ（例: ContextからLoggerを取り出すヘルパー）を配置する場所として作成（必要に応じて）。

**タスク:**
*   [ ] `backend/internal/shared/domain` パッケージに `error.go` を作成・更新し、Sentinel Errors と `map[string]string` を持つ `ValidationError` を定義する。
*   [ ] `backend/internal/shared/database` パッケージに `error.go` を作成し、`MapDBError` 関数を実装する。
*   [ ] `backend/internal/shared/http` パッケージを作成し、`error.go` ファイルに `RespondError` 関数を実装する。この関数は、`shared/response/json.go` の `JSON`, `Error`, `ErrorWithDetails` などを利用する。
*   [ ] `backend/internal/shared/http/http.go` (または `context.go`) に `Logger` をコンテキストから取得するなどの汎用的なヘルパーを定義（今回はスキップ可能）。

## Phase 2: Product Repository層への適用

**目標:** `product` 機能の Repository で DB エラーをハンドリングし、ドメインエラーに変換・ラップして返すようにする。

**変更対象ファイル:**
1.  `backend/internal/product/repository_postgres.go`: `Create`, `Update`, `Delete` などのメソッドで `database.MapDBError` を使用し、`fmt.Errorf("repository.Method(id=%d): %w", id, err)` の形式でラップする。
2.  `backend/internal/product/repository.go`: インターフェースに変更があれば修正（今回はおそらく不要）。

**タスク:**
*   [ ] `repository_postgres.go` の各メソッド内のエラーハンドリングを書き換え、`database.MapDBError` を通す。
*   [ ] エラー発生時に `fmt.Errorf("repository.Method(id=%d): %w", id, err)` の形式でラップし、元のエラーを含める。

## Phase 3: Product Usecase層への適用

**目標:** `product` 機能の Usecase でバリデーションエラーを返し、Repository エラーをラップする。

**変更対象ファイル:**
1.  `backend/internal/product/usecase.go`:
    *   入力値チェック（商品名が空など）を行い、`domain.NewValidationError` を使って `domain.ValidationErrors` を返す。
    *   Repository 呼び出しのエラーを `fmt.Errorf("usecase.Method: %w", err)` でラップする。
    *   既存の `ErrProductNotFound` などの独自定義エラーを削除し、`shared/domain` のものに置き換える。

**タスク:**
*   [ ] `CreateProduct`, `UpdateProduct` などで入力値バリデーションを追加または修正。
*   [ ] Repository からのエラーを `fmt.Errorf("usecase.Method: %w", err)` の形式でラッピング。
*   [ ] パッケージ固有のエラー定義を `shared/domain` のものに置き換える。

## Phase 4: Product Handler層への適用

**目標:** `product` 機能の Handler で共通エラーハンドリングロジックを呼び出し、適切な HTTP ステータスコードを返す。

**変更対象ファイル:**
1.  `backend/internal/product/handler.go`:
    *   各ハンドラーメソッド (`CreateProduct` 等) のエラー処理を `httputil.RespondError(w, r, err)` に置き換える。
    *   `slog` の Logger インスタンスを Handler に注入（DI）できるようにする（これは `main.go` の修正も伴う）。
2.  `backend/main.go`: `slog` Logger を初期化し、`Handler` に注入する。
3.  `backend/internal/product/handler_test.go` (あれば): テストケースの修正。

**タスク:**
*   [ ] `handler.go` の各ハンドラーメソッドのエラー処理を `httputil.RespondError` の呼び出しに置き換える。
*   [ ] `main.go` で `slog` Logger を設定し、`Handler` コンストラクタ経由で注入する。
*   [ ] `handler.go` で Logger を使用する準備をする。

## Phase 5: Session 機能への展開 (およびその他)

**目標:** `session` 機能にも同様のエラーハンドリングを適用する。

**変更対象ファイル:**
1.  `backend/internal/session/repository_postgres.go`
2.  `backend/internal/session/usecase.go`
3.  `backend/internal/session/handler.go`

**タスク:**
*   [ ] Repository でのエラー変換とラッピング。
*   [ ] Usecase でのバリデーションとラッピング。
*   [ ] Handler での `httputil.RespondError` 利用。

## Phase 6: リファクタリング完了確認

**目標:** 全体の動作確認と、古いコードの削除。

**タスク:**
*   [ ] すべてのAPIエンドポイントが期待通りに動作することを確認（特にエラーケース）。
*   [ ] 不要になった古いエラー定義やヘルパー関数があれば削除する。