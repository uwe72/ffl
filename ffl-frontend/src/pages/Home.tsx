import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentManager, useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useDashboardAufstellung } from '../hooks/useDashboard'
import { useAuth } from '../context/AuthContext'
import useIsMobile from '../hooks/useIsMobile'
import ManagerSelect from '../components/ManagerSelect'
import AufstellungsFeld from '../components/statistik/AufstellungsFeld'
import AufstellungKompakt from '../components/statistik/AufstellungKompakt'
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

  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null)

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  const isAdmin = user?.role === 'ADMIN'
  const isBeforeSeason = season?.seasonState === 'BEFORE_SEASON'
  const canSelectManager = isAdmin || !isBeforeSeason

  const uwe72 = useMemo(() => managers?.find(m => m.shortName === 'uwe72'), [managers])
  const refManagerId = isAdmin ? uwe72?.id : currentManager?.id

  const activeManagerId = selectedManagerId ?? refManagerId
  const aufstellungQuery = useDashboardAufstellung(activeManagerId ?? 0)

  const activeManager = useMemo(
    () => managers?.find(m => m.id === activeManagerId),
    [managers, activeManagerId]
  )

  const displayAufstellung: Aufstellung | null = aufstellungQuery.data ?? null
  const isVorsaison = displayAufstellung?.phase === 'VORSAISON'
  const feldModus: 'gesamt' | 'wert' = isVorsaison ? 'wert' : 'gesamt'

  const isOwnTeam = activeManagerId === refManagerId
  const title = isOwnTeam ? 'Mein Team' : managerLabel(activeManager) || 'Mein Team'

  const card = (children: ReactNode) => (
    <div className="p-6 bg-surface border border-border rounded-card">
      <div className="relative z-20 flex items-center gap-3 flex-wrap mb-4">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {canSelectManager && (
          <div className="ml-auto">
            <ManagerSelect
              managers={managers ?? []}
              value={activeManagerId ?? null}
              onChange={id => setSelectedManagerId(id)}
            />
          </div>
        )}
      </div>
      {children}
    </div>
  )

  if (isMobile) {
    return (
      <div className="pb-6">
        {card(
          !activeManagerId ? (
            <p className="text-sm text-muted py-10 text-center">Kein Team vorhanden.</p>
          ) : aufstellungQuery.isLoading || !aufstellungQuery.data ? (
            <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
          ) : (
            <AufstellungKompakt aufstellung={aufstellungQuery.data} modus={feldModus} />
          )
        )}
      </div>
    )
  }

  return (
    <div className="pb-6">
      {card(
        <div className="relative z-0 isolate">
          {!activeManagerId ? (
            <AufstellungsFeld aufstellung={EMPTY_AUFSTELLUNG} modus={feldModus} overlayLegend heightOffset={200} />
          ) : aufstellungQuery.isError ? (
            <p className="text-sm text-danger py-10 text-center">Daten konnten nicht geladen werden.</p>
          ) : !displayAufstellung ? (
            <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
          ) : (
            <AufstellungsFeld aufstellung={displayAufstellung} modus={feldModus} overlayLegend heightOffset={200} />
          )}
        </div>
      )}
    </div>
  )
}
