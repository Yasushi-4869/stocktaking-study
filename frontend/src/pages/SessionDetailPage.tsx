import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CountItemWithSKU } from '../types/product'
import * as api from '../api/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const sessionId = id ? parseInt(id, 10) : undefined

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  })

  const { data: counts = [], isLoading: countsLoading } = useQuery({
    queryKey: ['session', sessionId, 'counts'],
    queryFn: () => api.getSessionCounts(sessionId!),
    enabled: !!sessionId,
  })

  const handleExportCSV = () => {
    if (!id) return
    window.location.href = `/api/sessions/${id}/export`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price)
  }

  // 商品別にグループ化
  const groupedCounts = counts.reduce(
    (acc, item) => {
      if (!acc[item.productName]) {
        acc[item.productName] = []
      }
      acc[item.productName].push(item)
      return acc
    },
    {} as Record<string, CountItemWithSKU[]>
  )

  const totalCount = session?.totalCount ?? 0
  const totalAmount = session?.totalAmount ?? 0
  const isLoading = sessionLoading || countsLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          読み込み中...
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          セッションが見つかりません
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          ← ホームに戻る
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
          <div>
            <span className={cn(
              "inline-block px-3 py-1 rounded-full text-xs font-medium mb-2",
              session.status === 'in_progress'
                ? "bg-primary/10 text-primary"
                : "bg-success/20 text-success"
            )}>
              {session.status === 'in_progress' ? '進行中' : '完了'}
            </span>
            <h1 className="text-2xl font-bold text-foreground">{session.name}</h1>
            <p className="text-sm text-muted-foreground">
              開始: {formatDate(session.startedAt)}
              {session.completedAt && ` / 完了: ${formatDate(session.completedAt)}`}
            </p>
          </div>
          <Button onClick={handleExportCSV}>
            CSV出力
          </Button>
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
          {Object.keys(groupedCounts).length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center border border-border">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold">カウントデータがありません</h3>
            </div>
          ) : (
            Object.entries(groupedCounts).map(([productName, items]) => {
              const productTotal = items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              )

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
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-border last:border-b-0"
                      >
                        <span className="font-mono">{formatPrice(item.price)}</span>
                        <span className={cn(
                          "font-mono",
                          item.quantity > 0 && "text-success font-semibold"
                        )}>
                          {item.quantity} 個
                        </span>
                        <span className="font-mono">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 bg-card rounded-xl p-4 md:p-6 border border-border shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">合計金額</span>
            <span className="text-2xl font-bold font-mono text-foreground">
              {formatPrice(totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
