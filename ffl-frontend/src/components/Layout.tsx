import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import HeroSection from './HeroSection'

const SIDEBAR_COLLAPSED_KEY = 'ffl-sidebar-collapsed'

export default function Layout() {
  const { isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return stored === 'true'
  })

  const handleToggleCollapse = (next: boolean) => {
    setCollapsed(next)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <HeroSection collapsed={collapsed} onMenuClick={() => setMobileOpen(true)} />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <main className="flex-1 min-w-0 overflow-y-auto bg-page pt-[30px] pb-4 md:pb-6">
          <div className="w-full max-w-[1440px] px-[30px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
