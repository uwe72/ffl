import type { Aufstellung } from '../../types/dashboard'
import { formatPoints, formatMillionsShort } from '../../utils/format'

type Modus = 'gesamt' | 'spieltag' | 'wert'

export default function AufstellungKompakt({
  aufstellung,
  modus,
}: {
  aufstellung: Aufstellung
  modus: Modus
}) {
  return (
    <ul className="divide-y divide-border rounded-[6px] border border-border overflow-hidden bg-stat-card">
      {aufstellung.spieler.map(p => {
        const value =
          modus === 'wert'
            ? formatMillionsShort(p.marktwert)
            : formatPoints(modus === 'spieltag' ? p.punkteSpieltag : p.punkteGesamt)
        return (
          <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="font-medium text-foreground truncate">{p.name}</span>
            <span className="text-muted shrink-0">{p.vereinKuerzel}</span>
            <span className="ml-auto font-semibold text-foreground tabular-nums shrink-0">{value}</span>
          </li>
        )
      })}
    </ul>
  )
}
