import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ホーム、セッション詳細用のシンプルなヘッダー
export function SimpleHeader() {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm max-md:px-3">
      <NavLink to="/" className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity">
        <span className="text-2xl">📦</span>
        <span className="font-bold text-lg text-foreground tracking-tight max-md:hidden">
          棚卸しアプリ
        </span>
      </NavLink>

      <div className="flex-1" />

      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
        <span className="text-lg">👤</span>
        <span className="font-medium text-sm text-foreground max-md:hidden">ゲスト</span>
      </div>
    </header>
  )
}

// 棚卸しワークスペース用のヘッダー（サブナビ付き）
export function WorkspaceHeader() {
  const navigate = useNavigate()

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm max-md:px-3">
      <NavLink to="/" className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity">
        <span className="text-2xl">📦</span>
        <span className="font-bold text-lg text-foreground tracking-tight max-md:hidden">
          棚卸しアプリ
        </span>
      </NavLink>

      <nav className="flex gap-1">
        <NavLink
          to="/inventory"
          className={({ isActive }) => cn(
            "px-3 py-2 rounded-lg text-muted-foreground font-medium text-[15px] transition-all hover:bg-muted hover:text-foreground",
            "max-md:px-2 max-md:text-[13px]",
            isActive && "bg-primary text-white hover:bg-primary hover:text-white"
          )}
        >
          棚卸し
        </NavLink>
        <NavLink
          to="/summary"
          className={({ isActive }) => cn(
            "px-3 py-2 rounded-lg text-muted-foreground font-medium text-[15px] transition-all hover:bg-muted hover:text-foreground",
            "max-md:px-2 max-md:text-[13px]",
            isActive && "bg-primary text-white hover:bg-primary hover:text-white"
          )}
        >
          集計
        </NavLink>
        <NavLink
          to="/products"
          className={({ isActive }) => cn(
            "px-3 py-2 rounded-lg text-muted-foreground font-medium text-[15px] transition-all hover:bg-muted hover:text-foreground",
            "max-md:px-2 max-md:text-[13px]",
            isActive && "bg-primary text-white hover:bg-primary hover:text-white"
          )}
        >
          商品管理
        </NavLink>
      </nav>

      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/')}
        className="max-md:px-2 max-md:text-xs"
      >
        ホームに戻る
      </Button>
    </header>
  )
}

// 後方互換のためデフォルトエクスポート
export function Header() {
  return <SimpleHeader />
}
