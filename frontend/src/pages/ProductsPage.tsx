import { useState, useEffect } from 'react'
import { Product, SKU, SKUDetail } from '../types/product'
import * as api from '../api/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [expandedProductIds, setExpandedProductIds] = useState<Set<number>>(new Set())
  const [productSKUs, setProductSKUs] = useState<Record<number, SKU[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isSKUDialogOpen, setIsSKUDialogOpen] = useState(false)
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false)
  const [isDeleteProductDialogOpen, setIsDeleteProductDialogOpen] = useState(false)
  const [isDeleteSKUDialogOpen, setIsDeleteSKUDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingProductForSKU, setEditingProductForSKU] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [deletingSKU, setDeletingSKU] = useState<{ productId: number; skuId: number } | null>(null)
  const [newProductName, setNewProductName] = useState('')
  const [newSKUPrice, setNewSKUPrice] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)

      const [productsData, allSKUsData] = await Promise.all([
        api.getProducts(),
        api.getAllSKUs(),
      ])

      setProducts(productsData)

      const skusByProduct: Record<number, SKU[]> = {}
      allSKUsData.forEach((skuDetail: SKUDetail) => {
        if (!skusByProduct[skuDetail.productId]) {
          skusByProduct[skuDetail.productId] = []
        }
        skusByProduct[skuDetail.productId].push({
          id: skuDetail.skuId,
          productId: skuDetail.productId,
          price: skuDetail.price,
          createdAt: '',
          updatedAt: '',
        })
      })
      setProductSKUs(skusByProduct)
    } catch (err) {
      setError('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleExpand = (productId: number) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return

    try {
      const product = await api.createProduct(newProductName.trim())
      setProducts((prev) => [...prev, product])
      setNewProductName('')
      setIsProductDialogOpen(false)
    } catch (err) {
      setError('商品の追加に失敗しました')
    }
  }

  const handleEditProduct = async () => {
    if (!editingProduct || !newProductName.trim()) return

    try {
      const updated = await api.updateProduct(editingProduct.id, newProductName.trim())
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      )
      setNewProductName('')
      setEditingProduct(null)
      setIsEditProductDialogOpen(false)
    } catch (err) {
      setError('商品の更新に失敗しました')
    }
  }

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product)
    setIsDeleteProductDialogOpen(true)
  }

  const confirmDeleteProduct = async () => {
    if (!deletingProduct) return

    try {
      await api.deleteProduct(deletingProduct.id)
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id))
    } catch (err) {
      setError('商品の削除に失敗しました')
    } finally {
      setIsDeleteProductDialogOpen(false)
      setDeletingProduct(null)
    }
  }

  const handleAddSKU = async () => {
    if (!editingProductForSKU || !newSKUPrice) return

    const price = parseInt(newSKUPrice, 10)
    if (isNaN(price) || price < 0) return

    try {
      const sku = await api.createSKU(editingProductForSKU.id, price)
      setProductSKUs((prev) => ({
        ...prev,
        [editingProductForSKU.id]: [...(prev[editingProductForSKU.id] || []), sku],
      }))
      setNewSKUPrice('')
      setEditingProductForSKU(null)
      setIsSKUDialogOpen(false)
    } catch (err) {
      setError('価格の追加に失敗しました')
    }
  }

  const handleDeleteSKU = (productId: number, skuId: number) => {
    setDeletingSKU({ productId, skuId })
    setIsDeleteSKUDialogOpen(true)
  }

  const confirmDeleteSKU = async () => {
    if (!deletingSKU) return

    try {
      await api.deleteSKU(deletingSKU.skuId)
      setProductSKUs((prev) => ({
        ...prev,
        [deletingSKU.productId]: prev[deletingSKU.productId].filter(
          (sku) => sku.id !== deletingSKU.skuId
        ),
      }))
    } catch (err) {
      setError('価格の削除に失敗しました')
    } finally {
      setIsDeleteSKUDialogOpen(false)
      setDeletingSKU(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setNewProductName(product.name)
    setIsEditProductDialogOpen(true)
  }

  const openSKUDialog = (product: Product) => {
    setEditingProductForSKU(product)
    setNewSKUPrice('')
    setIsSKUDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background p-4 md:p-6">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          読み込み中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
            {error}
            <button onClick={() => setError(null)} className="text-destructive hover:opacity-70">×</button>
          </div>
        )}

        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">商品管理</h2>
            <p className="text-sm text-muted-foreground mt-1">{products.length}件の商品</p>
          </div>
          <Button
            size="lg"
            onClick={() => {
              setNewProductName('')
              setIsProductDialogOpen(true)
            }}
          >
            + 商品を追加
          </Button>
        </div>

        <div className="space-y-3">
          {products.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center border border-border">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">商品がありません</h3>
              <p className="text-muted-foreground">「商品を追加」ボタンから、棚卸しする商品を登録してください。</p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <div
                  className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleToggleExpand(product.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {expandedProductIds.has(product.id) ? '▼' : '▶'}
                    </span>
                    <h3 className="font-semibold text-foreground">{product.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {productSKUs[product.id]?.length || 0}件の価格
                    </span>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(product)}
                      title="編集"
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProduct(product)}
                      title="削除"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>

                {expandedProductIds.has(product.id) && (
                  <div className="border-t border-border">
                    <div className="px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide bg-muted/30">
                      価格一覧
                    </div>
                    {!productSKUs[product.id] || productSKUs[product.id].length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        価格が登録されていません
                      </div>
                    ) : (
                      <div>
                        {productSKUs[product.id]?.map((sku) => (
                          <div
                            key={sku.id}
                            className="flex justify-between items-center px-4 py-2 border-b border-border last:border-b-0"
                          >
                            <span className="font-mono">{formatPrice(sku.price)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => handleDeleteSKU(product.id, sku.id)}
                              title="削除"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-muted-foreground font-medium transition-all hover:text-primary hover:bg-primary/5 border-t border-border"
                      onClick={() => openSKUDialog(product)}
                    >
                      <span>+ 価格を追加</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>商品を追加</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAddProduct()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="addProductName">商品名</Label>
              <Input
                id="addProductName"
                type="text"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="例: 靴"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsProductDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={!newProductName.trim()}>
                追加
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog
        open={isEditProductDialogOpen}
        onOpenChange={(open) => {
          setIsEditProductDialogOpen(open)
          if (!open) setEditingProduct(null)
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>商品を編集</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleEditProduct()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="editProductName">商品名</Label>
              <Input
                id="editProductName"
                type="text"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="例: 靴"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditProductDialogOpen(false)
                  setEditingProduct(null)
                }}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={!newProductName.trim()}>
                更新
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add SKU Dialog */}
      <Dialog
        open={isSKUDialogOpen}
        onOpenChange={(open) => {
          setIsSKUDialogOpen(open)
          if (!open) setEditingProductForSKU(null)
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>価格を追加 - {editingProductForSKU?.name || ''}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAddSKU()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="skuPrice">価格（円）</Label>
              <Input
                id="skuPrice"
                type="number"
                value={newSKUPrice}
                onChange={(e) => setNewSKUPrice(e.target.value)}
                placeholder="例: 1600"
                min="0"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsSKUDialogOpen(false)
                  setEditingProductForSKU(null)
                }}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={!newSKUPrice}>
                追加
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Product AlertDialog */}
      <AlertDialog
        open={isDeleteProductDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteProductDialogOpen(open)
          if (!open) setDeletingProduct(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品の削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingProduct?.name}」を削除しますか？
              関連する価格も全て削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProduct}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete SKU AlertDialog */}
      <AlertDialog
        open={isDeleteSKUDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteSKUDialogOpen(open)
          if (!open) setDeletingSKU(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>価格の削除</AlertDialogTitle>
            <AlertDialogDescription>
              この価格を削除しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSKU}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
