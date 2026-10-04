import { useState, useEffect } from 'react'
import { SKU } from '../types/product'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SKUCardProps {
  sku: SKU
  count: number
  isLocked?: boolean
  onCountChange: (count: number) => void
  onDelete: () => void
}

export function SKUCard({ sku, count, isLocked = false, onCountChange, onDelete }: SKUCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(count.toString())

  // countが外部から変更されたら入力値も更新
  useEffect(() => {
    if (!isEditing) {
      setInputValue(count.toString())
    }
  }, [count, isEditing])

  const handleIncrement = () => {
    onCountChange(count + 1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    const newCount = parseInt(inputValue, 10)
    if (!isNaN(newCount) && newCount >= 0) {
      onCountChange(newCount)
    } else {
      setInputValue(count.toString())
    }
    setIsEditing(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur()
    }
    if (e.key === 'Escape') {
      setInputValue(count.toString())
      setIsEditing(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price)
  }

  return (
    <div className={cn(
      "bg-card rounded-xl p-4 md:p-6 shadow-sm border border-border transition-all hover:shadow-md animate-slide-up",
      isLocked && "bg-amber-50 border-amber-200 opacity-75"
    )}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="font-mono text-xl md:text-2xl font-bold text-foreground tracking-tight">
            {formatPrice(sku.price)}
          </div>
          {isLocked && (
            <span className="text-amber-600 text-sm">🔒</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          title={isLocked ? 'ロック中' : '削除'}
          disabled={isLocked}
          className={cn(
            "opacity-40 hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            isLocked && "cursor-not-allowed opacity-20 hover:opacity-20"
          )}
        >
          ×
        </Button>
      </div>

      {/* Body */}
      <div className="flex items-center gap-4 md:gap-6 mb-4">
        <div className="flex items-baseline gap-2 flex-1">
          {isEditing ? (
            <Input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              autoFocus
              min="0"
              className="w-24 md:w-32 text-3xl md:text-5xl font-bold h-auto py-2"
            />
          ) : (
            <button
              onClick={() => {
                if (!isLocked) {
                  setIsEditing(true)
                  setInputValue(count.toString())
                }
              }}
              title={isLocked ? 'ロック中' : 'クリックで直接入力'}
              disabled={isLocked}
              className={cn(
                "font-mono text-4xl md:text-5xl font-bold text-foreground",
                "bg-transparent border-none p-2 rounded-lg",
                "min-w-[80px] md:min-w-[100px] text-center transition-all",
                isLocked
                  ? "cursor-not-allowed"
                  : "cursor-pointer hover:bg-secondary"
              )}
            >
              {count}
            </button>
          )}
          <span className="text-base md:text-lg text-muted-foreground font-medium">
            個
          </span>
        </div>

        <button
          onClick={handleIncrement}
          disabled={isLocked}
          className={cn(
            "w-16 h-16 md:w-20 md:h-20 flex items-center justify-center",
            "bg-primary text-primary-foreground rounded-xl",
            "transition-all",
            "flex-shrink-0",
            isLocked
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-primary/90 hover:scale-105 active:scale-95"
          )}
        >
          <span className="font-mono text-xl md:text-2xl font-bold">+1</span>
        </button>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border">
        <span className="text-sm text-muted-foreground">
          小計: {formatPrice(sku.price * count)}
        </span>
      </div>
    </div>
  )
}
