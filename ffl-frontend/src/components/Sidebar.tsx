import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, Shield, Users, UserCheck, UsersRound, Settings, Server, MessageSquare } from 'lucide-react'
import SidebarItem from './SidebarItem'
import { useAuth } from '../context/AuthContext'

const SIDEBAR_COLLAPSED_KEY = 'ffl-sidebar-collapsed'

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return stored === 'true'
  })
  const [verwaltungExpanded, setVerwaltungExpanded] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()

  const isOnVerwaltung = location.pathname.startsWith('/season') ||
    location.pathname.startsWith('/games') ||
    location.pathname.startsWith('/users') ||
    location.pathname.startsWith('/emails')
  const effectiveVerwaltungExpanded = verwaltungExpanded || isOnVerwaltung

  const handleToggleCollapse = (next: boolean) => {
    setCollapsed(next)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className={`px-4 py-4 border-b border-border ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <img src="/menubar.png" alt="FFL" className="w-[90px] h-[90px] rounded object-contain" />
        ) : (
          <div className="flex items-center gap-3">
            <img src="/menubar.png" alt="FFL" className="w-[90px] h-[90px] rounded object-contain" />
            <div className="flex flex-col min-w-0 gap-1">
              <span className="text-lg font-bold text-accent tracking-wide truncate">FFL</span>
              <span className="text-xs text-subtle tracking-widest">FANTASY FOOTBALL LEAGUE</span>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 flex flex-col gap-1 overflow-y-auto">
        <SidebarItem to="/" label="Home" icon={LayoutDashboard} collapsed={collapsed} />
        <SidebarItem to="/teams" label="Teams" icon={Shield} collapsed={collapsed} />
        <SidebarItem to="/players" label="Spieler" icon={Users} collapsed={collapsed} />
        <SidebarItem to="/managers" label="Manager" icon={UserCheck} collapsed={collapsed} />
        <SidebarItem to="/manager-groups" label="Gruppen" icon={UsersRound} collapsed={collapsed} />
        {isAuthenticated && user?.role === 'ADMIN' && (
          <SidebarItem
            to="/season"
            label="Verwaltung"
            icon={Settings}
            collapsed={collapsed}
            subItems={[
              { to: '/season', label: 'Saison' },
              { to: '/games', label: 'Spiele' },
              { to: '/users', label: 'Benutzer' },
              { to: '/emails', label: 'E-Mails' },
            ]}
            expanded={effectiveVerwaltungExpanded}
            onToggle={() => setVerwaltungExpanded(!effectiveVerwaltungExpanded)}
          />
        )}
        {isAuthenticated && user?.role === 'ADMIN' && (
          <SidebarItem to="/system" label="System" icon={Server} collapsed={collapsed} />
        )}
        <a
          href="/feedback"
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? 'Feedback' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-muted hover:bg-elevated hover:text-accent ${collapsed ? 'justify-center' : ''}`}
        >
          <MessageSquare size={20} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Feedback</span>}
        </a>
      </nav>

      <div className={`px-3 py-3 border-t border-border ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {collapsed ? (
          <>
            {isAuthenticated && (
              <>
                <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                  {user?.login?.charAt(0).toUpperCase() || 'U'}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-subtle hover:text-danger hover:bg-danger/10 transition-colors"
                  title="Abmelden"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.login?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-accent truncate">{user?.login}</span>
              </div>
            ) : (
              <Link to="/login" className="text-sm text-accent hover:text-accent-hover link">Anmelden</Link>
            )}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-xs rounded bg-elevated text-foreground border border-border-hover hover:bg-default transition-colors shrink-0"
              >
                Abmelden
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`px-2 py-2 border-t border-border ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={() => handleToggleCollapse(!collapsed)}
          className="p-2 rounded-lg text-subtle hover:text-muted hover:bg-elevated transition-colors"
          title={collapsed ? 'Sidebar öffnen' : 'Sidebar schließen'}
        >
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
          >
            <path d="M11 19l-7-7 7-7" /><path d="M20 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside
        className={`hidden md:flex flex-col bg-surface border-r border-border shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out`}
        style={{ width: collapsed ? 64 : 256 }}
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
