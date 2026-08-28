import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentManager, useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useDashboardAufstellung } from '../hooks/useDashboard'
import { useFavorites, useAddFavorite, useRemoveFavorite, useSetStandard } from '../hooks/useFavorites'
import { useAuth } from '../context/AuthContext'
import useIsMobile from '../hooks/useIsMobile'
import ManagerSelect from '../components/ManagerSelect'
import Button from '../components/Button'
import AufstellungsFeld from '../components/statistik/AufstellungsFeld'
import AufstellungVertikal from '../components/statistik/AufstellungVertikal'
import type { Aufstellung } from '../types/dashboard'
import type { Manager } from '../types'

const EMPTY_AUFSTELLUNG: Aufstellung = {
  phase: 'SAISON',
  spieltag: 0,
  teamname: '',
  punkteGesamt: 0,
  punkteSpieltag: 0,
  kaderwert: 0,
  budget: 0,
  spieler: [],
}

function managerLabel(m?: Manager): string {
  if (!m) return ''
  const fullName = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
  if (fullName && m.login) return `${fullName} (${m.login})`
  if (fullName) return fullName
  if (m.login) return m.login
  return m.shortName ?? ''
}

export default function Home() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { data: season } = useCurrentSeason()
  const { data: currentManager } = useCurrentManager()
  const { data: managers } = useManagersBySeason(season?.id ?? 0)
  const { data: favorites } = useFavorites(season?.id ?? 0)
  const addFavorite = useAddFavorite(season?.id ?? 0)
  const removeFavorite = useRemoveFavorite(season?.id ?? 0)
  const setStandard = useSetStandard(season?.id ?? 0)

  const [activeManagerId, setActiveManagerId] = useState<number | null>(null)
  const [carouselError, setCarouselError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  const isAdmin = user?.role === 'ADMIN'
  const isBeforeSeason = season?.seasonState === 'BEFORE_SEASON'
  const carouselEnabled = isAdmin || !isBeforeSeason

  const favoriteList = favorites ?? []
  const favoriteManagerIds = useMemo(() => favoriteList.map(f => f.friendManagerId), [favoriteList])
  const standardId = favoriteList.find(f => f.standard)?.friendManagerId ?? null
  const ownManagerId = currentManager?.id ?? null

  useEffect(() => {
    if (!carouselEnabled) {
      if (activeManagerId !== ownManagerId) setActiveManagerId(ownManagerId ?? null)
      return
    }
    if (activeManagerId != null) return
    const def = standardId
      ?? (ownManagerId != null && favoriteManagerIds.includes(ownManagerId) ? ownManagerId : null)
      ?? (favoriteManagerIds.length > 0 ? favoriteManagerIds[0] : null)
    setActiveManagerId(def)
  }, [carouselEnabled, favoriteManagerIds, ownManagerId, standardId, activeManagerId])

  const activeManager = useMemo(
    () => managers?.find(m => m.id === activeManagerId),
    [managers, activeManagerId]
  )
  const isOwnTeam = ownManagerId != null && activeManagerId === ownManagerId
  const isFavorite = favoriteManagerIds.includes(activeManagerId ?? -1)
  const isStandard = standardId != null && activeManagerId === standardId

  const aufstellungQuery = useDashboardAufstellung(activeManagerId ?? 0)

  const activeIndex = favoriteManagerIds.indexOf(activeManagerId ?? -1)
  const carouselPrev = () => {
    if (favoriteManagerIds.length === 0) return
    const idx = activeIndex
    const pi = idx === -1 ? favoriteManagerIds.length - 1 : (idx - 1 + favoriteManagerIds.length) % favoriteManagerIds.length
    setActiveManagerId(favoriteManagerIds[pi])
  }
  const carouselNext = () => {
    if (favoriteManagerIds.length === 0) return
    const idx = activeIndex
    const ni = idx === -1 ? 0 : (idx + 1) % favoriteManagerIds.length
    setActiveManagerId(favoriteManagerIds[ni])
  }

  const handleToggleFavorite = async () => {
    setCarouselError('')
    if (!activeManagerId) return
    try {
      if (isFavorite) {
        await removeFavorite.mutateAsync(activeManagerId)
        setActiveManagerId(null)
      } else {
        await addFavorite.mutateAsync(activeManagerId)
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: string } }
      setCarouselError(axiosErr.response?.data && typeof axiosErr.response.data === 'string'
        ? axiosErr.response.data
        : 'Favorit konnte nicht aktualisiert werden.')
    }
  }

  const handleToggleStandard = async () => {
    setCarouselError('')
    if (!activeManagerId) return
    try {
      await setStandard.mutateAsync(isStandard ? null : activeManagerId)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: string } }
      setCarouselError(axiosErr.response?.data && typeof axiosErr.response.data === 'string'
        ? axiosErr.response.data
        : 'Standard-Team konnte nicht aktualisiert werden.')
    }
  }

  const displayAufstellung: Aufstellung | null = aufstellungQuery.data ?? null
  const isVorsaison = displayAufstellung?.phase === 'VORSAISON'
  const feldModus: 'gesamt' | 'wert' = isVorsaison ? 'wert' : 'gesamt'

  const title = managerLabel(activeManager) || 'Team auswählen'
  const showBearbeiten = isOwnTeam && !isAdmin
  const showCarouselNav = carouselEnabled && favoriteManagerIds.length > 1

  const card = (children: ReactNode, fill = false) => (
    <div
      className={`p-6 bg-surface border border-border rounded-card${fill ? ' h-full flex flex-col min-h-0 max-w-[1300px]' : ''}`}
    >
      <div className="relative z-20 flex items-center gap-2 flex-wrap mb-4 shrink-0">
        {showCarouselNav && (
          <button
            type="button"
            onClick={carouselPrev}
            aria-label="Vorheriges Team"
            title="Vorheriges Team"
            className="w-9 h-9 rounded-control border border-border-strong text-accent hover:bg-accent-muted flex items-center justify-center transition-colors"
          >
            <i className="sap-icon sap-icon-slim-arrow-left text-sm" />
          </button>
        )}
        <h2 className="text-xl font-semibold text-foreground min-w-0">{title}</h2>
        {isStandard && (
          <span className="text-[10px] font-semibold bg-accent-soft text-accent-hover rounded-badge px-1.5 py-0.5 leading-none">
            Standard
          </span>
        )}
        {showBearbeiten && (
          <Button
            variant="ghost"
            size="input"
            onClick={() => navigate('/my-team')}
            aria-label="Team bearbeiten"
            title="Team bearbeiten"
          >
            <i className="sap-icon sap-icon-edit text-sm" />
          </Button>
        )}
        {showCarouselNav && (
          <button
            type="button"
            onClick={carouselNext}
            aria-label="Nächstes Team"
            title="Nächstes Team"
            className="w-9 h-9 rounded-control border border-border-strong text-accent hover:bg-accent-muted flex items-center justify-center transition-colors"
          >
            <i className="sap-icon sap-icon-slim-arrow-right text-sm" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {carouselEnabled && activeManagerId != null && (
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              className={`w-9 h-9 rounded-control border border-border-strong flex items-center justify-center transition-colors ${isFavorite ? 'text-accent bg-accent-soft' : 'text-subtle hover:bg-accent-muted'}`}
            >
              <i className={`sap-icon ${isFavorite ? 'sap-icon-favorite' : 'sap-icon-unfavorite'} text-sm`} />
            </button>
          )}
          {carouselEnabled && isFavorite && (
            <Button
              variant={isStandard ? 'secondary' : 'transparent'}
              size="input"
              onClick={handleToggleStandard}
              title={isStandard ? 'Standard-Team entfernen' : 'Als Standard-Team festlegen'}
            >
              {isStandard ? 'Standard' : 'Als Standard'}
            </Button>
          )}
          {carouselEnabled && (
            <ManagerSelect
              managers={managers ?? []}
              value={activeManagerId ?? null}
              onChange={id => setActiveManagerId(id)}
            />
          )}
        </div>
      </div>
      {carouselError && (
        <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-card mb-4">
          <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
          <p className="text-danger text-sm">{carouselError}</p>
        </div>
      )}
      {fill ? <div className="flex-1 min-h-0">{children}</div> : children}
    </div>
  )

  if (isMobile) {
    return (
      <div className="pb-6">
        {card(
          !activeManagerId ? (
            <p className="text-sm text-muted py-10 text-center">Kein Team ausgewählt.</p>
          ) : aufstellungQuery.isLoading || !aufstellungQuery.data ? (
            <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
          ) : (
            <AufstellungVertikal aufstellung={aufstellungQuery.data} modus={feldModus} />
          )
        )}
      </div>
    )
  }

  return (
    <div className="pb-6 h-[103%] flex flex-col min-h-0">
      {card(
        <div className="relative z-0 isolate h-full flex flex-col min-h-0">
          {!activeManagerId ? (
            <AufstellungsFeld aufstellung={EMPTY_AUFSTELLUNG} modus={feldModus} overlayLegend hideSum={isVorsaison} />
          ) : aufstellungQuery.isError ? (
            <p className="text-sm text-danger py-10 text-center">Daten konnten nicht geladen werden.</p>
          ) : !displayAufstellung ? (
            <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
          ) : (
            <AufstellungsFeld aufstellung={displayAufstellung} modus={feldModus} overlayLegend hideSum={isVorsaison} />
          )}
        </div>,
        true
      )}
    </div>
  )
}
