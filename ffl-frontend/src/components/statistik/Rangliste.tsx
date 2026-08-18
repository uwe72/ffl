import type { Rangliste, RanglistenEintrag } from '../../types/dashboard'
import { formatPoints, formatMillionsShort } from '../../utils/format'

function managerName(e: RanglistenEintrag): string {
  const first = e.firstName?.trim()
  const last = e.lastName?.trim()
  if (first && last) return `${first} ${last}`
  return e.managername || e.teamname
}

function changeInfo(e: RanglistenEintrag): { text: string; cls: string; color: string } {
  if (e.veraenderung > 0) return { text: `+${e.veraenderung}`, cls: 'text-up', color: 'var(--color-up)' }
  if (e.veraenderung < 0) return { text: `${e.veraenderung}`, cls: 'text-down', color: 'var(--color-down)' }
  return { text: '–', cls: 'text-muted', color: 'var(--color-muted)' }
}

interface RanglisteProps {
  rangliste: Rangliste
  activeManagerId?: number | null
  onSelectManager?: (managerId: number) => void
}

export default function Rangliste({
  rangliste,
  activeManagerId,
  onSelectManager,
}: RanglisteProps) {
  const eintraege = rangliste.eintraege ?? []
  const vorsaison = rangliste.phase === 'VORSAISON'
  const grenze = rangliste.preisgeldGrenzePlatz ?? -1

  return (
    <div className="flex flex-col items-center w-full">
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
          <div className={`text-xl font-bold tabular-nums ${(rangliste.abstandZurPreisgeldGrenze ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>
            {rangliste.abstandZurPreisgeldGrenze != null
              ? `${rangliste.abstandZurPreisgeldGrenze >= 0 ? '+' : ''}${formatPoints(rangliste.abstandZurPreisgeldGrenze)}`
              : '–'}
          </div>
        </div>
      </div>

      <div
        className="relative w-full rounded-[6px] overflow-y-auto"
        style={{
          aspectRatio: '2752 / 1536',
          maxHeight: '72vh',
          border: '1px solid var(--color-pitch-line)',
          backgroundImage: 'url(/stadion.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="img-overlay" />
        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
          {eintraege.map(e => (
            <div key={e.managerId} className="relative">
              {e.platz === grenze && <PreisgeldgrenzeTag />}
              <ManagerCard
                e={e}
                active={e.managerId === activeManagerId}
                vorsaison={vorsaison}
                onSelect={onSelectManager}
              />
            </div>
          ))}
        </div>
      </div>
      {onSelectManager && (
        <p className="mt-3 text-xs text-muted">Klicke auf einen Manager, um seine Aufstellung zu sehen</p>
      )}
    </div>
  )
}

function ManagerCard({
  e,
  active,
  vorsaison,
  onSelect,
}: {
  e: RanglistenEintrag
  active: boolean
  vorsaison: boolean
  onSelect?: (managerId: number) => void
}) {
  const change = changeInfo(e)
  const name = managerName(e)
  return (
    <button
      type="button"
      onClick={() => onSelect?.(e.managerId)}
      aria-label={`${name} (${e.teamname}), Platz ${e.platz}`}
      className={`relative w-full text-left transition-colors ${
        onSelect ? 'cursor-pointer hover:border-border-hover' : 'cursor-default'
      }`}
      style={{
        borderRadius: 6,
        border: `1px solid ${active ? 'var(--color-stat-accent)' : 'var(--color-border)'}`,
        borderLeft: `4px solid ${change.color}`,
        padding: '10px 12px',
        backgroundColor: active
          ? 'color-mix(in srgb, var(--color-stat-accent) 7%, var(--color-stat-card))'
          : 'var(--color-stat-card)',
      }}
    >
      <div className="flex items-center gap-2 w-full">
        <span className="tabular-nums text-lg font-bold text-foreground shrink-0">{e.platz}.</span>
        {e.avatarUrl ? (
          <img
            src={e.avatarUrl}
            alt={name}
            className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-elevated border border-border flex items-center justify-center flex-shrink-0">
            <i className="sap-icon sap-icon-employee text-[16px] text-subtle" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground leading-tight">{name}</div>
          <div className="truncate text-[11px] text-subtle leading-tight">({e.teamname})</div>
        </div>
        <span className={`text-xs font-bold tabular-nums shrink-0 ${change.cls}`}>{change.text}</span>
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px]">
        {vorsaison ? (
          <>
            <span className="text-subtle">Kaderwert</span>
            <span className="text-foreground font-semibold tabular-nums">{formatMillionsShort(e.kaderwert ?? 0)}</span>
          </>
        ) : (
          <>
            <span className="text-subtle">
              Gesamt <span className="text-foreground font-semibold tabular-nums">{formatPoints(e.punkteGesamt)}</span>
            </span>
            <span className="text-subtle">
              Spieltag <span className="text-foreground font-semibold tabular-nums">{formatPoints(e.punkteSpieltag)}</span>
            </span>
          </>
        )}
      </div>
    </button>
  )
}

function PreisgeldgrenzeTag() {
  return (
    <span className="absolute -top-2 left-3 z-10 text-[9px] font-semibold uppercase tracking-wide text-white bg-stat-accent rounded-badge px-1.5 py-0.5 leading-none">
      Preisgeldgrenze
    </span>
  )
}
