import { Product } from '../types/product'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Lock, Unlock } from 'lucide-react'

interface SidebarProps {
  products: Product[]
  selectedProductId: number | null
  lockedProductIds: Set<number>
  onSelectProduct: (id: number) => void
  onAddProduct: () => void
  onFinishInventory: () => void
  onToggleLock: (productId: number, isLocked: boolean) => void
}

export function Sidebar({
  products,
  selectedProductId,
  lockedProductIds,
  onSelectProduct,
  onAddProduct,
  onFinishInventory,
  onToggleLock,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-muted border-r border-border flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 md:w-64 max-md:w-full max-md:h-auto max-md:relative max-md:top-0 max-md:border-r-0 max-md:border-b">
      <div className="p-4 border-b border-border">
        <Button
          onClick={onFinishInventory}
          className="w-full bg-success hover:bg-success/90 text-white"
          size="lg"
        >
          <span className="text-lg mr-2">✓</span>
          棚卸しを終了
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 max-md:max-h-[200px]">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
          商品リスト
        </div>

        <div className="flex flex-col gap-1 max-md:flex-row max-md:flex-wrap">
          {products.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              商品がありません
            </div>
          ) : (
            products.map((product) => {
              const isLocked = lockedProductIds.has(product.id)
              return (
                <div
                  key={product.id}
                  className={cn(
                    "flex items-center gap-2 w-full p-2 bg-transparent rounded-lg transition-all",
                    "max-md:w-auto",
                    selectedProductId === product.id && "bg-card shadow-sm"
                  )}
                >
                  <button
                    className={cn(
                      "flex items-center gap-3 flex-1 p-1 bg-transparent rounded text-left cursor-pointer hover:bg-background/50",
                      "max-md:px-2 max-md:py-1"
                    )}
                    onClick={() => onSelectProduct(product.id)}
                  >
                    <span className={cn(
                      "text-sm text-muted-foreground",
                      selectedProductId === product.id && "text-primary"
                    )}>
                      {selectedProductId === product.id ? '●' : '○'}
                    </span>
                    <span className="font-medium text-[15px] text-foreground flex-1">
                      {product.name}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleLock(product.id, isLocked)
                    }}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      isLocked
                        ? "text-amber-600 bg-amber-100 hover:bg-amber-200"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title={isLocked ? 'ロック解除' : 'ロック'}
                  >
                    {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <button
          className="w-full flex items-center justify-center gap-2 p-3 bg-transparent border-2 border-dashed border-border rounded-lg text-muted-foreground font-medium transition-all hover:border-primary hover:text-primary hover:bg-primary/5"
          onClick={onAddProduct}
        >
          <span className="text-xl font-light">+</span>
          商品を追加
        </button>
      </div>
    </aside>
  )
}
