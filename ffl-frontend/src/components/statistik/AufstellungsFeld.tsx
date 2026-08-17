import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Aufstellung, SpielerAufstellung } from '../../types/dashboard'
import { positionLabels } from '../../utils/positions'
import { formatPoints, formatMillions, formatMillionsShort } from '../../utils/format'

type FeldModus = 'gesamt' | 'spieltag' | 'wert'

const POSITION_COLOR: Record<string, string> = {
  GOALKEEPER: 'var(--color-goalkeeper)',
  DEFENDER: 'var(--color-defender)',
  MIDFIELD: 'var(--color-midfield)',
  STRIKER: 'var(--color-striker)',
}

const ROWS = [
  { position: 'STRIKER', label: 'Sturm', top: '6%' },
  { position: 'MIDFIELD', label: 'Mittelfeld', top: '34%' },
  { position: 'DEFENDER', label: 'Abwehr', top: '62%' },
  { position: 'GOALKEEPER', label: 'Torwart', top: '86%' },
] as const

function bigOf(p: SpielerAufstellung, modus: FeldModus): number {
  if (modus === 'wert') return p.marktwert
  if (modus === 'spieltag') return p.punkteSpieltag
  return p.punkteGesamt
}

function bigText(p: SpielerAufstellung, modus: FeldModus): string {
  if (modus === 'wert') return formatMillionsShort(p.marktwert)
  return formatPoints(bigOf(p, modus))
}

function useMedia(query: string): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }, [query])
}

interface StatPlayerCardProps {
  player: SpielerAufstellung
  modus: FeldModus
  width: number | string
  height: number
  compact: boolean
}

function StatPlayerCard({ player, modus, width, height, compact }: StatPlayerCardProps) {
  const [flipped, setFlipped] = useState(false)
  const canHover = useMedia('(hover: hover)')
  const reduceMotion = useMedia('(prefers-reduced-motion: reduce)')
  const posColor = POSITION_COLOR[player.position] ?? 'var(--color-goalkeeper)'

  const handleEnter = () => {
    if (canHover && !reduceMotion) setFlipped(true)
  }
  const handleLeave = () => {
    if (canHover && !reduceMotion) setFlipped(false)
  }
  const handleToggle = () => setFlipped(f => !f)

  const front = (
    <div
      className="relative w-full h-full bg-stat-card border border-border overflow-hidden"
      style={{ borderRadius: 6 }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: posColor }} />
      {player.joker && !compact && (
        <span className="absolute top-1 right-1 text-[8px] font-bold leading-none px-1 py-0.5 rounded-badge bg-stat-accent text-white">
          J
        </span>
      )}
      <div className="absolute inset-x-0 top-2 px-2 text-center" style={{ transform: 'translateY(0)' }}>
        <div className="text-[11px] font-semibold text-foreground truncate leading-tight">{player.name}</div>
        <div className="text-[9px] text-muted truncate leading-tight">{player.verein}</div>
      </div>
      <div className="absolute bottom-1 left-2 text-lg font-bold text-foreground tabular-nums leading-none">
        {bigText(player, modus)}
      </div>
      {modus === 'gesamt' && player.punkteSpieltag > 0 && (
        <span className="absolute bottom-1 right-1 text-[9px] font-semibold text-white bg-stat-accent rounded-full px-1 py-0.5 leading-none">
          +{formatPoints(player.punkteSpieltag)}
        </span>
      )}
    </div>
  )

  const back = (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ borderRadius: 6, backgroundColor: posColor, color: '#fafaf9' }}
    >
      <div className="flex flex-col items-center justify-center w-full h-full px-1 text-center gap-0.5">
        <div className="text-[10px] font-semibold leading-tight">
          {positionLabels[player.position] ?? player.position}
        </div>
        <div className="text-[9px] leading-tight">Tore: {player.tore}</div>
        <div className="text-[9px] leading-tight">Zu Null: {player.zuNull}</div>
        <div className="text-[9px] leading-tight">{formatMillionsShort(player.marktwert)}</div>
      </div>
    </div>
  )

  const faceContainer: CSSProperties = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      aria-label={player.name}
      className="relative block p-0 border-0 bg-transparent cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={{ width, height }}
    >
      <div className="relative w-full h-full" style={{ perspective: '600px' }}>
        {reduceMotion ? (
          <div className="relative w-full h-full">
            <div
              className="absolute inset-0 transition-opacity duration-200"
              style={{ opacity: flipped ? 0 : 1 }}
            >
              {front}
            </div>
            <div
              className="absolute inset-0 transition-opacity duration-200"
              style={{ opacity: flipped ? 1 : 0 }}
            >
              {back}
            </div>
          </div>
        ) : (
          <div
            className="relative w-full h-full transition-transform duration-300 ease-in-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            <div style={faceContainer}>{front}</div>
            <div style={{ ...faceContainer, transform: 'rotateY(180deg)' }}>{back}</div>
          </div>
        )}
      </div>
    </button>
  )
}

