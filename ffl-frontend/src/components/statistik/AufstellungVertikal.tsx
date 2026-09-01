import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Aufstellung } from '../../types/dashboard'
import { positionBadgeVariant } from '../../utils/positions'

type FeldModus = 'gesamt' | 'spieltag' | 'wert'

const POS_BADGE: Record<string, string> = {
  GOALKEEPER: 'TW',
  DEFENDER: 'VT',
  MIDFIELD: 'MF',
  STRIKER: 'ST',
}

export default function AufstellungVertikal({
  aufstellung,
}: {
  aufstellung: Aufstellung
  modus: FeldModus
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

  const th = 'px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap'
  const td = 'px-3 py-1 border-b border-border whitespace-nowrap tabular-nums'

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="overflow-x-auto rounded-card border border-border" style={{ touchAction: 'pan-y' }}>
        <table className="w-full border-collapse text-sm">
          <thead className="bg-elevated sticky top-0">
            <tr>
              <th colSpan={2} align="left" className={th}>{title}</th>
              <th colSpan={2} align="center" className={th}>Punkte</th>
              <th colSpan={2} align="center" className={th}>Einsatz</th>
            </tr>
            <tr>
              <th align="left" className={th}>Spieler</th>
              <th className={th}>Pos</th>
              <th className={th}>Sp.</th>
              <th className={th}>Ges.</th>
              <th className={th}>Sp.</th>
              <th className={th}>Ges.</th>
            </tr>
          </thead>
          <tbody className="bg-surface">
            {sorted.map((p, index) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/players/${p.id}`)}
                className={`cursor-pointer hover:bg-card-hover border-b border-border transition-colors ${index % 2 === 1 ? 'bg-zebra' : ''}`}
              >
                <td className={`${td} max-w-[11rem]`}>
                  <div className="truncate font-semibold text-foreground">{p.name.length > 12 ? `${p.name.slice(0, 12)}...` : p.name}</div>
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
