# フロントエンド設計書（商品管理機能）

## 1. 概要

商品管理画面を実装し、バックエンドAPIと統合する。

## 2. 実装するファイル

```
frontend/src/
├── App.tsx                 # ルーティング
├── api/
│   └── client.ts           # API クライアント
├── types/
│   └── product.ts          # 型定義
├── pages/
│   └── ProductsPage.tsx    # 商品管理画面
├── components/
│   ├── ProductList.tsx     # 商品一覧
│   ├── ProductForm.tsx     # 商品追加/編集フォーム
│   ├── SKUList.tsx         # SKU一覧
│   └── SKUForm.tsx         # SKU追加/編集フォーム
└── styles/
    └── products.css        # スタイル
```

## 3. 型定義

```typescript
// types/product.ts
interface Product {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

interface SKU {
  id: number
  productId: number
  price: number
  createdAt: string
  updatedAt: string
}

interface SKUDetail {
  skuId: number
  productId: number
  productName: string
  price: number
}
```

## 4. APIクライアント

```typescript
// api/client.ts
const API_BASE = '/api'

// Products
getProducts(): Promise<Product[]>
getProduct(id: number): Promise<Product>
createProduct(name: string): Promise<Product>
updateProduct(id: number, name: string): Promise<Product>
deleteProduct(id: number): Promise<void>

// SKUs
getSKUs(): Promise<SKUDetail[]>
getProductSKUs(productId: number): Promise<SKU[]>
createSKU(productId: number, price: number): Promise<SKU>
updateSKU(id: number, price: number): Promise<SKU>
deleteSKU(id: number): Promise<void>
```

## 5. 画面設計

### 商品管理画面 (`/products`)

```
┌────────────────────────────────────┐
│ 商品管理                   [ホーム] │
├────────────────────────────────────┤
│ [+ 商品を追加]                      │
├────────────────────────────────────┤
│                                    │
│ ▼ 靴                       [編集]  │
│   ┌──────────────────────────────┐ │
│   │ ¥1,600         [編集] [削除] │ │
│   │ ¥2,700         [編集] [削除] │ │
│   │ [+ 価格を追加]               │ │
│   └──────────────────────────────┘ │
│                                    │
│ ▼ 財布                     [編集]  │
│   ┌──────────────────────────────┐ │
│   │ ¥5,000         [編集] [削除] │ │
│   │ [+ 価格を追加]               │ │
│   └──────────────────────────────┘ │
│                                    │
└────────────────────────────────────┘
```

### モーダル/フォーム

**商品追加/編集:**
```
┌────────────────────────┐
│ 商品を追加              │
├────────────────────────┤
│ 商品名                  │
│ ┌────────────────────┐ │
│ │                    │ │
│ └────────────────────┘ │
│                        │
│ [キャンセル]  [保存]    │
└────────────────────────┘
```

**価格追加/編集:**
```
┌────────────────────────┐
│ 価格を追加              │
├────────────────────────┤
│ 価格（円）              │
│ ┌────────────────────┐ │
│ │                    │ │
│ └────────────────────┘ │
│                        │
│ [キャンセル]  [保存]    │
└────────────────────────┘
```

## 6. 状態管理

シンプルに `useState` + `useEffect` で管理。
（Reduxなどは使わない）

```typescript
// ProductsPage.tsx
const [products, setProducts] = useState<Product[]>([])
const [skusByProduct, setSkusByProduct] = useState<Record<number, SKU[]>>({})
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
```

## 7. 実装順序

1. [ ] 型定義 (types/product.ts)
2. [ ] APIクライアント (api/client.ts)
3. [ ] 商品一覧コンポーネント
4. [ ] 商品フォームコンポーネント
5. [ ] SKU一覧コンポーネント
6. [ ] SKUフォームコンポーネント
7. [ ] 商品管理ページ
8. [ ] スタイリング

## 8. 補足

### スマホ対応
- タップしやすいボタンサイズ（最低44px）
- アコーディオン開閉でSKUを表示

### エラーハンドリング
- API呼び出し失敗時にエラーメッセージ表示
- ローディング状態の表示
