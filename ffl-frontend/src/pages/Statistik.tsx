import { useState } from 'react'
import StatToggle from '../components/statistik/StatToggle'
import AufstellungsFeld from '../components/statistik/AufstellungsFeld'
import AufstellungKompakt from '../components/statistik/AufstellungKompakt'
import Rangliste from '../components/statistik/Rangliste'
import { useCurrentManager, useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useDashboardAufstellung, useDashboardRangliste } from '../hooks/useDashboard'
import type { StatAnsicht, PunkteModus } from '../types/dashboard'

export default function Statistik() {
  const [ansicht, setAnsicht] = useState<StatAnsicht>('feld')
  const [modus, setModus] = useState<PunkteModus>('gesamt')
  const [viewManagerId, setViewManagerId] = useState<number | null>(null)

  const { data: season } = useCurrentSeason()
  const { data: currentManager } = useCurrentManager()
  const { data: managers } = useManagersBySeason(season?.id || 0)

  const uwe72 = managers?.find(m => m.shortName === 'uwe72')
  const refManagerId = currentManager?.id ?? uwe72?.id
  const effectiveManagerId = viewManagerId ?? refManagerId

  const aufstellung = useDashboardAufstellung(effectiveManagerId ?? 0)
  const rangliste = useDashboardRangliste(refManagerId ?? 0, modus, 999)

  const handleSelectManager = (managerId: number) => {
    setViewManagerId(managerId)
    setAnsicht('feld')
  }

  const isVorsaison = aufstellung.data?.phase === 'VORSAISON'
  const feldModus: 'gesamt' | 'spieltag' | 'wert' = isVorsaison ? 'wert' : modus

  const ansichtToggle = (
    <StatToggle
      ariaLabel="Ansicht"
      options={[
        { value: 'feld', label: 'Feld' },
        { value: 'rangliste', label: 'Rangliste' },
      ]}
      value={ansicht}
      onChange={v => setAnsicht(v as StatAnsicht)}
    />
  )

  const wertungToggle = !isVorsaison ? (
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

  const toggles = (
    <>
      {ansichtToggle}
      {wertungToggle}
    </>
  )

  return (
    <div className="pb-6">
      {!refManagerId ? (
        <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
      ) : aufstellung.isError ? (
        <p className="text-sm text-danger py-10 text-center">
          Daten konnten nicht geladen werden.
        </p>
      ) : aufstellung.isLoading || !aufstellung.data ? (
        <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
      ) : ansicht === 'feld' ? (
        <div key="feld" className="@container">
          <div className="hidden @max-[899px]:block">
            <div className="flex items-center gap-3 flex-wrap mb-4">{toggles}</div>
            <AufstellungKompakt aufstellung={aufstellung.data} modus={feldModus} />
          </div>
          <div className="@max-[899px]:hidden">
            <AufstellungsFeld
              aufstellung={aufstellung.data}
              modus={feldModus}
              overlay={toggles}
              overlayLegend
            />
          </div>
        </div>
      ) : rangliste.isLoading || !rangliste.data ? (
        <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap mb-6">{toggles}</div>
          <Rangliste
            key="rangliste"
            rangliste={rangliste.data}
            activeManagerId={effectiveManagerId}
            onSelectManager={handleSelectManager}
          />
        </>
      )}
    </div>
  )
}
