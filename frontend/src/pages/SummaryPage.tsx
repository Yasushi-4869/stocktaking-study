import { useQuery } from '@tanstack/react-query'
import * as api from '../api/client'
import { SKUDetail, CountItemWithSKU } from '../types/product'
import { cn } from '@/lib/utils'

const POLLING_INTERVAL = 3000 // 3秒ごとに更新

export function SummaryPage() {
  // 全SKUを取得
  const { data: skus = [] } = useQuery({
    queryKey: ['skus', 'all'],
    queryFn: () => api.getAllSKUs(),
  })

  // 現在のセッションを取得
  const { data: session } = useQuery({
    queryKey: ['session', 'current'],
    queryFn: () => api.getCurrentSession(),
  })

  // セッションのカウントを取得（ポーリングあり）
  const { data: counts = {}, isLoading } = useQuery({
    queryKey: ['session', session?.id, 'counts'],
    queryFn: async () => {
      const countsData = await api.getSessionCounts(session!.id)
      const countsMap: Record<number, number> = {}
      if (Array.isArray(countsData)) {
        countsData.forEach((item: CountItemWithSKU) => {
          countsMap[item.skuId] = item.quantity
        })
      }
      return countsMap
    },
    enabled: !!session?.id,
    refetchInterval: POLLING_INTERVAL, // 自動ポーリング
  })

  // セッション統計を取得（ポーリングあり）
  const { data: sessionStats } = useQuery({
    queryKey: ['session', session?.id, 'stats'],
    queryFn: () => api.getSession(session!.id),
    enabled: !!session?.id,
    refetchInterval: POLLING_INTERVAL,
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price)
  }

  // Group SKUs by product
  const groupedSKUs = skus.reduce(
    (acc, sku) => {
      if (!acc[sku.productName]) {
        acc[sku.productName] = []
      }
      acc[sku.productName].push(sku)
      return acc
    },
    {} as Record<string, SKUDetail[]>
  )

  const totalCount = sessionStats?.totalCount ?? 0
  const totalAmount = sessionStats?.totalAmount ?? 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          読み込み中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground">棚卸し集計</h2>
          <p className="text-muted-foreground">
            {Object.keys(groupedSKUs).length}件の商品 / {skus.length}件の価格
            {session && (
              <span className="ml-2 text-sm">
                （セッション #{session.id}）
              </span>
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 md:p-6 border border-border shadow-sm">
            <div className="text-sm text-muted-foreground mb-1">総カウント数</div>
            <div className="text-2xl md:text-3xl font-bold font-mono text-foreground">
              {totalCount} 個
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 md:p-6 border border-border shadow-sm">
            <div className="text-sm text-muted-foreground mb-1">合計金額</div>
            <div className="text-2xl md:text-3xl font-bold font-mono text-foreground">
              {formatPrice(totalAmount)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {Object.keys(groupedSKUs).length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center border border-border">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">データがありません</h3>
              <p className="text-muted-foreground">
                棚卸しを開始して、商品のカウントを行ってください。
              </p>
            </div>
          ) : (
            Object.entries(groupedSKUs).map(([productName, productSKUs]) => {
              const productTotal = productSKUs.reduce((sum, sku) => {
                const quantity = counts[sku.skuId] || 0
                return sum + sku.price * quantity
              }, 0)

              return (
                <div key={productName} className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 bg-muted/50 border-b border-border">
                    <h3 className="font-semibold text-foreground">{productName}</h3>
                    <span className="text-sm text-muted-foreground">
                      小計: <span className="font-mono">{formatPrice(productTotal)}</span>
                    </span>
                  </div>
                  <div>
                    <div className="grid grid-cols-3 gap-2 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                      <span>価格</span>
                      <span>数量</span>
                      <span>小計</span>
                    </div>
                    {productSKUs.map((sku) => {
                      const quantity = counts[sku.skuId] || 0
                      const subtotal = sku.price * quantity
                      return (
                        <div
                          key={sku.skuId}
                          className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-border last:border-b-0"
                        >
                          <span className="font-mono">{formatPrice(sku.price)}</span>
                          <span className={cn(
                            "font-mono",
                            quantity > 0 && "text-success font-semibold"
                          )}>
                            {quantity} 個
                          </span>
                          <span className="font-mono">{formatPrice(subtotal)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {skus.length > 0 && (
          <div className="mt-6 bg-card rounded-xl p-4 md:p-6 border border-border shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">合計金額</span>
              <span className="text-2xl font-bold font-mono text-foreground">
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
