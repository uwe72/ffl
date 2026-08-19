import { useMemo } from 'react'
import type { Aufstellung, SpielerAufstellung } from '../../types/dashboard'
import { positionLabels, positionTextColor } from '../../utils/positions'
import { formatPoints, formatMillionen } from '../../utils/format'
import { StatPlayerCard } from './AufstellungsFeld'

type FeldModus = 'gesamt' | 'spieltag' | 'wert'

const COLUMNS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as const

function bigOf(p: SpielerAufstellung, modus: FeldModus): number {
  if (modus === 'wert') return p.marktwert
  if (modus === 'spieltag') return p.punkteSpieltag
  return p.punkteGesamt
}

export default function AufstellungVertikal({
  aufstellung,
  modus,
}: {
  aufstellung: Aufstellung
  modus: FeldModus
}) {
  const grouped = useMemo(() => {
    const map: Record<string, SpielerAufstellung[]> = { GOALKEEPER: [], DEFENDER: [], MIDFIELD: [], STRIKER: [] }
    for (const s of aufstellung.spieler) {
      if (map[s.position]) map[s.position].push(s)
    }
    return map
  }, [aufstellung.spieler])

  const isVorsaison = aufstellung.phase === 'VORSAISON'
  const sum = aufstellung.spieler.reduce((a, s) => a + bigOf(s, modus), 0)
  const sumBig = modus === 'wert' ? formatMillionen(sum) : formatPoints(sum)
  const sumLabel = modus === 'wert' ? 'Kaderwert' : modus === 'spieltag' ? 'Punkte Spieltag' : 'Punkte gesamt'

  return (
    <div className="w-full flex flex-col gap-6">
      {!isVorsaison && (
        <div className="flex items-center justify-between gap-3 bg-stat-card border border-border rounded-card px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">{sumLabel}</span>
          <span className="text-xl font-bold tabular-nums text-foreground">{sumBig}</span>
        </div>
      )}
      {COLUMNS.map(pos => {
        const players = grouped[pos]
        if (!players || players.length === 0) return null
        return (
          <div key={pos} className="flex flex-col gap-3">
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${positionTextColor[pos]}`}>
              {positionLabels[pos]}
            </h3>
            {players.map(p => (
              <StatPlayerCard key={p.id} player={p} modus={modus} width="100%" height={176} compact={false} pictureScale={1.5} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
