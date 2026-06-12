import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import HeroSection from './HeroSection'
import { usePWAInstall } from '../hooks/usePWAInstall'

export default function Layout() {
  const { isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isInstallable, install } = usePWAInstall()

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <HeroSection onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <div className="max-w-[1472px] mx-auto">
            <Outlet />
          </div>
        </main>

        {isInstallable && (
          <div className="fixed bottom-4 right-4 z-40">
            <button
              onClick={install}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-button-primary-hover transition-colors shadow-lg text-sm font-medium"
            >
              Installieren
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
