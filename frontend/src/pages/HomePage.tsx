import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/client'
import { Button } from '@/components/ui/button'

export function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.getSessions(),
  })

  const completeMutation = useMutation({
    mutationFn: (sessionId: number) => api.completeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: () => api.createSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      navigate('/inventory')
    },
  })

  const handleStartNew = async () => {
    try {
      const currentSession = sessions.find((s) => s.status === 'in_progress')
      if (currentSession) {
        await completeMutation.mutateAsync(currentSession.id)
      }
      await createMutation.mutateAsync()
    } catch (err) {
      setError('新規棚卸しの開始に失敗しました')
    }
  }

  const handleResume = () => {
    navigate('/inventory')
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

  const currentSession = sessions.find((s) => s.status === 'in_progress')
  const completedSessions = sessions.filter((s) => s.status === 'completed')
  const isPending = completeMutation.isPending || createMutation.isPending

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
            {error}
            <button onClick={() => setError(null)} className="text-destructive hover:opacity-70">×</button>
          </div>
        )}

        {/* Hero */}
        <div className="text-center py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">棚卸しアプリ</h1>
          <p className="text-muted-foreground">商品在庫の棚卸し作業を効率化</p>
        </div>

        {/* Current Session */}
        {currentSession ? (
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm mb-8">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-3">
              進行中
            </span>
            <h2 className="text-xl font-bold text-foreground mb-4">{currentSession.name}</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-muted-foreground">カウント数</span>
                <div className="text-2xl font-bold font-mono">{currentSession.totalCount} 個</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">合計金額</span>
                <div className="text-2xl font-bold font-mono">{formatPrice(currentSession.totalAmount)}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              開始: {formatDate(currentSession.startedAt)}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1" onClick={handleResume}>
                棚卸しを再開
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={handleStartNew}
                disabled={isPending}
              >
                {isPending ? '処理中...' : '新規で開始'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl p-8 text-center border border-border shadow-sm mb-8">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-foreground mb-2">棚卸しを始めましょう</h2>
            <p className="text-muted-foreground mb-6">
              新しい棚卸しセッションを開始して、商品のカウントを行います。
            </p>
            <Button size="lg" onClick={handleStartNew} disabled={isPending}>
              {isPending ? '開始中...' : '新規棚卸しを開始'}
            </Button>
          </div>
        )}

        {/* Past Sessions */}
        {completedSessions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">過去の棚卸し</h2>
            <div className="space-y-3">
              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  className="bg-card rounded-xl p-4 border border-border shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-foreground">{session.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-success/20 text-success">
                      完了
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm mb-2">
                    <span>{session.totalCount} 個</span>
                    <span className="font-mono">{formatPrice(session.totalAmount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(session.startedAt)}
                    {session.completedAt && ` - ${formatDate(session.completedAt)}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
