import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { SKUCard } from '../components/SKUCard'
import {
  useCurrentSession,
  useCreateSession,
  useSessionCounts,
  useSessionLocks,
  useProducts,
  useProductSKUs,
  useCreateProduct,
  useCreateSKU,
  useDeleteSKU,
  useUpsertCount,
  useCompleteSession,
  useLockProduct,
  useUnlockProduct,
} from '@/features/inventory/hooks/useInventory'
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

export function InventoryPage() {
  const navigate = useNavigate()
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // TanStack Query hooks
  const { data: session, isLoading: sessionLoading, error: sessionError } = useCurrentSession()
  const { data: counts = {}, error: countsError } = useSessionCounts(session?.id)
  const { data: lockedProductIds = new Set<number>(), error: locksError } = useSessionLocks(session?.id)
  const { data: products = [], isLoading: productsLoading, error: productsError } = useProducts()
  const { data: skus = [], isLoading: skusLoading, error: skusError } = useProductSKUs(selectedProductId)

  // クエリエラーを集約
  const queryError = sessionError || countsError || locksError || productsError || skusError

  // Mutations
  const createSessionMutation = useCreateSession()
  const createProductMutation = useCreateProduct()
  const createSKUMutation = useCreateSKU()
  const deleteSKUMutation = useDeleteSKU()
  const upsertCountMutation = useUpsertCount()
  const completeSessionMutation = useCompleteSession()
  const lockProductMutation = useLockProduct()
  const unlockProductMutation = useUnlockProduct()

  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isSKUDialogOpen, setIsSKUDialogOpen] = useState(false)
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false)
  const [isDeleteSKUDialogOpen, setIsDeleteSKUDialogOpen] = useState(false)
  const [deletingSKUId, setDeletingSKUId] = useState<number | null>(null)
  const [newProductName, setNewProductName] = useState('')
  const [newSKUPrice, setNewSKUPrice] = useState('')
  const [newSKUQuantity, setNewSKUQuantity] = useState('1')
  const [dialogError, setDialogError] = useState<string | null>(null)

  // Ref for scrolling
  const skuListEndRef = useRef<HTMLDivElement>(null)

  // 最初の商品を自動選択
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id)
    }
  }, [products, selectedProductId])

  const scrollToBottom = () => {
    setTimeout(() => {
      skuListEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return

    try {
      const product = await createProductMutation.mutateAsync(newProductName.trim())
      setSelectedProductId(product.id)
      setNewProductName('')
      setIsProductDialogOpen(false)
    } catch (err) {
      setError('商品の追加に失敗しました')
    }
  }

  const handleAddSKU = async () => {
    setDialogError(null)
    if (!selectedProductId) {
      setDialogError('商品が選択されていません')
      return
    }
    if (!newSKUPrice) return

    const price = parseInt(newSKUPrice, 10)
    if (isNaN(price) || price < 0) {
      setDialogError('有効な価格を入力してください')
      return
    }

    const quantity = parseInt(newSKUQuantity, 10) || 1

    // 同じ価格のSKUが既に存在するかチェック
    const existingSKU = skus.find((sku) => sku.price === price)
    if (existingSKU && session) {
      const newCount = (counts[existingSKU.id] || 0) + quantity
      upsertCountMutation.mutate({
        sessionId: session.id,
        skuId: existingSKU.id,
        quantity: newCount,
      })
      setNewSKUPrice('')
      setNewSKUQuantity('1')
      setIsSKUDialogOpen(false)
      scrollToBottom()
      return
    }

    try {
      const sku = await createSKUMutation.mutateAsync({ productId: selectedProductId, price })
      if (session) {
        await upsertCountMutation.mutateAsync({
          sessionId: session.id,
          skuId: sku.id,
          quantity,
        })
      }
      setNewSKUPrice('')
      setNewSKUQuantity('1')
      setIsSKUDialogOpen(false)
      scrollToBottom()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : '価格の追加に失敗しました')
    }
  }

  const handleDeleteSKU = (skuId: number) => {
    setDeletingSKUId(skuId)
    setIsDeleteSKUDialogOpen(true)
  }

  const confirmDeleteSKU = async () => {
    if (deletingSKUId === null) return

    try {
      await deleteSKUMutation.mutateAsync(deletingSKUId)
    } catch (err) {
      setError('価格の削除に失敗しました')
    } finally {
      setIsDeleteSKUDialogOpen(false)
      setDeletingSKUId(null)
    }
  }

  const handleCountChange = (skuId: number, count: number) => {
    if (!session) return
    upsertCountMutation.mutate({
      sessionId: session.id,
      skuId,
      quantity: count,
    })
  }

  const handleFinishInventory = () => {
    setIsFinishDialogOpen(true)
  }

  const confirmFinishInventory = async () => {
    if (!session) return

    try {
      await completeSessionMutation.mutateAsync(session.id)
      navigate(`/sessions/${session.id}/complete`)
    } catch (err) {
      setError('棚卸し終了処理に失敗しました')
    }
  }

  const handleToggleLock = (productId: number, isLocked: boolean) => {
    if (!session) return

    if (isLocked) {
      unlockProductMutation.mutate({ sessionId: session.id, productId })
    } else {
      lockProductMutation.mutate({ sessionId: session.id, productId })
    }
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const isSelectedProductLocked = selectedProductId !== null && lockedProductIds.has(selectedProductId)
  const isLoading = sessionLoading || productsLoading

  const handleStartSession = async () => {
    try {
      await createSessionMutation.mutateAsync()
    } catch (err) {
      setError('セッションの開始に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          読み込み中...
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <div className="text-5xl">📋</div>
          <h2 className="text-xl font-semibold text-foreground">進行中の棚卸しがありません</h2>
          <p className="text-muted-foreground text-center">新しい棚卸しを開始してください</p>
          <Button
            size="lg"
            onClick={handleStartSession}
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? '開始中...' : '棚卸しを開始'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-background max-md:flex-col">
      <Sidebar
        products={products}
        selectedProductId={selectedProductId}
        lockedProductIds={lockedProductIds}
        onSelectProduct={setSelectedProductId}
        onAddProduct={() => setIsProductDialogOpen(true)}
        onFinishInventory={handleFinishInventory}
        onToggleLock={handleToggleLock}
      />

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {(error || queryError) && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
            {error || (queryError instanceof Error ? queryError.message : 'データの取得に失敗しました')}
            <button onClick={() => setError(null)} className="text-destructive hover:opacity-70">×</button>
          </div>
        )}

        {session && (
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              セッション #{session.id}
            </span>
            <span className="text-sm text-muted-foreground">
              開始: {new Date(session.startedAt).toLocaleString('ja-JP')}
            </span>
          </div>
        )}

        {selectedProduct ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">{selectedProduct.name}</h2>
              <div className="text-sm text-muted-foreground mt-1">
                {skusLoading ? '読み込み中...' : `${skus.length}件の価格`}
              </div>
            </div>

            <div className="space-y-3">
              {skus.map((sku) => (
                <SKUCard
                  key={sku.id}
                  sku={sku}
                  count={counts[sku.id] || 0}
                  isLocked={isSelectedProductLocked}
                  onCountChange={(count) => handleCountChange(sku.id, count)}
                  onDelete={() => handleDeleteSKU(sku.id)}
                />
              ))}

              <div ref={skuListEndRef} />

              <button
                className={`w-full flex items-center justify-center gap-2 p-4 bg-transparent border-2 border-dashed rounded-xl font-medium transition-all ${
                  isSelectedProductLocked
                    ? 'border-muted text-muted-foreground/50 cursor-not-allowed'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5'
                }`}
                onClick={() => !isSelectedProductLocked && setIsSKUDialogOpen(true)}
                disabled={isSelectedProductLocked}
              >
                <span className="text-xl font-light">+</span>
                <span>{isSelectedProductLocked ? 'ロック中' : '価格を追加'}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">商品を選択してください</h3>
            <p className="text-muted-foreground">左のリストから商品を選択するか、新しい商品を追加してください。</p>
          </div>
        )}
      </main>

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
              <Label htmlFor="productName">商品名</Label>
              <Input
                id="productName"
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
              <Button
                type="submit"
                disabled={!newProductName.trim() || createProductMutation.isPending}
              >
                {createProductMutation.isPending ? '追加中...' : '追加'}
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
          if (!open) {
            setNewSKUQuantity('1')
            setDialogError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>価格を追加</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAddSKU()
            }}
            className="space-y-4"
          >
            {dialogError && (
              <div className="text-sm text-destructive">{dialogError}</div>
            )}
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
            <div className="space-y-2">
              <Label htmlFor="skuQuantity">個数</Label>
              <Input
                id="skuQuantity"
                type="number"
                value={newSKUQuantity}
                onChange={(e) => setNewSKUQuantity(e.target.value)}
                placeholder="1"
                min="1"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsSKUDialogOpen(false)
                  setNewSKUQuantity('1')
                  setDialogError(null)
                }}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={!newSKUPrice || createSKUMutation.isPending}
              >
                {createSKUMutation.isPending ? '追加中...' : '追加'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Finish Inventory AlertDialog */}
      <AlertDialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>棚卸し終了</AlertDialogTitle>
            <AlertDialogDescription>
              棚卸しを終了しますか？
              現在のカウントが保存され、新しいセッションが開始されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFinishInventory}
              disabled={completeSessionMutation.isPending}
            >
              {completeSessionMutation.isPending ? '処理中...' : '終了する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete SKU AlertDialog */}
      <AlertDialog
        open={isDeleteSKUDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteSKUDialogOpen(open)
          if (!open) setDeletingSKUId(null)
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
            <AlertDialogAction
              onClick={confirmDeleteSKU}
              disabled={deleteSKUMutation.isPending}
            >
              {deleteSKUMutation.isPending ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
