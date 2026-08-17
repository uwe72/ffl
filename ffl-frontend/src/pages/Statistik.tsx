import { useState } from 'react'
import StatToggle from '../components/statistik/StatToggle'
import AufstellungsFeld from '../components/statistik/AufstellungsFeld'
import Rangliste from '../components/statistik/Rangliste'
import { useCurrentManager, useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useDashboardAufstellung, useDashboardRangliste } from '../hooks/useDashboard'
import type { StatAnsicht, PunkteModus } from '../types/dashboard'

export default function Statistik() {
  const [ansicht, setAnsicht] = useState<StatAnsicht>('feld')
  const [modus, setModus] = useState<PunkteModus>('gesamt')

  const { data: season } = useCurrentSeason()
  const { data: currentManager } = useCurrentManager()
  const { data: managers } = useManagersBySeason(season?.id || 0)

  const uwe72 = managers?.find(m => m.shortName === 'uwe72')
  const refManagerId = currentManager?.id ?? uwe72?.id

  const aufstellung = useDashboardAufstellung(refManagerId ?? 0)
  const rangliste = useDashboardRangliste(refManagerId ?? 0, modus)

  const isVorsaison = aufstellung.data?.phase === 'VORSAISON'
  const feldModus: 'gesamt' | 'spieltag' | 'wert' = isVorsaison ? 'wert' : modus

  return (
    <div className="pb-6">
      <h1 className="text-2xl font-bold text-foreground mb-1">Statistik</h1>
      <p className="text-sm text-muted mb-6">
        Aufstellung und Rangliste {aufstellung.data ? `· ${aufstellung.data.teamname}` : ''}
      </p>

      <div className="p-5 md:p-8 bg-stat-card border border-border rounded-[6px]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <StatToggle
              ariaLabel="Ansicht"
              options={[
                { value: 'feld', label: 'Feld' },
                { value: 'rangliste', label: 'Rangliste' },
              ]}
              value={ansicht}
              onChange={v => setAnsicht(v as StatAnsicht)}
            />
            {!isVorsaison && (
              <StatToggle
                ariaLabel="Wertung"
                options={[
                  { value: 'gesamt', label: 'Gesamt' },
                  { value: 'spieltag', label: 'Spieltag' },
                ]}
                value={modus}
                onChange={v => setModus(v as PunkteModus)}
              />
            )}
          </div>
          {aufstellung.data && (
            <div className="text-sm text-muted tabular-nums">
              {isVorsaison ? (
                <span>
                  Kaderwert <span className="font-semibold text-foreground">{aufstellung.data.kaderwert.toLocaleString('de-DE')} €</span>
                  {' · Budget '}
                  <span className="font-semibold text-foreground">{aufstellung.data.budget.toLocaleString('de-DE')} €</span>
                </span>
              ) : (
                <span>
                  {aufstellung.data.spieltag}. Spieltag ·{' '}
                  <span className="font-semibold text-foreground">{aufstellung.data.punkteGesamt}</span> Pkt gesamt ·{' '}
                  <span className="font-semibold text-foreground">{aufstellung.data.punkteSpieltag}</span> Pkt Spieltag
                </span>
              )}
            </div>
          )}
        </div>

        {!refManagerId ? (
          <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
        ) : aufstellung.isError ? (
          <p className="text-sm text-danger py-10 text-center">
            Daten konnten nicht geladen werden.
          </p>
        ) : aufstellung.isLoading || !aufstellung.data ? (
          <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
        ) : ansicht === 'feld' ? (
          <AufstellungsFeld key="feld" aufstellung={aufstellung.data} modus={feldModus} />
        ) : rangliste.isLoading || !rangliste.data ? (
          <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
        ) : (
          <Rangliste key="rangliste" rangliste={rangliste.data} modus={modus} />
        )}
      </div>
    </div>
  )
}
