import { useState, useRef, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import SidebarItem from './SidebarItem'
import InfoDialog from './InfoDialog'
import { useAuth } from '../context/AuthContext'
import { useAvatar, useUploadAvatar } from '../hooks/useAvatar'
import { useCurrentSeason } from '../hooks/useSeasons'

const buildDate = import.meta.env.VITE_BUILD_DATE
const buildDateTime = new Date(buildDate)
const formattedDate = buildDateTime.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
const formattedTime = buildDateTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const formattedDateTime = `V${formattedDate} - ${formattedTime}`

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: (next: boolean) => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const [sonstigesExpanded, setSonstigesExpanded] = useState(false)
  const [verwaltungExpanded, setVerwaltungExpanded] = useState(false)
  const [showGalleryHint, setShowGalleryHint] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAvatar = useUploadAvatar()
  const { data: avatarUrl } = useAvatar(user?.id ?? null)
  const { data: currentSeason, isLoading: seasonLoading } = useCurrentSeason()
  const isRestricted = isAuthenticated && user?.role !== 'ADMIN' && (seasonLoading || currentSeason?.seasonState === 'BEFORE_SEASON')
  const canAccessGallery = user?.role === 'ADMIN' || !!user?.avatarUrl

  useEffect(() => {
    onCloseMobile()
  }, [location.pathname, onCloseMobile])

  const isOnSonstiges = location.pathname.startsWith('/manager-groups') ||
    location.pathname.startsWith('/feedback') ||
    location.pathname.startsWith('/manager-galerie') ||
    location.pathname.startsWith('/history') ||
    location.pathname.startsWith('/games') ||
    location.pathname.startsWith('/umfrage') ||
    location.pathname.startsWith('/documents') ||
    location.pathname.startsWith('/teams')
  const isOnVerwaltung = location.pathname.startsWith('/users') ||
    location.pathname.startsWith('/emails') ||
    location.pathname.startsWith('/mailing') ||
    location.pathname.startsWith('/season') ||
    location.pathname.startsWith('/statistik') ||
    location.pathname.startsWith('/system') ||
    location.pathname.startsWith('/umfragen')
  const effectiveSonstigesExpanded = sonstigesExpanded || isOnSonstiges
  const effectiveVerwaltungExpanded = verwaltungExpanded || isOnVerwaltung

  useEffect(() => {
    if (!isOnSonstiges) {
      setSonstigesExpanded(false)
    }
  }, [location.pathname, isOnSonstiges])

  useEffect(() => {
    if (!isOnVerwaltung) {
      setVerwaltungExpanded(false)
    }
  }, [location.pathname, isOnVerwaltung])

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

  const renderSidebarContent = (mobile: boolean) => (
    <div className="flex flex-col h-full">
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1 overflow-y-auto">
        {isAuthenticated && (
          <SidebarItem to="/" label="Dashboard" icon="sap-icon-bbyd-dashboard" collapsed={collapsed} />
        )}
        {!mobile && (
          <SidebarItem to="/managers" label="Manager" icon="sap-icon-employee" collapsed={collapsed} />
        )}
        {isAuthenticated && (
          <SidebarItem to="/my-team" label="My Team" icon="sap-icon-employee" collapsed={collapsed} />
        )}
        <SidebarItem to="/players" label="Spieler" icon="sap-icon-group" collapsed={collapsed} />
        {isAuthenticated && (
          <SidebarItem
            to="/documents"
            label="Sonstiges"
            icon="sap-icon-grid"
            collapsed={collapsed}
            subItems={[
              { to: '/documents', label: 'Dokumente', icon: 'sap-icon-documents' },
              { to: '/feedback', label: 'Feedback', icon: 'sap-icon-discussion' },
              { to: '/manager-galerie', label: 'Galerie', icon: 'sap-icon-picture', onBlockedClick: canAccessGallery ? undefined : () => setShowGalleryHint(true) },
              { to: '/manager-groups', label: 'Gruppen', icon: 'sap-icon-group' },
              { to: '/history', label: 'Historie', icon: 'sap-icon-history' },
              ...(!mobile && !isRestricted ? [{ to: '/games', label: 'Spiele', icon: 'sap-icon-calendar' }] : []),
              { to: '/umfrage', label: 'Umfrage', icon: 'sap-icon-survey' },
              ...(!mobile && !isRestricted ? [{ to: '/teams', label: 'Vereine', icon: 'sap-icon-shield' }] : []),
            ]}
            expanded={effectiveSonstigesExpanded}
            onToggle={() => setSonstigesExpanded(!effectiveSonstigesExpanded)}
          />
        )}

        {user?.role === 'ADMIN' && (
          <SidebarItem
            to="/season"
            label="Verwaltung"
            icon="sap-icon-locked"
            collapsed={collapsed}
            subItems={[
              { to: '/users', label: 'Benutzer', icon: 'sap-icon-customer' },
              { to: '/emails', label: 'E-Mailadressen', icon: 'sap-icon-email' },
              { to: '/mailing', label: 'Mailing', icon: 'sap-icon-marketing-campaign' },
              { to: '/season', label: 'Saison', icon: 'sap-icon-date-time' },
              { to: '/statistik', label: 'Statistik', icon: 'sap-icon-bar-chart' },
              { to: '/system', label: 'System', icon: 'sap-icon-settings' },
              { to: '/umfragen', label: 'Umfragen', icon: 'sap-icon-survey' },
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
                      <div className="w-8 h-8 rounded-full bg-accent-muted text-accent flex items-center justify-center text-xs font-bold">
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
                    className="p-1.5 rounded-control text-subtle hover:text-danger hover:bg-danger/10 transition-colors"
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
                      <div className="w-7 h-7 rounded-full bg-accent-muted text-accent flex items-center justify-center text-xs font-bold">
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
                <Link to="/my-team" className="text-sm text-primary truncate hover:text-accent hover:underline cursor-pointer">{user?.login}</Link>
              </div>
            ) : (
              <Link to="/login" className="text-sm text-primary hover:text-primary link">Anmelden</Link>
            )}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-xs rounded-control bg-elevated text-foreground border border-border-hover hover:bg-default transition-colors shrink-0"
              >
                Abmelden
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`px-2 py-2 border-t border-border ${collapsed ? 'flex flex-col items-center gap-1' : 'flex items-center justify-between gap-2'}`}>
        {!collapsed && (
          <span className="text-sm text-muted">
            {formattedDateTime}
          </span>
        )}
        <button
          onClick={() => onToggleCollapse(!collapsed)}
          className="p-2 rounded-control text-subtle hover:text-muted hover:bg-card-hover transition-colors"
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
        className={`sidebar hidden md:flex flex-col bg-surface border-r border-border shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out`}
        style={{ width: collapsed ? 64 : 240 }}
      >
        {renderSidebarContent(false)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={onCloseMobile} />
          <aside className="sidebar absolute left-0 top-0 bottom-0 w-60 bg-surface border-r border-border flex flex-col shadow-2xl">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      <InfoDialog
        isOpen={showGalleryHint}
        onClose={() => setShowGalleryHint(false)}
        title="Galerie nicht verfügbar"
        message="Die Manager-Galerie ist nur für Manager sichtbar, die selbst ein Profilbild hinterlegt haben. Lade zuerst ein Bild hoch, um Zugriff zu erhalten."
        icon="sap-icon-picture"
      />
    </>
  )
}