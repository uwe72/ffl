import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import HeroSection from './HeroSection'

export default function Layout() {
  const { isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

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

        <main className="flex-1 min-w-0 overflow-y-auto bg-page pt-3 pb-4 md:pb-6">
          <div className="w-full max-w-[1440px] px-3">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
