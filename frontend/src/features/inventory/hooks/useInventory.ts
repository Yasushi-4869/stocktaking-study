import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { CountItemWithSKU } from '@/types/product'

// セッション関連のクエリキー
export const sessionKeys = {
  all: ['session'] as const,
  current: () => [...sessionKeys.all, 'current'] as const,
  counts: (sessionId: number) => [...sessionKeys.all, sessionId, 'counts'] as const,
  locks: (sessionId: number) => [...sessionKeys.all, sessionId, 'locks'] as const,
}

// 商品関連のクエリキー
export const productKeys = {
  all: ['products'] as const,
  list: () => [...productKeys.all, 'list'] as const,
  skus: (productId: number) => [...productKeys.all, productId, 'skus'] as const,
}

// 現在のセッションを取得
export function useCurrentSession() {
  return useQuery({
    queryKey: sessionKeys.current(),
    queryFn: () => api.getCurrentSession(),
  })
}

// セッションのカウント一覧を取得
export function useSessionCounts(sessionId: number | undefined) {
  return useQuery({
    queryKey: sessionKeys.counts(sessionId!),
    queryFn: async () => {
      const data = await api.getSessionCounts(sessionId!)
      // queryFn内で変換してしまう（selectを使わない）
      const countsMap: Record<number, number> = {}
      if (Array.isArray(data)) {
        data.forEach((item: CountItemWithSKU) => {
          countsMap[item.skuId] = item.quantity
        })
      }
      return countsMap
    },
    enabled: !!sessionId,
  })
}

// 商品一覧を取得
export function useProducts() {
  return useQuery({
    queryKey: productKeys.list(),
    queryFn: () => api.getProducts(),
  })
}

// 商品のSKU一覧を取得
export function useProductSKUs(productId: number | null) {
  return useQuery({
    queryKey: productKeys.skus(productId!),
    queryFn: () => api.getProductSKUs(productId!),
    enabled: !!productId,
  })
}

// カウントを更新（楽観的更新）
export function useUpsertCount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, skuId, quantity }: { sessionId: number; skuId: number; quantity: number }) =>
      api.upsertCount(sessionId, skuId, quantity),
    onMutate: async ({ sessionId, skuId, quantity }) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: sessionKeys.counts(sessionId) })

      // 以前のデータを保存（変換後の形式）
      const previousCounts = queryClient.getQueryData<Record<number, number>>(sessionKeys.counts(sessionId))

      // 楽観的に更新
      queryClient.setQueryData<Record<number, number>>(
        sessionKeys.counts(sessionId),
        (old) => ({ ...old, [skuId]: quantity })
      )

      return { previousCounts }
    },
    onError: (_err, { sessionId }, context) => {
      // エラー時は以前のデータに戻す
      if (context?.previousCounts) {
        queryClient.setQueryData(sessionKeys.counts(sessionId), context.previousCounts)
      }
    },
    onSettled: (_data, _error, { sessionId }) => {
      // 完了後にデータを再取得
      queryClient.invalidateQueries({ queryKey: sessionKeys.counts(sessionId) })
    },
  })
}

// 商品を追加
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => api.createProduct(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.list() })
    },
  })
}

// SKUを追加
export function useCreateSKU() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, price }: { productId: number; price: number }) =>
      api.createSKU(productId, price),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.skus(productId) })
    },
  })
}

// SKUを削除
export function useDeleteSKU() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (skuId: number) => api.deleteSKU(skuId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

// セッションを開始
export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.createSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

// セッションを完了
export function useCompleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: number) => api.completeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

// セッションのロック一覧を取得
export function useSessionLocks(sessionId: number | undefined) {
  return useQuery({
    queryKey: sessionKeys.locks(sessionId!),
    queryFn: async () => {
      const data = await api.getSessionLocks(sessionId!)
      // productIdのSetに変換
      const lockedProductIds = new Set<number>()
      if (Array.isArray(data)) {
        data.forEach((lock) => {
          lockedProductIds.add(lock.productId)
        })
      }
      return lockedProductIds
    },
    enabled: !!sessionId,
  })
}

// 商品をロック
export function useLockProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, productId }: { sessionId: number; productId: number }) =>
      api.lockProduct(sessionId, productId),
    onMutate: async ({ sessionId, productId }) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.locks(sessionId) })

      const previousLocks = queryClient.getQueryData<Set<number>>(sessionKeys.locks(sessionId))

      queryClient.setQueryData<Set<number>>(
        sessionKeys.locks(sessionId),
        (old) => new Set([...(old || []), productId])
      )

      return { previousLocks }
    },
    onError: (_err, { sessionId }, context) => {
      if (context?.previousLocks) {
        queryClient.setQueryData(sessionKeys.locks(sessionId), context.previousLocks)
      }
    },
    onSettled: (_data, _error, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.locks(sessionId) })
    },
  })
}

// 商品のロックを解除
export function useUnlockProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, productId }: { sessionId: number; productId: number }) =>
      api.unlockProduct(sessionId, productId),
    onMutate: async ({ sessionId, productId }) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.locks(sessionId) })

      const previousLocks = queryClient.getQueryData<Set<number>>(sessionKeys.locks(sessionId))

      queryClient.setQueryData<Set<number>>(
        sessionKeys.locks(sessionId),
        (old) => {
          const newSet = new Set(old)
          newSet.delete(productId)
          return newSet
        }
      )

      return { previousLocks }
    },
    onError: (_err, { sessionId }, context) => {
      if (context?.previousLocks) {
        queryClient.setQueryData(sessionKeys.locks(sessionId), context.previousLocks)
      }
    },
    onSettled: (_data, _error, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.locks(sessionId) })
    },
  })
}
