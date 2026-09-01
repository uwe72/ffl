import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom'
import { useCurrentManager, useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useDashboardAufstellung } from '../hooks/useDashboard'
import { useFavorites, useAddFavorite, useRemoveFavorite, useSetStandard } from '../hooks/useFavorites'
import { useMyGroupsWithStats, useGroupLogo } from '../hooks/useManagerGroups'
import { useAuth } from '../context/AuthContext'
import useIsMobile from '../hooks/useIsMobile'
import useHorizontalSwipe from '../hooks/useHorizontalSwipe'
import ManagerSelect from '../components/ManagerSelect'
import Button from '../components/Button'
import Tabs from '../components/Tabs'
import SegmentedTabs from '../components/SegmentedTabs'
import { TableHead, Th, TableBody } from '../components/Table'
import AufstellungsFeld from '../components/statistik/AufstellungsFeld'
import AufstellungVertikal from '../components/statistik/AufstellungVertikal'
import CoachTafel from '../components/statistik/CoachTafel'
import type { Aufstellung } from '../types/dashboard'
import type { ManagerGroupRoundStats } from '../types'

const EMPTY_AUFSTELLUNG: Aufstellung = {
  phase: 'SAISON',
  spieltag: 0,
  teamname: '',
  punkteGesamt: null,
  punkteSpieltag: null,
  positionGesamt: null,
  positionSpieltag: null,
  teilnehmer: null,
  positionGesamtVorher: null,
  positionSpieltagVorher: null,
  punkteGesamtVorher: null,
  punkteSpieltagVorher: null,
  kaderwert: 0,
  budget: 0,
  spieler: [],
}

function managerLabel(m?: { firstName?: string; lastName?: string; login?: string; shortName?: string; managerName?: string }): string {
  if (!m) return ''
  const fullName = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
  if (fullName && m.login) return `${fullName} (${m.login})`
  if (fullName) return fullName
  if (m.login) return m.login
  return m.shortName ?? m.managerName ?? ''
}

function managerLabelShort(m?: { firstName?: string; lastName?: string; login?: string; shortName?: string; managerName?: string }): string {
  const label = managerLabel(m)
  return label.length > 30 ? `${label.slice(0, 27)}…` : label
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value == null || value === 0) return null
  return (
    <span className={`font-semibold tabular-nums ${value > 0 ? 'text-success' : 'text-danger'}`}>
      ({value > 0 ? `+${value}` : `\u2212${Math.abs(value)}`})
    </span>
  )
}

function ScoreLine({
  position,
  positionVorher,
  punkte,
  punkteVorher,
}: {
  position: number | null
  positionVorher: number | null
  punkte: number | null
  punkteVorher: number | null
}) {
  const posDelta = position != null && positionVorher != null ? positionVorher - position : null
  const ptsDelta = punkte != null && punkteVorher != null ? punkte - punkteVorher : null
  return (
    <div className="flex flex-wrap items-center gap-x-1.5">
      <span className="text-foreground">Platz {position ?? '-'}<DeltaBadge value={posDelta} /></span>
      <span className="text-muted">·</span>
      <span className="text-foreground">Punkte: {punkte != null ? Math.round(punkte) : '-'}<DeltaBadge value={ptsDelta} /></span>
    </div>
  )
}

