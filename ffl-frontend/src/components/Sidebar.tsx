import { useState, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import SidebarItem from './SidebarItem'
import { useAuth } from '../context/AuthContext'
import { useFeedback } from '../context/FeedbackContext'
import { useAvatar, useUploadAvatar } from '../hooks/useAvatar'

const SIDEBAR_COLLAPSED_KEY = 'ffl-sidebar-collapsed'

const env = import.meta.env.VITE_APP_ENV
const buildDate = import.meta.env.VITE_BUILD_DATE
const isProd = env === 'PROD'
const dateParts = buildDate.split('-')
const formattedDate = dateParts[2] + '.' + dateParts[1] + '.' + dateParts[0].slice(-2)

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
  const { open: openFeedback } = useFeedback()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAvatar = useUploadAvatar()
  const { data: avatarUrl } = useAvatar(user?.id ?? null)

  const isOnVerwaltung = location.pathname.startsWith('/season') ||
    location.pathname.startsWith('/users') ||
    location.pathname.startsWith('/emails') ||
    location.pathname.startsWith('/system')
  const effectiveVerwaltungExpanded = verwaltungExpanded || isOnVerwaltung

  const handleToggleCollapse = (next: boolean) => {
    setCollapsed(next)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    try {
      await uploadAvatar.mutateAsync({ file, userId: user.id })
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className={`px-4 py-4 border-b border-border ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div className="flex flex-col items-center">
            <img src="/menubar.png" alt="FFL" className="w-[90px] h-[90px] rounded object-contain" />
            <span className="text-[9px] text-warning mt-1">V{formattedDate}{isProd ? '' : ' (Test)'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <img src="/menubar.png" alt="FFL" className="w-[90px] h-[90px] rounded object-contain" />
            <div className="flex flex-col min-w-0 gap-1">
              <span className="text-lg font-bold text-primary tracking-wide truncate">FFL</span>
              <span className="text-xs text-subtle tracking-widest">FANTASY FOOTBALL LEAGUE</span>
              <span className="text-[10px] text-[#c9a66b]">V{formattedDate}{isProd ? '' : ' (Test)'}</span>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 flex flex-col gap-1 overflow-y-auto">
        <SidebarItem to="/" label="Dashboard" icon="sap-icon-bbyd-dashboard" collapsed={collapsed} />
        <SidebarItem to="/teams" label="Teams" icon="sap-icon-shield" collapsed={collapsed} />
        <SidebarItem to="/players" label="Spieler" icon="sap-icon-group" collapsed={collapsed} />
        <SidebarItem to="/managers" label="Manager" icon="sap-icon-employee" collapsed={collapsed} />
        <SidebarItem to="/manager-groups" label="Gruppen" icon="sap-icon-group-2" collapsed={collapsed} />
        <SidebarItem to="/games" label="Spiele" icon="sap-icon-calendar" collapsed={collapsed} />
        <button
          onClick={openFeedback}
          title={collapsed ? 'Feedback' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-muted hover:bg-card-hover hover:text-primary w-full ${collapsed ? 'justify-center' : ''}`}
        >
          <i className="sap-icon sap-icon-discussion text-[20px] shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Feedback</span>}
        </button>
        {isAuthenticated && user?.role === 'ADMIN' && (
          <SidebarItem
            to="/season"
            label="Verwaltung"
            icon="sap-icon-settings"
            collapsed={collapsed}
            subItems={[
              { to: '/season', label: 'Saison' },
              { to: '/users', label: 'Benutzer' },
              { to: '/emails', label: 'E-Mails' },
              { to: '/system', label: 'System' },
            ]}
            expanded={effectiveVerwaltungExpanded}
            onToggle={() => setVerwaltungExpanded(!effectiveVerwaltungExpanded)}
          />
        )}

      </nav>

      <div className={`px-3 py-3 border-t border-border ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {collapsed ? (
          <>
            {isAuthenticated && (
                  <>
                <div className="relative w-8 h-8">
                  <button
                    onClick={handleAvatarClick}
                    className="w-8 h-8 p-0 rounded-full overflow-hidden"
                    title="Profilbild ändern"
                    disabled={uploadAvatar.isPending}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.login || ''}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                        {user?.login?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </button>
                  {uploadAvatar.isPending && (
                    <div className="absolute inset-0 bg-surface/80 flex items-center justify-center rounded-full">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-subtle hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Abmelden"
                  >
                    <i className="sap-icon sap-icon-log text-[18px]" />
                  </button>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-7 h-7 shrink-0">
                  <button
                    onClick={handleAvatarClick}
                    className="w-7 h-7 p-0 rounded-full overflow-hidden"
                    title="Profilbild ändern"
                    disabled={uploadAvatar.isPending}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.login || ''}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                        {user?.login?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </button>
                  {uploadAvatar.isPending && (
                    <div className="absolute inset-0 bg-surface/80 flex items-center justify-center rounded-full">
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <span className="text-sm text-primary truncate">{user?.login}</span>
              </div>
            ) : (
              <Link to="/login" className="text-sm text-primary hover:text-primary link">Anmelden</Link>
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
          className="p-2 rounded-lg text-subtle hover:text-muted hover:bg-card-hover transition-colors"
          title={collapsed ? 'Sidebar öffnen' : 'Sidebar schließen'}
        >
          <i className={`sap-icon sap-icon-navigation-left-arrow text-[20px] transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />
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