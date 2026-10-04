# バックエンド エラーハンドリング設計 (改訂版)

## 1. 基本方針

*   **詳細の隠蔽**: データベースの内部エラーやスタックトレースなどの技術的詳細は、クライアント（フロントエンド）には返さない。
*   **文脈の保持 (重要)**: エラーが発生した際、単にエラーを返すだけでなく、**どの関数のどの操作で失敗したかという文脈を付与（エラーラッピング）**することで、ログ調査を容易にする。
*   **レイヤーの独立性**: Handler層やUsecase層が、特定のDBドライバ（`lib/pq`など）に直接依存しない。Repository層がDB固有のエラーを翻訳する。

## 2. エラーの分類と定義

エラーを3つのカテゴリに分け、`backend/internal/shared/domain/error.go` (または類似の共通パッケージ) 等で一元管理します。

### ① Sentinel Errors (既知のドメインエラー)
ビジネスロジック上の失敗やデータ制約違反など、想定内のエラー。`errors.Is()` で判定可能にします。

```go
// backend/internal/shared/domain/error.go (例)
package domain

import "errors"

var (
    ErrNotFound   = errors.New("resource not found")
    ErrConflict   = errors.New("resource conflict")
    ErrInternal   = errors.New("internal system error") // 最終的なフォールバック
    // 将来的な拡張例: ErrInsufficientStock = errors.New("insufficient stock")
)

// AppError は共通のカスタムエラーインターフェースを定義することも検討
// type AppError interface {
//     error
//     ClientMessage() string
//     StatusCode() int
//     ErrorCode() string
// }
```

### ② Validation Errors (入力値エラー)
クライアントのリクエスト内容（型不正、必須項目漏れ、数値範囲外など）の問題。
対応するHTTPステータスコードは **400 Bad Request**。

実装: 専用の構造体を用意し、どのフィールドがどのような理由でダメだったかを返せるようにします。

```go
// backend/internal/shared/domain/error.go (例)
type ValidationError struct {
    Field   string `json:"field"`
    Reason  string `json:"reason"`
    // 必要に応じてPathなども追加
}

type ValidationErrors []ValidationError

func (ve ValidationErrors) Error() string {
    // 複数のエラーをまとめたメッセージを生成
    if len(ve) == 0 {
        return "validation error"
    }
    msg := "validation failed for fields: "
    for i, e := range ve {
        msg += e.Field + " (" + e.Reason + ")"
        if i < len(ve)-1 {
            msg += ", "
        }
    }
    return msg
}

// NewValidationError は単一のバリデーションエラーを生成するヘルパー
func NewValidationError(field, reason string) error {
    return ValidationErrors{{Field: field, Reason: reason}}
}
```

### ③ Unexpected Errors (予期せぬシステムエラー)
DB接続断、SQL構文ミス、Nil参照など、アプリケーションの運用上で予期せぬ、または回復不能なエラー。
対応するHTTPステータスコードは **500 Internal Server Error**。クライアントへは汎用メッセージ、ログには詳細を出す。

## 3. レイヤー別の責務と実装ルール

### Repository層 (データアクセス)
*   **役割**: データベースドライバ固有のエラーをハンドリングし、ドメインエラーに変換するか、適切な文脈を付与してラップする。
*   **ルール1: エラー変換ヘルパーを使う**:
    *   `pq.Error` (PostgreSQL固有のエラー型) を直接 Handler 層まで漏らさない。
    *   `infrastructure/db/postgres/error.go` (例) などに変換関数を作り、DB固有のエラーコードをドメインエラー (`domain.ErrConflict` など) にマッピングする。
*   **ルール2: エラーラッピングの徹底**:
    *   `return err` ではなく `return fmt.Errorf("repository.CreateProduct: %w", err)` のように、呼び出し元情報と元のエラー (`%w`) を付与してラップする。これにより、エラーの発生源をログから特定しやすくなる。

```go
// backend/internal/infrastructure/db/postgres/error.go (例)
package postgres

import (
	"errors"
	"fmt"

	"github.com/lib/pq" // PostgreSQLドライバ
	"stocktaking-app/internal/shared/domain" // ドメインエラー定義
)

// MapDBError はDBエラーをドメインエラーに変換するヘルパー
func MapDBError(err error) error {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		switch pqErr.Code.Name() { // pq.Errorはコード名も持つ
		case "unique_violation": // Code: "23505"
			return domain.ErrConflict
		case "foreign_key_violation": // Code: "23503"
			return domain.ErrNotFound // または domain.ErrForeignKeyViolation など
		}
	}
	return err // 未知のDBエラーはそのまま返す（Handlerで500になる）
}

// Repositoryの実装例 (backend/internal/product/repository_postgres.go)
func (r *PostgresProductRepository) Create(ctx context.Context, p *domain.Product) error { // Productはdomain層の型とする
    // ... DB操作 ...
    _, err := r.db.ExecContext(ctx, "INSERT ...", ...)
    if err != nil {
        mappedErr := MapDBError(err)
        if errors.Is(mappedErr, domain.ErrConflict) {
            // 番兵エラーの場合は文脈をつけて返す
            return fmt.Errorf("repository.PostgresProductRepository.Create: %w", domain.ErrConflict)
        }
        // 予期せぬエラーの場合もラップして返す（ログ調査用）
        return fmt.Errorf("repository.PostgresProductRepository.Create: %w", err)
    }
    return nil
}
```

