import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as api from '../api/client'
import { Button } from '@/components/ui/button'

export function SessionCompletePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const sessionId = id ? parseInt(id, 10) : undefined

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price)
  }

  const totalCount = session?.totalCount ?? 0
  const totalAmount = session?.totalAmount ?? 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-foreground mb-2">棚卸し完了！</h1>
        <p className="text-muted-foreground mb-8">お疲れ様でした</p>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">カウント数</div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {totalCount} 個
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">合計金額</div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {formatPrice(totalAmount)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={() => window.location.href = `/api/sessions/${id}/export`}
          >
            CSV出力
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => navigate(`/sessions/${id}`)}
          >
            結果を見る
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => navigate('/')}
          >
            ホームに戻る
          </Button>
        </div>
      </div>
    </div>
  )
}
