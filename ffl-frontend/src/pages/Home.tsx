import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentManager, useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason, useBestTeam } from '../hooks/useSeasons'
import { useDashboardAufstellung } from '../hooks/useDashboard'
import { useAuth } from '../context/AuthContext'
import useIsMobile from '../hooks/useIsMobile'
import StatToggle from '../components/statistik/StatToggle'
import AufstellungsFeld from '../components/statistik/AufstellungsFeld'
import AufstellungKompakt from '../components/statistik/AufstellungKompakt'
import ManagerSelect from '../components/ManagerSelect'
import type { Aufstellung, SpielerAufstellung, PunkteModus } from '../types/dashboard'
import type { BestTeamResult, Position } from '../types'

type Selection = { type: 'own' } | { type: 'manager'; id: number } | { type: 'best' }

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

function mapBestTeam(best: BestTeamResult, spieltag: number): Aufstellung {
  const spieler: SpielerAufstellung[] = best.players.map(bp => ({
    id: bp.id,
    name: bp.name,
    vereinKuerzel: bp.teamName ?? '',
    vereinLogoUrl: bp.teamLogoUrl,
    pictureUrl: bp.pictureUrl,
    position: bp.position as Position,
    joker: false,
    punkteGesamt: bp.points,
    punkteSpieltag: 0,
    marktwert: bp.prize,
    tore: 0,
    zuNull: 0,
  }))
  return {
    phase: 'SAISON',
    spieltag,
    teamname: 'Bestes Team',
    punkteGesamt: best.totalPoints,
    punkteSpieltag: 0,
    kaderwert: best.totalCost,
    budget: best.budget,
    spieler,
  }
}

export default function Home() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { data: season } = useCurrentSeason()
  const { data: currentManager } = useCurrentManager()
  const { data: managers } = useManagersBySeason(season?.id ?? 0)

  const [selection, setSelection] = useState<Selection>({ type: 'own' })
  const [modus, setModus] = useState<PunkteModus>('gesamt')

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  const isAdmin = user?.role === 'ADMIN'
  const isBeforeSeason = season?.seasonState === 'BEFORE_SEASON'

  const uwe72 = useMemo(() => managers?.find(m => m.shortName === 'uwe72'), [managers])
  const refManagerId = isAdmin ? uwe72?.id : currentManager?.id

  const otherManagers = useMemo(
    () => (managers ?? []).filter(m => m.id !== refManagerId),
    [managers, refManagerId]
  )

  const effectiveSelection: Selection = isBeforeSeason ? { type: 'own' } : selection

  const fetchManagerId =
    isMobile || effectiveSelection.type === 'own'
      ? refManagerId
      : effectiveSelection.type === 'manager'
        ? effectiveSelection.id
        : undefined

  const aufstellungQuery = useDashboardAufstellung(fetchManagerId ?? 0)
  const { data: bestTeam } = useBestTeam(!isBeforeSeason ? season?.id ?? 0 : 0)

  const bestAufstellung = useMemo(
    () => (bestTeam && bestTeam.players.length > 0 ? mapBestTeam(bestTeam, season?.currentMatchday ?? 0) : null),
    [bestTeam, season?.currentMatchday]
  )

  const isBestView = !isMobile && effectiveSelection.type === 'best'

  const displayAufstellung: Aufstellung | null = isBestView
    ? bestAufstellung
    : aufstellungQuery.data ?? null

  const isVorsaison = displayAufstellung?.phase === 'VORSAISON'
  const feldModus: 'gesamt' | 'spieltag' | 'wert' = isBestView
    ? 'gesamt'
    : isVorsaison
      ? 'wert'
      : modus

  const showToggle = !isVorsaison && !isBestView
  const wertungToggle = showToggle ? (
    <StatToggle
      ariaLabel="Wertung"
      options={[
        { value: 'gesamt', label: 'Gesamt' },
        { value: 'spieltag', label: 'Spieltag' },
      ]}
      value={modus}
      onChange={v => setModus(v as PunkteModus)}
    />
  ) : null

  if (isMobile) {
    return (
      <div className="pb-6">
        {!refManagerId ? (
          <p className="text-sm text-muted py-10 text-center">Kein Team vorhanden.</p>
        ) : aufstellungQuery.isLoading || !aufstellungQuery.data ? (
          <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
        ) : (
          <AufstellungKompakt aufstellung={aufstellungQuery.data} modus={feldModus} />
        )}
      </div>
    )
  }

  const ownActive = effectiveSelection.type === 'own'
  const bestActive = effectiveSelection.type === 'best'
  const dropdownValue = effectiveSelection.type === 'manager' ? effectiveSelection.id : null

  return (
    <div className="pb-6">
      {!isBeforeSeason && (
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelection({ type: 'own' })}
              aria-pressed={ownActive}
              className={`px-3 py-1.5 rounded-control text-xs font-medium border transition-colors cursor-pointer ${
                ownActive
                  ? 'bg-stat-accent text-white border-stat-accent'
                  : 'bg-elevated text-muted border-border-strong hover:text-foreground hover:bg-card-hover'
              }`}
            >
              Mein Team
            </button>
            <button
              type="button"
              onClick={() => setSelection({ type: 'best' })}
              aria-pressed={bestActive}
              className={`px-3 py-1.5 rounded-control text-xs font-medium border transition-colors cursor-pointer ${
                bestActive
                  ? 'bg-stat-accent text-white border-stat-accent'
                  : 'bg-elevated text-muted border-border-strong hover:text-foreground hover:bg-card-hover'
              }`}
            >
              Bestes Team
            </button>
          </div>
          <ManagerSelect
            managers={otherManagers}
            value={dropdownValue}
            onChange={id => setSelection({ type: 'manager', id })}
          />
          {wertungToggle && <div className="ml-auto">{wertungToggle}</div>}
        </div>
      )}

      {isBeforeSeason && wertungToggle && (
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="ml-auto">{wertungToggle}</div>
        </div>
      )}

      {isBestView && !bestAufstellung ? (
        <p className="text-sm text-muted py-10 text-center">Noch kein bestes Team verfügbar.</p>
      ) : !isBestView && !refManagerId && effectiveSelection.type === 'own' ? (
        <AufstellungsFeld aufstellung={EMPTY_AUFSTELLUNG} modus={feldModus} overlayLegend />
      ) : !isBestView && aufstellungQuery.isError ? (
        <p className="text-sm text-danger py-10 text-center">Daten konnten nicht geladen werden.</p>
      ) : !displayAufstellung ? (
        <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
      ) : (
        <AufstellungsFeld aufstellung={displayAufstellung} modus={feldModus} overlayLegend />
      )}
    </div>
  )
}
