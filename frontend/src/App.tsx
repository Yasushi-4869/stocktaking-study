import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SimpleHeader, WorkspaceHeader } from './components/Header'
import { HomePage } from './pages/HomePage'
import { InventoryPage } from './pages/InventoryPage'
import { SummaryPage } from './pages/SummaryPage'
import { ProductsPage } from './pages/ProductsPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { SessionCompletePage } from './pages/SessionCompletePage'

// ホーム系のレイアウト（シンプルヘッダー）
function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SimpleHeader />
      {children}
    </>
  )
}

// ワークスペース系のレイアウト（サブナビ付きヘッダー）
function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WorkspaceHeader />
      {children}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ホーム系 */}
        <Route path="/" element={<HomeLayout><HomePage /></HomeLayout>} />
        <Route path="/sessions/:id" element={<HomeLayout><SessionDetailPage /></HomeLayout>} />
        <Route path="/sessions/:id/complete" element={<HomeLayout><SessionCompletePage /></HomeLayout>} />

        {/* ワークスペース系 */}
        <Route path="/inventory" element={<WorkspaceLayout><InventoryPage /></WorkspaceLayout>} />
        <Route path="/summary" element={<WorkspaceLayout><SummaryPage /></WorkspaceLayout>} />
        <Route path="/products" element={<WorkspaceLayout><ProductsPage /></WorkspaceLayout>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
