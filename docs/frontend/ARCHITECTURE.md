# Frontend Architecture

このプロジェクトでは、Reactフロントエンドの開発において **Feature-based Architecture (機能単位アーキテクチャ)** を採用し、UIライブラリとして **shadcn/ui** と **Tailwind CSS** を使用します。

## 技術スタック

*   **Framework:** React (Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Components:** shadcn/ui (Radix UI + Tailwind CSS)
*   **State Management:** React Context / Hooks (必要に応じて TanStack Query などの導入を検討)
*   **Routing:** React Router

## ディレクトリ構造

「機能（Feature）」を第一級市民として扱い、関連するコード（UI、ロジック、API、型）を機能ごとに凝集させます。

```
src/
├── app/                 # アプリケーションのエントリーポイント周辺
│   ├── layout.tsx       # 全体のレイアウト構造
│   ├── providers.tsx    # Context Provider等の設定
│   └── router.tsx       # ルーティング定義
├── components/          # アプリケーション全体で使用する共通コンポーネント
│   ├── ui/              # shadcn/ui のコンポーネント (Button, Input, Dialog...) - Atoms/Molecules相当
│   └── shared/          # プロジェクト固有の共通コンポーネント (Header, Footer...)
├── features/            # 機能ごとのモジュール分割 (Domain Driven)
│   ├── inventory/       # 棚卸し機能
│   │   ├── api/         # API通信ロジック
│   │   ├── components/  # この機能専用のUIコンポーネント (Organisms相当)
│   │   ├── hooks/       # カスタムフック (ビジネスロジック)
│   │   ├── types/       # 型定義
│   │   └── routes/      # ページコンポーネント (pages相当)
│   ├── products/        # 商品管理機能
│   └── sessions/        # セッション管理機能
├── hooks/               # 全汎用的なカスタムフック (useDebounce, useLocalStorage...)
├── lib/                 # 外部ライブラリの設定やユーティリティ (axios, utils...)
└── types/               # アプリケーション全体で共有する型定義
```

## アーキテクチャの原則

1.  **Colocation (関連するものを近くに置く):**
    *   特定の機能でしか使わないコンポーネントやロジックは、`src/components` ではなく `src/features/{featureName}` 内に配置します。
    *   これにより、機能の削除や修正が容易になり、コードの認知負荷を下げます。

2.  **UIライブラリの活用 (shadcn/ui):**
    *   汎用的なUIパーツ（ボタン、入力フォーム、モーダルなど）は `src/components/ui` にある shadcn/ui コンポーネントを使用します。
    *   スタイリングは Tailwind CSS のクラスのみで行い、CSS Modules や `style` タグの使用は避けます（動的な値を除く）。

3.  **ロジックの分離:**
    *   View（コンポーネント）と Logic（フック）を分離することを推奨します。
    *   複雑な状態管理やAPI通信は `features/{feature}/hooks` 内のカスタムフックに隠蔽し、コンポーネントはデータの表示とイベントハンドリングに集中します。

4.  **厳密な境界:**
    *   Feature間の依存は極力避けます。Feature A が Feature B の内部コンポーネントを直接インポートすることは避け、必要な場合は共通化（`src/components` や `src/hooks` への移動）を検討します。

## レスポンシブ・タッチ対応

タブレット（iPad等）での安定動作を保証するため、以下の方針を遵守します。

1.  **タッチターゲットサイズ:**
    *   ボタンやリンクなどのインタラクティブ要素は最低 **44x44px** を確保。
    *   Tailwind: `min-h-11 min-w-11` または `p-3` 以上のパディング。

2.  **ネイティブダイアログの禁止:**
    *   `window.confirm()`, `window.alert()`, `window.prompt()` は **使用禁止**。
    *   iOS Safari でタッチイベントと競合し、動作しないことがある。
    *   代わりに shadcn/ui の `AlertDialog` を使用。

3.  **レスポンシブデザイン:**
    *   Tailwind のブレークポイント (`sm:`, `md:`, `lg:`, `xl:`) を使用。
    *   モバイルファースト: デフォルトスタイルはモバイル向け、大画面向けはブレークポイントで上書き。

4.  **フォーム入力:**
    *   キーボード表示時のレイアウト崩れを防ぐため、モーダル内フォームはスクロール可能に。
    *   `input[type="number"]` は iOS で適切な数字キーボードが表示されることを確認。

## エラーハンドリング

1.  **API エラー:**
    *   `features/{feature}/hooks` 内で処理し、コンポーネントに適切な状態を返す。
    *   TanStack Query の `onError` コールバックを活用。

2.  **ユーザー向けエラー表示:**
    *   一時的な通知: shadcn/ui の `Toast` を使用。
    *   確認が必要なエラー: shadcn/ui の `AlertDialog` を使用。
    *   フォームバリデーション: インラインでエラーメッセージを表示。

3.  **グローバルエラーバウンダリ:**
    *   `app/providers.tsx` に React Error Boundary を設置。
    *   予期しないエラー時にフォールバック UI を表示。

## データフェッチング

**TanStack Query (React Query)** を導入し、以下を標準化します。

*   **キャッシュ管理:** 同じデータの重複リクエストを防止。
*   **楽観的更新:** カウント変更などは即座に UI に反映し、バックグラウンドで API を呼び出し。
*   **リトライ:** ネットワークエラー時の自動リトライ。
*   **ローディング/エラー状態:** `isLoading`, `isError` で統一的に管理。

```typescript
// 例: features/inventory/hooks/useSessionCounts.ts
export function useSessionCounts(sessionId: number) {
  return useQuery({
    queryKey: ['session', sessionId, 'counts'],
    queryFn: () => api.getSessionCounts(sessionId),
  })
}

export function useUpsertCount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { sessionId: number; skuId: number; quantity: number }) =>
      api.upsertCount(data.sessionId, data.skuId, data.quantity),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session', variables.sessionId] })
    },
  })
}
```

## 開発フロー（移行ガイド）

既存のコードベースから新しいアーキテクチャへの移行は、以下のステップで行います。
**現状の問題（タッチ非対応、confirm問題）を優先的に解決します。**

### Phase 1: 基盤導入（最優先）
1.  Tailwind CSS のセットアップ
2.  shadcn/ui のセットアップ
3.  パスエイリアス (`@/*`) の設定
4.  TanStack Query のセットアップ

### Phase 2: 致命的な問題の解決
1.  `window.confirm()` → shadcn/ui `AlertDialog` に置き換え
2.  既存 `Modal` → shadcn/ui `Dialog` に置き換え
3.  ボタンのタッチターゲットサイズを修正

### Phase 3: データフェッチングの改善
1.  API クライアントを TanStack Query のフックに移行
2.  デバウンス処理を楽観的更新に置き換え
3.  ローディング/エラー状態の統一

### Phase 4: Feature 分割
1.  `src/pages` 内のコンポーネントを分解
2.  `src/features` 配下の適切なディレクトリに移動
3.  Feature 固有のフック・コンポーネントを整理

### Phase 5: スタイルの移行
1.  `.css` ファイルを削除
2.  Tailwind CSS クラスに書き換え
3.  レスポンシブ対応の確認
