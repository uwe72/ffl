import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
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
      <div className="min-h-screen flex flex-col bg-background">
        <header className="h-14 shrink-0 bg-header border-b border-border">
          <div className="h-full w-full max-w-[1440px] mx-auto px-[30px] flex items-center justify-between">
            <Link to="/players" className="flex items-center gap-2 min-w-0">
              <img src="/icon-192.png" alt="" aria-hidden="true" className="w-8 h-8 rounded-control shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate">Fantasy Football League</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline font-semibold"
            >
              <i className="sap-icon sap-icon-log text-base" />
              Anmelden
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-y-auto bg-page pt-[30px] pb-4 md:pb-6">
          <div className="w-full max-w-[1440px] mx-auto px-[30px]">
            <Outlet />
          </div>
        </main>
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