### Usecase層 (ビジネスロジック)
*   **役割**: トランザクション制御とビジネスルールの検証。
*   **ルール1**: Repositoryからのエラーは、**そのまま（またはラップして）**Handler層に流す。
*   **ルール2**: 特定のビジネスルール違反の場合のみ、**明示的にドメインエラーを発生**させる。
*   **ルール3: エラーラッピングの徹底**: Repositoryからのエラーを含め、Usecase層での文脈を付与してラップする。

```go
// backend/internal/product/usecase.go (例)
package product

import (
	"context"
	"fmt"
	"errors"

	"stocktaking-app/internal/shared/domain" // ドメインエラー定義
)

// Usecaseの実装例
func (u *Usecase) RegisterProduct(ctx context.Context, name string) (*domain.Product, error) { // Productはdomain層の型とする
    // 1. 入力値バリデーション (Usecase層で行う)
    if name == "" {
        // domain.NewValidationError もしくは他のライブラリでバリデーションエラーを返す
        return nil, fmt.Errorf("usecase.RegisterProduct: %w", domain.NewValidationError("name", "商品名は必須です"))
    }

    // 2. ビジネスルール検証 (例: 価格が負ではないかなど、より複雑なもの)
    // if price < 0 { return nil, domain.NewValidationError(...) }

    product := &domain.Product{Name: name} // domain層のProduct型を利用
    if err := u.productRepo.Create(ctx, product); err != nil {
        // RepositoryからのエラーをUsecase層の文脈でラップ
        return nil, fmt.Errorf("usecase.RegisterProduct: %w", err)
    }
    return product, nil
}
```

### Handler層 (HTTPプレゼンテーション)
*   **役割**: エラーの「型」や「値」を見て、ステータスコードとJSONレスポンスを決定する。ログ出力の最終責任を持つ。
*   **ルール1: `errors.Is` または `errors.As` を使う**: ドメインエラーを判定する。
*   **ルール2: 500エラー時のみ詳細ログ**: 400番台のエラーはクライアントの入力ミスであり、`Warn` や `Info` レベルで十分。500番台はシステムの問題であり、`Error` レベルで詳細（スタックトレースやラップされたエラー文脈）をログに出す。

```go
// backend/internal/product/handler.go (例)
package product

import (
	"errors"
	"net/http"

	"stocktaking-app/internal/shared/domain"
	"stocktaking-app/internal/shared/response"
	"golang.org/x/exp/slog" // 推奨されるロガー
)

// Handlerの実装例
func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
    // ... リクエストパース ...
    product, err := h.usecase.RegisterProduct(r.Context(), req.Name) // Usecase呼び出し
    if err != nil {
        h.handleError(w, r, err) // 共通エラーハンドラーを呼び出す
        return
    }
    response.JSON(w, http.StatusCreated, product) // 成功レスポンス
}

// 共通エラーハンドラーメソッド (Handler構造体のメソッドとして実装)
func (h *Handler) handleError(w http.ResponseWriter, r *http.Request, err error) {
    // 1. バリデーションエラー判定 (errors.As)
    var valErrs domain.ValidationErrors // ValidationErrors は []ValidationError の別名
    if errors.As(err, &valErrs) {
        response.JSON(w, http.StatusBadRequest, map[string]any{
            "code": "BAD_REQUEST",
            "message": "入力値が正しくありません",
            "details": valErrs, // {"field": "price", "reason": "0以上の数値を入力してください"}
        })
        return
    }

    // 2. Sentinel Errors (ドメインエラー) 判定 (errors.Is)
    switch {
    case errors.Is(err, domain.ErrNotFound):
        response.JSON(w, http.StatusNotFound, map[string]string{"code": "NOT_FOUND", "message": "リソースが見つかりません"})
    case errors.Is(err, domain.ErrConflict):
        response.JSON(w, http.StatusConflict, map[string]string{"code": "CONFLICT", "message": "既に存在します"})
    case errors.Is(err, domain.ErrInternal): // 特定のシステムエラー
        slog.Error("Internal system error occurred", "error", err, "path", r.URL.Path) // 文脈付き詳細ログ
        response.JSON(w, http.StatusInternalServerError, map[string]string{
            "code": "INTERNAL_ERROR",
            "message": "サーバー内部で予期せぬエラーが発生しました",
        })
    default:
        // 3. その他の予期せぬエラー (500 Internal Server Error)
        // ここで初めて詳細ログを出す！ (RepositoryやUsecaseでラップした文脈がここで活きる)
        // 例: "usecase.RegisterProduct: create product db exec: sql: connection refused"
        slog.Error("Unhandled Server Error", "error", err, "path", r.URL.Path)
        
        response.JSON(w, http.StatusInternalServerError, map[string]string{
            "code": "INTERNAL_ERROR",
            "message": "サーバー内部で予期せぬエラーが発生しました",
        })
    }
}
```

## 4. エラーレスポンス形式 (JSON)

400系エラー（特にバリデーション）に対応するため、`details` フィールドを追加可能にします。

```json
// 400 Bad Request (バリデーションエラーの例)
{
  "code": "BAD_REQUEST",
  "message": "入力データに誤りがあります",
  "details": [
    {
      "field": "price",
      "reason": "0以上の数値を入力してください"
    },
    {
      "field": "name",
      "reason": "商品名は必須です"
    }
  ]
}

// 404 Not Found
{
  "code": "NOT_FOUND",
  "message": "リソースが見つかりません"
}

// 409 Conflict
{
  "code": "CONFLICT",
  "message": "既に存在します"
}

// 500 Internal Server Error
{
  "code": "INTERNAL_ERROR",
  "message": "サーバー内部で予期せぬエラーが発生しました"
}
```