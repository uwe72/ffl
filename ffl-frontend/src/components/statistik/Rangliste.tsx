import { useState } from 'react'
import type { Rangliste, RanglistenEintrag } from '../../types/dashboard'
import { useDashboardFremdAufstellung } from '../../hooks/useDashboard'
import { formatPoints, formatMillionsShort } from '../../utils/format'
import AufstellungsFeld from './AufstellungsFeld'

function tendColor(e: RanglistenEintrag): string {
  if (e.istIch) return 'var(--color-stat-accent)'
  if (e.veraenderung > 0) return 'var(--color-defender)'
  if (e.veraenderung < 0) return 'var(--color-striker)'
  return 'var(--color-goalkeeper)'
}

function tendArrow(e: RanglistenEintrag): { text: string; tone: string } {
  if (e.veraenderung > 0) return { text: `↑${e.veraenderung}`, tone: 'var(--color-defender)' }
  if (e.veraenderung < 0) return { text: `↓${Math.abs(e.veraenderung)}`, tone: 'var(--color-striker)' }
  return { text: '–', tone: 'var(--color-goalkeeper)' }
}

function clampPct(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

interface RanglisteProps {
  rangliste: Rangliste
  modus: 'gesamt' | 'spieltag'
}

export default function Rangliste({ rangliste, modus }: RanglisteProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const fremd = useDashboardFremdAufstellung(expandedId ?? 0)

  if (rangliste.verteilung) {
    return (
      <Verteilung
        verteilung={rangliste.verteilung}
        eigenerWert={rangliste.eigenerWert ?? 0}
      />
    )
  }

  const eintraege = rangliste.eintraege ?? []
  const maxAbs = Math.max(1, ...eintraege.map(e => Math.abs(e.abstandZuMir ?? 0)))

  const points = (e: RanglistenEintrag) =>
    modus === 'spieltag' ? e.punkteSpieltag : e.punkteGesamt

  const barPct = (e: RanglistenEintrag) => {
    const offset = ((e.abstandZuMir ?? 0) / maxAbs) * 50
    return clampPct(50 + offset, 2, 98)
  }

  const grenze = rangliste.preisgeldGrenzePlatz ?? -1

  const renderRow = (e: RanglistenEintrag, clipped = false, delayIndex = 0) => {
    const own = e.istIch
    const arrow = tendArrow(e)
    return (
      <button
        key={e.managerId}
        type="button"
        disabled={own}
        onClick={() => setExpandedId(expandedId === e.managerId ? null : e.managerId)}
        aria-expanded={expandedId === e.managerId}
        className={`relative w-full bg-stat-card border border-border text-left transition-colors ${
          own ? 'cursor-default' : 'cursor-pointer hover:border-border-hover'
        }`}
        style={{
          borderRadius: 6,
          borderLeft: `4px solid ${tendColor(e)}`,
          padding: own ? '14px 12px' : '9px 12px',
          opacity: clipped ? 0.55 : 1,
          backgroundColor: own
            ? 'color-mix(in srgb, var(--color-stat-accent) 7%, var(--color-stat-card))'
            : 'var(--color-stat-card)',
          animation: `stat-rise-side 0.35s cubic-bezier(0.16, 1, 0.3, 1) both`,
          animationDelay: clipped ? undefined : `${(delayIndex % 5) * 55}ms`,
        }}
      >
        {!clipped && (
          <span className="sr-only">{own ? 'Eigene Zeile' : `${e.teamname} Aufstellung anzeigen`}</span>
        )}
        <div className="flex items-center gap-3 w-full">
          <span className={`tabular-nums ${own ? 'text-lg font-bold text-stat-accent' : 'text-sm text-foreground'}`}>
            {e.platz}.
          </span>
          <span
            className={`tabular-nums text-xs ${own ? 'text-stat-accent' : ''}`}
            style={own ? undefined : { color: arrow.tone }}
          >
            {arrow.text}
          </span>
          <span className={`truncate ${own ? 'text-base font-bold text-foreground' : 'text-sm font-semibold text-foreground'}`}>
            {e.teamname}
          </span>
          <span className="text-xs text-muted truncate hidden md:inline">{e.managername}</span>
          <span className={`ml-auto tabular-nums ${own ? 'text-lg font-bold text-stat-accent' : 'text-sm text-foreground'}`}>
            {formatPoints(points(e))}
          </span>
          <span className="tabular-nums text-xs text-muted hidden lg:inline w-10 text-right">
            {formatPoints(modus === 'spieltag' ? e.punkteGesamt : e.punkteSpieltag)}
          </span>
          <span
            className="relative h-1.5 rounded-full shrink-0"
            style={{ width: 96, backgroundColor: 'color-mix(in srgb, var(--color-border) 40%, transparent)' }}
          >
            <span
              className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full"
              style={{
                left: `${barPct(e)}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: own ? 'var(--color-stat-accent)' : 'var(--color-muted)',
                border: '1px solid var(--color-border-strong)',
              }}
            />
          </span>
        </div>
        {!own && expandedId === e.managerId && (
          <div className="mt-3 pt-3 border-t border-border">
            {fremd.isLoading ? (
              <p className="text-xs text-muted">Lade Aufstellung…</p>
            ) : fremd.data ? (
              <AufstellungsFeld aufstellung={fremd.data} modus={modus === 'spieltag' ? 'spieltag' : 'gesamt'} compact />
            ) : null}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-8 mb-4 w-full">
        <div className="text-center">
          <div className="text-xs text-muted">Abstand zu Platz 1</div>
          <div className="text-xl font-bold text-foreground tabular-nums">
            {rangliste.abstandZuPlatzEins != null ? `-${formatPoints(Math.abs(rangliste.abstandZuPlatzEins))}` : '–'}
          </div>
        </div>
        <div className="w-px self-stretch bg-border" />
        <div className="text-center">
          <div className="text-xs text-muted">Abstand zur Preisgeldgrenze</div>
          <div className={`text-xl font-bold tabular-nums ${(rangliste.abstandZurPreisgeldGrenze ?? 0) >= 0 ? 'text-defender' : 'text-striker'}`}>
            {rangliste.abstandZurPreisgeldGrenze != null
              ? `${rangliste.abstandZurPreisgeldGrenze >= 0 ? '+' : ''}${formatPoints(rangliste.abstandZurPreisgeldGrenze)}`
              : '–'}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        {rangliste.hatOben && <ClippedRow />}

        {eintraege.map((e, i) => (
          <div key={e.managerId} className="contents">
            {renderRow(e, false, i)}
            {e.platz === grenze && <Preisgeldgrenze />}
          </div>
        ))}

        {rangliste.hatUnten && <ClippedRow />}
      </div>
    </div>
  )
}

function ClippedRow() {
  return (
    <div
      className="w-full flex items-center justify-center gap-3 bg-stat-card border border-border"
      style={{ borderRadius: 6, opacity: 0.45, padding: '5px 12px' }}
      aria-hidden="true"
    >
      <span className="h-2 w-8 rounded bg-card-muted" />
      <span className="h-2 flex-1 rounded bg-card-muted" />
      <span className="h-2 w-6 rounded bg-card-muted" />
    </div>
  )
}

function Preisgeldgrenze() {
  return (
    <div className="flex items-center gap-2 my-1">
      <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-stat-accent)' }} />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-stat-accent">Preisgeldgrenze</span>
      <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-stat-accent)' }} />
    </div>
  )
}

function Verteilung({
  verteilung,
  eigenerWert,
}: {
  verteilung: { von: number; bis: number; anzahl: number }[]
  eigenerWert: number
}) {
  const maxCount = Math.max(1, ...verteilung.map(v => v.anzahl))

  return (
    <div className="w-full max-w-2xl mx-auto">
      <p className="text-center text-sm text-muted mb-4">
        Verteilung der Kaderwerte aller Manager · Dein Wert: {formatMillionsShort(eigenerWert)}
      </p>
      <div className="flex items-end gap-1.5 h-40">
        {verteilung.map(v => {
          const own = eigenerWert >= v.von && eigenerWert < v.bis
          const isLast = v.bis >= verteilung[verteilung.length - 1].bis
          const containsOwn = (own || (isLast && eigenerWert >= v.von))
          const active = own || containsOwn
          return (
            <div
              key={`${v.von}-${v.bis}`}
              className="flex-1 flex flex-col items-center justify-end h-full gap-1"
              title={`${formatMillionsShort(v.von)} – ${formatMillionsShort(v.bis)}`}
            >
              <div
                className="w-full rounded-[4px]"
                style={{
                  height: `${Math.round((v.anzahl / maxCount) * 100)}%`,
                  backgroundColor: active ? 'var(--color-stat-accent)' : 'var(--color-border)',
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-muted">
        <span>{formatMillionsShort(verteilung[0]?.von ?? 0)}</span>
        <span>{formatMillionsShort(verteilung[verteilung.length - 1]?.bis ?? 0)}</span>
      </div>
    </div>
  )
}
