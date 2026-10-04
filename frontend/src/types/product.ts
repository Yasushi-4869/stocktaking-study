export interface Product {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

export interface SKU {
  id: number
  productId: number
  price: number
  createdAt: string
  updatedAt: string
}

export interface SKUDetail {
  skuId: number
  productId: number
  productName: string
  price: number
}

export interface CountItem {
  id: number
  sessionId: number
  skuId: number
  quantity: number
  userId: number | null
  updatedAt: string
}

export interface CountItemWithSKU {
  id: number
  sessionId: number
  skuId: number
  productId: number
  productName: string
  price: number
  quantity: number
  userId: number | null
  updatedAt: string
}

export type SessionStatus = 'in_progress' | 'completed'

export interface Session {
  id: number
  name: string
  status: SessionStatus
  startedAt: string
  completedAt: string | null
}

export interface SessionWithStats extends Session {
  totalCount: number
  totalAmount: number
}

export interface ProductLock {
  id: number
  sessionId: number
  productId: number
  lockedAt: string
}
