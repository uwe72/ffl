import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Aufstellung, SpielerAufstellung } from '../../types/dashboard'
import { positionLabels, positionTextColor } from '../../utils/positions'
import { formatPoints } from '../../utils/format'
import { StatPlayerCard } from './AufstellungsFeld'

type FeldModus = 'gesamt' | 'spieltag' | 'wert'

const COLUMNS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as const

export default function AufstellungVertikal({
  aufstellung,
  modus,
  searchControl,
}: {
  aufstellung: Aufstellung
  modus: FeldModus
  searchControl?: ReactNode
}) {
  const grouped = useMemo(() => {
    const map: Record<string, SpielerAufstellung[]> = { GOALKEEPER: [], DEFENDER: [], MIDFIELD: [], STRIKER: [] }
    for (const s of aufstellung.spieler) {
      if (map[s.position]) map[s.position].push(s)
    }
    return map
  }, [aufstellung.spieler])

  const isVorsaison = aufstellung.phase === 'VORSAISON'

  return (
    <div className="w-full flex flex-col gap-6">
      {!isVorsaison && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 bg-stat-card border border-border rounded-card px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Platz</span>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Gesamt</span>
              <span className="font-bold tabular-nums text-foreground">{aufstellung.positionGesamt ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Spieltag</span>
              <span className="font-bold tabular-nums text-foreground">{aufstellung.positionSpieltag ?? '-'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 bg-stat-card border border-border rounded-card px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Punkte</span>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Gesamt</span>
              <span className="font-bold tabular-nums text-foreground">{formatPoints(aufstellung.punkteGesamt)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Spieltag</span>
              <span className="font-bold tabular-nums text-foreground">{formatPoints(aufstellung.punkteSpieltag)}</span>
            </div>
          </div>
        </div>
      )}
      {COLUMNS.map(pos => {
        const players = grouped[pos]
        if (!players || players.length === 0) return null
        return (
            <div key={pos} className="flex flex-col gap-3">
              {searchControl && pos === 'GOALKEEPER' && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Manager suchen
                  </span>
                  {searchControl}
                </div>
              )}
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${positionTextColor[pos]}`}>
                {positionLabels[pos]}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {players.map(p => (
                  <StatPlayerCard key={p.id} player={p} modus={modus} width="100%" height={148} compact={false} pictureScale={1.5} mobile />
                ))}
              </div>
            </div>
        )
      })}
    </div>
  )
}
