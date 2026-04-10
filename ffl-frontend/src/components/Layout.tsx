import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom'
import { Button } from '@heroui/react'
import { useAuth } from '../context/AuthContext'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useSystemInfo } from '../hooks/useSystemInfo'
import { getVersionString } from '../version'

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const { data: season } = useCurrentSeason()
  const { data: systemInfo } = useSystemInfo()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const envColor = systemInfo?.environment === 'PROD' ? 'text-blue-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-[#0f1419]" style={!isAuthenticated ? { backgroundImage: "url('/background.png')", backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a2028] border-b border-[#2d3748] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <RouterLink to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <svg width="44" height="44" viewBox="0 0 44 44" className="drop-shadow-lg">
                  <circle cx="22" cy="22" r="20" fill="#c9a66b" className="transition-all group-hover:fill-[#d4b77a]"/>
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#0f1419" strokeWidth="2"/>
                  <circle cx="22" cy="22" r="12" fill="none" stroke="#0f1419" strokeWidth="1.5"/>
                  <path d="M22 4 L22 10" stroke="#0f1419" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M22 34 L22 40" stroke="#0f1419" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M4 22 L10 22" stroke="#0f1419" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M34 22 L40 22" stroke="#0f1419" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="22" cy="22" r="3" fill="#0f1419"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-bold text-[#c9a66b] group-hover:text-[#d4b77a] transition-colors tracking-wide">
                  FFL{season && <span className="text-[#6b7280]"> {season.name}</span>}
                </span>
                <span className="hidden md:block text-xs text-[#6b7280] -mt-1 tracking-widest">
                  FANTASY FOOTBALL LEAGUE
                </span>
              </div>
            </RouterLink>
            <nav className="hidden md:flex gap-6 items-center">
              {isAuthenticated && user?.role === 'ADMIN' && (
                <>
                  <RouterLink to="/season" className="text-[#a0aec0] hover:text-[#c9a66b] link transition-colors">
                    Saison
                  </RouterLink>
                  <RouterLink to="/games" className="text-[#a0aec0] hover:text-[#c9a66b] link transition-colors">
                    Spiele
                  </RouterLink>
                  <RouterLink to="/users" className="text-[#a0aec0] hover:text-[#c9a66b] link transition-colors">
                    Benutzer
                  </RouterLink>
                </>
              )}
              <RouterLink to="/teams" className="text-[#a0aec0] hover:text-[#c9a66b] link transition-colors">
                Teams
              </RouterLink>
              <RouterLink to="/players" className="text-[#a0aec0] hover:text-[#c9a66b] link transition-colors">
                Spieler
              </RouterLink>
              <RouterLink to="/managers" className="text-[#a0aec0] hover:text-[#c9a66b] link transition-colors">
                Manager
              </RouterLink>
              <RouterLink to="/manager-groups" className="text-[#a0aec0] hover:text-[#c9a66b] link transition-colors">
                Gruppen
              </RouterLink>
            </nav>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 md:gap-4">
                {isAuthenticated ? (
                  <>
                    <span className="hidden md:inline text-sm text-[#a0aec0]">{user?.login} ({user?.role === 'ADMIN' ? 'Admin' : 'User'})</span>
                    <span className="md:hidden text-xs text-[#a0aec0]">{user?.login}</span>
                    <Button size="sm" variant="secondary" onPress={handleLogout} className="h-7 px-3 text-xs">
                      Abmelden
                    </Button>
                  </>
                ) : (
                  <>
                    <RouterLink to="/login" className="text-[#a0aec0] hover:text-[#c9a66b] link transition-colors">
                      Anmelden
                    </RouterLink>
                    {season?.seasonState === 'BEFORE_SEASON' && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 px-3 text-xs"
                      >
                        Registrieren
                      </Button>
                    )}
                  </>
                )}
              </div>
              <span className="hidden md:block text-xs mt-1 tracking-widest">
                <span className={envColor}>{systemInfo?.environment || 'TEST'}</span>
                <span className="text-[#6b7280] ml-2">{getVersionString()}</span>
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8 pt-20">
        <Outlet />
      </main>
    </div>
  )
}
