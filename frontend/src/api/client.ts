import { Product, SKU, SKUDetail, Session, SessionWithStats, CountItem, CountItemWithSKU, ProductLock } from '../types/product'

const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || 'エラーが発生しました')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// Products
export const getProducts = () => request<Product[]>('/products')

export const getProduct = (id: number) => request<Product>(`/products/${id}`)

export const createProduct = (name: string) =>
  request<Product>('/products', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

export const updateProduct = (id: number, name: string) =>
  request<Product>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })

export const deleteProduct = (id: number) =>
  request<void>(`/products/${id}`, { method: 'DELETE' })

// SKUs
export const getAllSKUs = () => request<SKUDetail[]>('/skus')

export const getProductSKUs = (productId: number) =>
  request<SKU[]>(`/products/${productId}/skus`)

export const createSKU = (productId: number, price: number) =>
  request<SKU>(`/products/${productId}/skus`, {
    method: 'POST',
    body: JSON.stringify({ price }),
  })

export const updateSKU = (id: number, price: number) =>
  request<SKU>(`/skus/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ price }),
  })

export const deleteSKU = (id: number) =>
  request<void>(`/skus/${id}`, { method: 'DELETE' })

// Sessions
export const getSessions = () => request<SessionWithStats[]>('/sessions')

export const getCurrentSession = () => request<SessionWithStats | null>('/sessions/current')

export const createSession = () =>
  request<Session>('/sessions', { method: 'POST' })

export const getSession = (id: number) => request<SessionWithStats>(`/sessions/${id}`)

export const completeSession = (id: number) =>
  request<Session>(`/sessions/${id}/complete`, { method: 'PUT' })

// Counts
export const getSessionCounts = (sessionId: number) =>
  request<CountItemWithSKU[]>(`/sessions/${sessionId}/counts`)

export const upsertCount = (sessionId: number, skuId: number, quantity: number) =>
  request<CountItem>(`/sessions/${sessionId}/counts`, {
    method: 'POST',
    body: JSON.stringify({ skuId, quantity }),
  })

// Locks
export const getSessionLocks = (sessionId: number) =>
  request<ProductLock[]>(`/sessions/${sessionId}/locks`)

export const lockProduct = (sessionId: number, productId: number) =>
  request<ProductLock>(`/sessions/${sessionId}/locks`, {
    method: 'POST',
    body: JSON.stringify({ productId }),
  })

export const unlockProduct = (sessionId: number, productId: number) =>
  request<void>(`/sessions/${sessionId}/locks/${productId}`, {
    method: 'DELETE',
  })