interface AufstellungsFeldProps {
  aufstellung: Aufstellung
  modus: FeldModus
  compact?: boolean
  showLegend?: boolean
  reducedMotion?: boolean
}

export default function AufstellungsFeld({
  aufstellung,
  modus,
  compact = false,
  showLegend = true,
}: AufstellungsFeldProps) {
  const reduceMotion = useMedia('(prefers-reduced-motion: reduce)')
  const canHover = useMedia('(hover: hover)')

  const grouped = useMemo(() => {
    const map: Record<string, SpielerAufstellung[]> = { STRIKER: [], MIDFIELD: [], DEFENDER: [], GOALKEEPER: [] }
    for (const s of aufstellung.spieler) {
      if (map[s.position]) map[s.position].push(s)
    }
    return map
  }, [aufstellung.spieler])

  const sum = aufstellung.spieler.reduce((a, s) => a + bigOf(s, modus), 0)

  const centerBig = modus === 'wert' ? formatMillions(sum) : formatPoints(sum)
  const centerLabel =
    modus === 'wert'
      ? `Kaderwert · ${formatMillionsShort(aufstellung.budget)} Budget`
      : modus === 'spieltag'
        ? 'Punkte am Spieltag'
        : 'Punkte gesamt'

  const cardWidth = (count: number) => {
    if (compact) return count >= 4 ? 40 : 46
    return count >= 4 ? 62 : 'clamp(74px, 15vw, 104px)'
  }
  const cardHeight = compact ? 52 : 84
  const rowGap = compact ? 6 : 10
  let cardIndex = 0

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div
        className="relative overflow-hidden"
        style={{ width: compact ? '100%' : 'min(100%, 460px)', aspectRatio: '100/140' }}
      >
        <svg
          viewBox="0 0 100 140"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
        >
          <rect width="100" height="140" style={{ fill: 'var(--color-pitch)' }} />
          <rect y="0" width="100" height="17.5" style={{ fill: 'var(--color-pitch-stripe)' }} />
          <rect y="35" width="100" height="17.5" style={{ fill: 'var(--color-pitch-stripe)' }} />
          <rect y="70" width="100" height="17.5" style={{ fill: 'var(--color-pitch-stripe)' }} />
          <rect y="105" width="100" height="17.5" style={{ fill: 'var(--color-pitch-stripe)' }} />
          <rect x="2" y="2" width="96" height="136" fill="none" style={{ stroke: 'var(--color-pitch-line)', strokeWidth: 1 }} />
          <line x1="50" y1="2" x2="50" y2="138" style={{ stroke: 'var(--color-pitch-line)', strokeWidth: 1 }} />
          <circle cx="50" cy="70" r="9" fill="none" style={{ stroke: 'var(--color-pitch-line)', strokeWidth: 1 }} />
          <rect x="2" y="26" width="96" height="14" fill="none" style={{ stroke: 'var(--color-pitch-line)', strokeWidth: 1 }} />
          <rect x="2" y="100" width="96" height="14" fill="none" style={{ stroke: 'var(--color-pitch-line)', strokeWidth: 1 }} />
          <rect x="2" y="38" width="96" height="5" fill="none" style={{ stroke: 'var(--color-pitch-line)', strokeWidth: 1 }} />
          <rect x="2" y="97" width="96" height="5" fill="none" style={{ stroke: 'var(--color-pitch-line)', strokeWidth: 1 }} />
        </svg>

        {!compact && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
            aria-hidden="true"
          >
            <div className="text-[26px] font-bold text-on-dark tabular-nums leading-none">{centerBig}</div>
            <div className="text-[10px] text-on-dark-muted mt-0.5">{centerLabel}</div>
          </div>
        )}

        {ROWS.map(row => {
          const players = grouped[row.position]
          if (!players || players.length === 0) return null
          return (
            <div
              key={row.position}
              className="absolute left-0 right-0 flex justify-center"
              style={{ top: row.top, transform: 'translateY(-50%)', gap: rowGap }}
            >
              {players.map(player => {
                const idx = cardIndex++
                return (
                  <div
                    key={player.id}
                    style={{
                      animation: reduceMotion
                        ? undefined
                        : `stat-rise 0.35s cubic-bezier(0.16, 1, 0.3, 1) both`,
                      animationDelay: reduceMotion ? undefined : `${idx * 55}ms`,
                    }}
                  >
                    <StatPlayerCard
                      player={player}
                      modus={modus}
                      width={cardWidth(players.length)}
                      height={cardHeight}
                      compact={compact}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {showLegend && (
        <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-muted">
          {ROWS.map(row => (
            <span key={row.position} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: POSITION_COLOR[row.position] }} />
              {row.label}
            </span>
          ))}
        </div>
      )}

      {!compact && (
        <p className="text-xs text-muted">
          {canHover ? 'Anklicken zum Umdrehen' : 'Antippen zum Umdrehen'}
        </p>
      )}
    </div>
  )
}
