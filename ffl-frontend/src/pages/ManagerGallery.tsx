import { useState, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useManagers } from '../hooks/useManagers'
import { useAvatar } from '../hooks/useAvatar'
import { useAuth } from '../context/AuthContext'
import { useCurrentSeason } from '../hooks/useSeasons'
import BackButton from '../components/BackButton'
import type { Manager } from '../types'

function ManagerGalleryCard({ manager, canClick, showRanking }: { manager: Manager; canClick: boolean; showRanking: boolean }) {
  const { data: avatarUrl, isLoading } = useAvatar(manager.userId)
  const [imgLoaded, setImgLoaded] = useState(false)

  const showSkeleton = isLoading || !imgLoaded
  const fullName = `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim() || manager.name
  const positionLabel = manager.positionTotal ? `${manager.positionTotal}.` : '-'
  const badgeLabel = positionLabel

  const cardInner = (
    <>
      {showSkeleton && (
        <div className="absolute inset-0 bg-elevated animate-pulse" />
      )}
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={fullName}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(10,14,20,0.85) 0%, rgba(10,14,20,0.45) 35%, rgba(10,14,20,0) 60%)' }}
      />
      {showRanking && (
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center justify-center h-8 px-2 rounded-control bg-accent text-on-dark text-sm font-bold tnum">
            {badgeLabel}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 text-on-dark">
        <div className="flex items-baseline gap-1.5 leading-tight truncate drop-shadow-sm">
          <span className="font-bold">{fullName}</span>
          {manager.login && (
            <span className="text-xs text-on-dark-muted">({manager.login})</span>
          )}
        </div>
        {manager.description && manager.description.trim() && manager.description.trim() !== '-' && (
          <div className="text-xs text-on-dark-muted italic mt-0.5 drop-shadow-sm">„{manager.description.trim()}“</div>
        )}
        {showRanking && (
          <div className="flex items-center mt-2 text-xs">
            {manager.positionChange != null && manager.positionChange !== 0 ? (
              <span className={`inline-flex items-center gap-0.5 font-semibold tnum ${manager.positionChange > 0 ? 'text-success' : 'text-danger'}`}>
                {manager.positionChange > 0 ? `↑${manager.positionChange}` : `↓${Math.abs(manager.positionChange)}`}
              </span>
            ) : (
              <span className="text-on-dark-muted tnum">·</span>
            )}
          </div>
        )}
      </div>
    </>
  )

  if (canClick) {
    return (
      <RouterLink
        to={`/managers/${manager.id}`}
        className="relative block aspect-square rounded-card overflow-hidden border border-border bg-elevated group hover:border-border-hover transition-colors"
      >
        {cardInner}
      </RouterLink>
    )
  }

  return (
    <div className="relative block aspect-square rounded-card overflow-hidden border border-border bg-elevated cursor-default">
      {cardInner}
    </div>
  )
}

export default function ManagerGallery() {
  const { data: managers, isLoading, error } = useManagers()
  const { user } = useAuth()
  const { data: currentSeason } = useCurrentSeason()
  const canClick = user?.role === 'ADMIN' || currentSeason?.seasonState !== 'BEFORE_SEASON'
  const showRanking = currentSeason?.seasonState !== 'BEFORE_SEASON'

  const galleryManagers = useMemo(() => {
    if (!managers) return []
    return managers
      .filter(m => m.avatarUrl && m.userId)
      .sort((a, b) => (a.positionTotal ?? 999) - (b.positionTotal ?? 999))
  }, [managers])

  const withPicture = galleryManagers.length
  const totalManagers = managers?.length ?? 0
  const percent = totalManagers > 0 ? Math.round((withPicture / totalManagers) * 100) : 0

  return (
    <div>
      <BackButton to="/" className="mb-4" />
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6 w-full max-w-full">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Manager-Galerie ({withPicture})
            </h2>
            <p className="text-sm text-muted mt-1">
              Alle {withPicture} Manager ({percent}%) der aktuellen Saison mit Profilbild
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-card bg-elevated animate-pulse" />
            ))}
          </div>
        )}
        {error && (
          <div className="text-center py-8 text-danger">Fehler beim Laden</div>
        )}
        {!isLoading && !error && galleryManagers.length === 0 && (
          <div className="card p-8 text-center">
            <i className="sap-icon sap-icon-employee text-[32px] text-subtle mb-3" />
            <p className="text-muted">Noch kein Manager hat ein Bild hinterlegt</p>
          </div>
        )}
        {!isLoading && !error && galleryManagers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {galleryManagers.map(manager => (
              <ManagerGalleryCard key={manager.id} manager={manager} canClick={canClick} showRanking={showRanking} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
