import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Aufstellung } from '../../types/dashboard'
import { positionBadgeVariant } from '../../utils/positions'
import { formatPoints, formatMillionen } from '../../utils/format'

type FeldModus = 'gesamt' | 'spieltag' | 'wert'

const POS_BADGE: Record<string, string> = {
  GOALKEEPER: 'TW',
  DEFENDER: 'VT',
  MIDFIELD: 'MF',
  STRIKER: 'ST',
}

export default function AufstellungVertikal({
  aufstellung,
  searchControl,
}: {
  aufstellung: Aufstellung
  modus: FeldModus
  searchControl?: ReactNode
}) {
  const navigate = useNavigate()
  const isVorsaison = aufstellung.phase === 'VORSAISON'

  const sorted = useMemo(() => {
    return [...aufstellung.spieler].sort((a, b) => {
      if (a.positionTotal !== b.positionTotal) return a.positionTotal - b.positionTotal
      return b.einsaetze - a.einsaetze
    })
  }, [aufstellung.spieler])

  const title = isVorsaison ? 'Kader' : `${aufstellung.spieltag}. Spieltag`

  const th = 'px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-border-strong whitespace-nowrap'
  const td = 'px-3 py-2 border-b border-border whitespace-nowrap tabular-nums'

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
      {searchControl && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Manager suchen</span>
          {searchControl}
        </div>
      )}
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th colSpan={4} align="left" className={th}>{title}</th>
              <th colSpan={2} align="center" className={th}>Punkte</th>
              <th colSpan={2} align="center" className={th}>Einsatz</th>
            </tr>
            <tr>
              <th className={th}>Pos.</th>
              <th align="left" className={th}>Spieler</th>
              <th className={th}>Pos</th>
              <th className={th}>Preis</th>
              <th className={th}>Sp.</th>
              <th className={th}>Ges.</th>
              <th className={th}>Sp.</th>
              <th className={th}>Ges.</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => (
              <tr
                key={p.id}
                onClick={() => navigate(`/players/${p.id}`)}
                className="cursor-pointer hover:bg-accent-muted transition-colors"
              >
                <td className={`${td} text-center text-subtle`}>{p.positionTotal > 0 ? `${p.positionTotal}.` : ''}</td>
                <td className={`${td} max-w-[11rem]`}>
                  <div className="truncate font-semibold text-foreground">{p.name}</div>
                  {p.vereinKuerzel && (
                    <div className="truncate text-xs text-muted">{p.vereinKuerzel}</div>
                  )}
                </td>
                <td className={`${td} text-center`}>
                  <span
                    className={`pos-${positionBadgeVariant[p.position]} inline-flex items-center px-2 py-0.5 text-[10px] font-bold`}
                  >
                    {POS_BADGE[p.position] ?? p.position}
                  </span>
                </td>
                <td className={`${td} text-right text-foreground`}>{formatMillionen(p.marktwert)}</td>
                <td className={`${td} text-center`}>
                  {p.punkteSpieltag > 0 ? (
                    <span className="font-bold text-accent">{p.punkteSpieltag}</span>
                  ) : ''}
                </td>
                <td className={`${td} text-center text-foreground`}>{p.punkteGesamt > 0 ? p.punkteGesamt : ''}</td>
                <td className={`${td} text-center text-foreground`}>{p.gespielt ? '√' : ''}</td>
                <td className={`${td} text-center text-foreground`}>{p.einsaetze > 0 ? p.einsaetze : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