function GroupHomeCard({ group, canNavigateToManager }: { group: ManagerGroupRoundStats, canNavigateToManager: boolean }) {
  const { user } = useAuth()
  const { data: logoUrl } = useGroupLogo(group.hasLogo ? group.groupId : null)
  const isCreator = !!user?.login && user.login === group.createdByLogin
  const creatorName =
    group.createdByFirstName && group.createdByLastName
      ? `${group.createdByFirstName} ${group.createdByLastName} (${group.createdByLogin})`
      : group.createdByLogin || '-'

  return (
    <div className="p-6 bg-surface border border-border rounded-card w-fit max-w-full">
      <div className="flex items-start gap-4 mb-4">
        {logoUrl ? (
          <img src={logoUrl} alt={group.groupName} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center flex-shrink-0">
            <i className="sap-icon sap-icon-group-2 text-xl text-accent" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            {isCreator ? (
              <RouterLink to={`/manager-groups/${group.groupId}`} className="link truncate">
                {group.groupName}
              </RouterLink>
            ) : (
              <span className="truncate">{group.groupName}</span>
            )}
          </h3>
          {group.description && (
            <p className="text-muted text-sm mt-1">{group.description}</p>
          )}
        </div>
        <span className="ml-auto text-sm text-muted whitespace-nowrap">
          <span className="font-semibold text-foreground">Erstellt von:</span> {creatorName}
        </span>
      </div>
      <div className="overflow-x-auto rounded-card border border-border w-fit">
        <table className="w-full max-w-[900px]">
          <TableHead>
            <tr>
              <Th align="center">POS</Th>
              <Th>Manager</Th>
              <Th align="center">Pkt.</Th>
              <Th align="center">Sp.</Th>
            </tr>
          </TableHead>
          <TableBody>
            {[...group.managers]
              .sort((a, b) => (a.positionTotal ?? 999) - (b.positionTotal ?? 999))
              .map((m, index) => (
                <tr key={m.managerId} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                  <td className="px-3 py-2 text-center font-medium text-foreground">
                    {m.positionTotal ? `${m.positionTotal}.` : '-'}
                  </td>
                  <td className="px-3 py-2 max-w-[260px]">
                    {canNavigateToManager ? (
                      <RouterLink
                        to={`/managers/${m.managerId}`}
                        className="link font-medium truncate block min-w-0"
                        title={managerLabel(m)}
                      >
                        {managerLabel(m)}
                      </RouterLink>
                    ) : (
                      <span className="font-medium text-foreground truncate block min-w-0" title={managerLabel(m)}>
                        {managerLabel(m)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-foreground">
                    {m.pointsTotal ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-center text-muted">
                    {m.pointsLastRound ?? '-'}
                  </td>
                </tr>
              ))}
            {group.managers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-subtle py-8">
                  Keine Manager in dieser Gruppe
                </td>
              </tr>
            )}
          </TableBody>
        </table>
      </div>
    </div>
  )
}

function GroupMobileItem({ group, canNavigateToManager }: { group: ManagerGroupRoundStats, canNavigateToManager: boolean }) {
  const { user } = useAuth()
  const isCreator = !!user?.login && user.login === group.createdByLogin
  return (
    <div className="p-4 bg-surface border border-border rounded-card">
      <div className="mb-3">
        {isCreator ? (
          <RouterLink to={`/manager-groups/${group.groupId}`} className="link font-semibold">
            {group.groupName}
          </RouterLink>
        ) : (
          <span className="font-semibold text-foreground">{group.groupName}</span>
        )}
      </div>
      <div className="overflow-x-auto rounded-card border border-border w-fit max-w-full">
        <table className="w-full">
          <TableHead>
            <tr>
              <Th align="center">POS</Th>
              <Th>Manager</Th>
              <Th align="center">Pkt.</Th>
              <Th align="center">Sp.</Th>
            </tr>
          </TableHead>
          <TableBody>
            {[...group.managers]
              .sort((a, b) => (a.positionTotal ?? 999) - (b.positionTotal ?? 999))
              .map((m, index) => (
                <tr key={m.managerId} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                  <td className="px-2 py-2 text-center font-medium text-foreground">
                    {m.positionTotal ? `${m.positionTotal}.` : '-'}
                  </td>
                  <td className="px-2 py-2 min-w-0">
                    {canNavigateToManager ? (
                      <RouterLink
                        to={`/managers/${m.managerId}`}
                        className="link font-medium truncate block min-w-0"
                        title={managerLabel(m)}
                      >
                        {managerLabelShort(m)}
                      </RouterLink>
                    ) : (
                      <span className="font-medium text-foreground truncate block min-w-0" title={managerLabel(m)}>
                        {managerLabelShort(m)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center font-bold text-foreground">
                    {m.pointsTotal ?? '-'}
                  </td>
                  <td className="px-2 py-2 text-center text-muted">
                    {m.pointsLastRound ?? '-'}
                  </td>
                </tr>
              ))}
            {group.managers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-subtle py-8">
                  Keine Manager in dieser Gruppe
                </td>
              </tr>
            )}
          </TableBody>
        </table>
      </div>
    </div>
  )
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [carouselError, setCarouselError] = useState('')

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab: 'spieler' | 'gruppen' = searchParams.get('tab') === 'gruppen' ? 'gruppen' : 'spieler'
  const { data: myGroups, isLoading: groupsLoading } = useMyGroupsWithStats(activeTab === 'gruppen')

  const handleTabChange = (key: string) => {
    setSearchParams(key === 'gruppen' ? { tab: 'gruppen' } : {}, { replace: false })
  }

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
  const carouselPosition =
    activeIndex >= 0 && favoriteManagerIds.length > 1
      ? `${activeIndex + 1}/${favoriteManagerIds.length}`
      : null
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

  const swipe = useHorizontalSwipe(carouselNext, carouselPrev)

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

  const handleSetStandard = async () => {
    setCarouselError('')
    if (!activeManagerId) return
    try {
      await setStandard.mutateAsync(activeManagerId)
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

  const canNavigateToManager = isAdmin || !isBeforeSeason

  const sortedGroups = useMemo(() => {
    if (!myGroups) return []
    return [...myGroups].sort((a, b) => (a.groupName || '').localeCompare(b.groupName || ''))
  }, [myGroups])

  const renderGroups = () =>
    groupsLoading ? (
      <div className="p-6 bg-surface border border-border rounded-card text-center text-muted text-sm">
        Lade Gruppen…
      </div>
    ) : !sortedGroups.length ? (
      <div className="p-6 bg-surface border border-border rounded-card">
        <div className="flex gap-3 items-start text-left">
          <i className="sap-icon sap-icon-information text-[18px] text-accent shrink-0 mt-0.5" />
          <div className="text-sm text-muted">
            <p>
              Mit einer Manager‑Gruppe vergleichst du dich mit einem eigenen, kleinen Kreis
              statt mit der ganzen Liga, zum Beispiel mit Freunden oder Kollegen. Eure
              Rangliste taucht auch in der Spieltagsmail auf.
            </p>
            <p className="mt-2">
              <RouterLink className="link" to="/manager-groups">Hier</RouterLink> kannst du deine erste Gruppe anlegen.
            </p>
          </div>
        </div>
      </div>
    ) : (
      sortedGroups.map(group => (
        <GroupHomeCard key={group.groupId} group={group} canNavigateToManager={canNavigateToManager} />
      ))
    )

  const renderMobileGroups = () =>
    groupsLoading ? (
      <div className="p-6 bg-surface border border-border rounded-card text-center text-muted text-sm">
        Lade Gruppen…
      </div>
    ) : !sortedGroups.length ? (
      <div className="p-6 bg-surface border border-border rounded-card">
        <div className="flex gap-3 items-start text-left">
          <i className="sap-icon sap-icon-information text-[18px] text-accent shrink-0 mt-0.5" />
          <div className="text-sm text-muted">
            <p>
              Mit einer Manager‑Gruppe vergleichst du dich mit einem eigenen, kleinen Kreis
              statt mit der ganzen Liga, zum Beispiel mit Freunden oder Kollegen. Eure
              Rangliste taucht auch in der Spieltagsmail auf.
            </p>
            <p className="mt-2">
              <RouterLink className="link" to="/manager-groups">Hier</RouterLink> kannst du deine erste Gruppe anlegen.
            </p>
          </div>
        </div>
      </div>
    ) : (
      sortedGroups.map(group => (
        <GroupMobileItem key={group.groupId} group={group} canNavigateToManager={canNavigateToManager} />
      ))
    )

  const card = (children: ReactNode, fill = false) => (
    <div
      className={`p-6 bg-surface border border-border rounded-card${isMobile ? ' px-3 py-0.5' : ''}${fill ? ' h-full flex flex-col min-h-0 max-w-[1300px]' : ''}`}
    >
      <div className={`relative z-20 shrink-0${isMobile ? ' mb-1' : ' mb-4'}`}>
        {isMobile ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-foreground truncate">
                {activeManager
                  ? `${activeManager.firstName ?? ''} ${activeManager.lastName ?? ''}`.trim() || activeManager.shortName || activeManager.login || 'Team auswählen'
                  : 'Team auswählen'}
                {activeManager?.login && (
                  <span className="text-sm font-normal text-muted"> ({activeManager.login})</span>
                )}
              </div>
              {!isVorsaison && (
                <div className="mt-0.5 text-xs text-muted leading-relaxed">
                  <ScoreLine
                    position={displayAufstellung?.positionSpieltag ?? null}
                    positionVorher={displayAufstellung?.positionSpieltagVorher ?? null}
                    punkte={displayAufstellung?.punkteSpieltag ?? null}
                    punkteVorher={displayAufstellung?.punkteSpieltagVorher ?? null}
                  />
                </div>
              )}
            </div>
            <div className="relative shrink-0">
              <div className="flex items-center gap-2">
                {showCarouselNav && carouselPosition && (
                  <span className="text-sm text-muted whitespace-nowrap tabular-nums">
                    {carouselPosition.replace('/', ' / ')}
                  </span>
                )}
                <div className="relative" ref={menuRef}>
                  <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Mehr Optionen"
                title="Mehr Optionen"
                className={`w-8 h-8 rounded-control border border-border-strong flex items-center justify-center transition-colors ${menuOpen ? 'text-accent bg-accent-soft' : 'text-subtle hover:bg-accent-muted'}`}
              >
                <i className="sap-icon sap-icon-overflow text-sm" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-surface border border-border rounded-card shadow-xl p-3 flex flex-col gap-3">
                  {showCarouselNav && (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={carouselPrev}
                        aria-label="Vorheriges Team"
                        title="Vorheriges Team"
                        className="w-9 h-9 rounded-control border border-border-strong text-accent hover:bg-accent-muted flex items-center justify-center transition-colors"
                      >
                        <i className="sap-icon sap-icon-slim-arrow-left text-sm" />
                      </button>
                      <span className="text-sm text-muted whitespace-nowrap tabular-nums">{carouselPosition}</span>
                      <button
                        type="button"
                        onClick={carouselNext}
                        aria-label="Nächstes Team"
                        title="Nächstes Team"
                        className="w-9 h-9 rounded-control border border-border-strong text-accent hover:bg-accent-muted flex items-center justify-center transition-colors"
                      >
                        <i className="sap-icon sap-icon-slim-arrow-right text-sm" />
                      </button>
                    </div>
                  )}
                  {showCarouselNav && (
                    <div className="text-center text-xs text-subtle">Alternative: Wischen zum Wechseln</div>
                  )}
                  {carouselEnabled && activeManagerId != null && !isOwnTeam && (
                    <Button variant="ghost" size="input" onClick={handleToggleFavorite}>
                      {isFavorite ? 'Aus Favoriten entfernen' : 'Als Favorit'}
                    </Button>
                  )}
                  {carouselEnabled && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Manager suchen</span>
                      <ManagerSelect
                        managers={managers ?? []}
                        value={activeManagerId ?? null}
                        onChange={id => { setActiveManagerId(id); setMenuOpen(false) }}
                      />
                    </div>
                  )}
                  {carouselEnabled && isFavorite && favoriteManagerIds.length > 1 && !isStandard && (
                    <Button variant="transparent" size="input" onClick={handleSetStandard}>
                      Als Standard
                    </Button>
                  )}
                </div>
              )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
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
            {showCarouselNav && carouselPosition && (
              <span className="text-sm text-muted whitespace-nowrap tabular-nums min-w-[2.5rem] text-center">
                {carouselPosition}
              </span>
            )}
            {carouselEnabled && isFavorite && favoriteManagerIds.length > 1 && !isStandard && (
              <Button
                variant="transparent"
                size="input"
                onClick={handleSetStandard}
                title="Als Standard-Team festlegen"
              >
                Als Standard
              </Button>
            )}
            <h2 className="text-xl font-semibold text-foreground min-w-0">{title}</h2>
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
            {carouselEnabled && activeManagerId != null && !isOwnTeam && (
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
            <div className="ml-auto flex items-center gap-2">
              {carouselEnabled && (
                <ManagerSelect
                  managers={managers ?? []}
                  value={activeManagerId ?? null}
                  onChange={id => setActiveManagerId(id)}
                />
              )}
            </div>
          </div>
        )}
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
      <div className="pb-6 flex flex-col gap-0">
        <SegmentedTabs
          items={[
            { key: 'spieler', label: 'Spieler' },
            { key: 'gruppen', label: 'Gruppen' },
          ]}
          active={activeTab}
          onChange={handleTabChange}
        />
        {activeTab === 'gruppen' ? (
          renderMobileGroups()
        ) : (
          <div
            {...swipe}
            style={{ touchAction: 'pan-y' }}
          >
            {card(
              <div>
                {!activeManagerId ? (
                  <p className="text-sm text-muted py-10 text-center">Kein Team ausgewählt.</p>
                ) : aufstellungQuery.isLoading || !aufstellungQuery.data ? (
                  <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
                ) : null}
              </div>
            )}
            {activeManagerId && aufstellungQuery.data && (
              <AufstellungVertikal
                aufstellung={aufstellungQuery.data}
                modus={feldModus}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pb-6 h-[103%] flex flex-col min-h-0">
      <Tabs
        items={[
          { key: 'spieler', label: 'Spieler' },
          { key: 'gruppen', label: 'Gruppen' },
        ]}
        active={activeTab}
        onChange={handleTabChange}
      />
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'spieler' ? (
          card(
            <div className="relative z-0 isolate h-full flex flex-col min-h-0">
              {!activeManagerId ? (
                <AufstellungsFeld aufstellung={EMPTY_AUFSTELLUNG} modus={feldModus} overlayLegend hideSum />
              ) : aufstellungQuery.isError ? (
                <p className="text-sm text-danger py-10 text-center">Daten konnten nicht geladen werden.</p>
              ) : !displayAufstellung ? (
                <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
              ) : (
                <AufstellungsFeld
                  aufstellung={displayAufstellung}
                  modus={feldModus}
                  overlayLegend
                  hideSum
                  overlay={activeManager ? <CoachTafel manager={activeManager} editable={isOwnTeam} /> : undefined}
                />
              )}
            </div>,
            true
          )
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="max-w-[1300px] flex flex-col gap-6">
              {renderGroups()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
