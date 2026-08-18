import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Aufstellung, SpielerAufstellung } from '../../types/dashboard'
import { formatPoints, formatMillionen, formatMillionsShort } from '../../utils/format'

type FeldModus = 'gesamt' | 'spieltag' | 'wert'

const POSITION_COLOR: Record<string, string> = {
  GOALKEEPER: 'var(--color-goalkeeper)',
  DEFENDER: 'var(--color-defender)',
  MIDFIELD: 'var(--color-midfield)',
  STRIKER: 'var(--color-striker)',
}

const COLUMNS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as const

const LEGEND = [
  { position: 'GOALKEEPER', label: 'Torwart' },
  { position: 'DEFENDER', label: 'Abwehr' },
  { position: 'MIDFIELD', label: 'Mittelfeld' },
  { position: 'STRIKER', label: 'Sturm' },
]

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

  const firstName = player.firstName || ''
  const lastName = player.lastName || player.name
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || player.name

  const front = compact ? (
    <div
      className="relative w-full h-full bg-stat-card border border-border overflow-hidden"
      style={{ borderRadius: 6 }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: posColor }} />
      <div className="absolute inset-x-0 top-1 px-1 text-center">
        <div className="text-[11px] font-semibold text-foreground truncate leading-tight">{lastName}</div>
      </div>
      <div className="absolute bottom-1 left-1.5 text-base font-bold text-foreground tabular-nums leading-none">
        {bigText(player, modus)}
      </div>
    </div>
  ) : (
    <div
      className="relative w-full h-full bg-stat-card border border-border overflow-hidden flex flex-col"
      style={{ borderRadius: 6 }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: posColor }} />
      {player.joker && (
        <span className="absolute top-1 right-1 z-10 text-[8px] font-bold leading-none px-1 py-0.5 rounded-badge bg-stat-accent text-white">
          J
        </span>
      )}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-1 min-h-0">
        <div className="relative flex-shrink-0">
          {player.pictureUrl ? (
            <img
              src={player.pictureUrl}
              alt={fullName}
              className="w-[67px] h-[67px] rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-[67px] h-[67px] rounded-full bg-elevated border border-border flex items-center justify-center">
              <i className="sap-icon sap-icon-employee text-[26px] text-subtle" />
            </div>
          )}
          {player.vereinLogoUrl && (
            <img
              src={player.vereinLogoUrl}
              alt={player.vereinKuerzel}
              className="absolute -bottom-1 -right-1 w-[26px] h-[26px] rounded-full bg-white border border-border object-contain"
            />
          )}
        </div>
        <div className="text-[12px] font-semibold text-foreground truncate leading-tight max-w-full">{fullName}</div>
      </div>
      <div>
        <div className="grid grid-cols-2 px-2 pt-0.5 pb-2">
          <div className="text-center">
            <div className="text-[9px] font-semibold uppercase text-subtle tracking-wide mb-0.5">Gesamt</div>
            <div className="text-[15px] font-bold text-foreground tabular-nums leading-none">{formatPoints(player.punkteGesamt)}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] font-semibold uppercase text-subtle tracking-wide mb-0.5">Spieltag</div>
            <div className="text-[15px] font-bold text-foreground tabular-nums leading-none">{formatPoints(player.punkteSpieltag)}</div>
          </div>
        </div>
      </div>
    </div>
  )

  const back = (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        borderRadius: 6,
        backgroundColor: 'var(--color-background)',
        color: '#fafaf9',
        borderTop: `3px solid ${posColor}`,
      }}
    >
      <div className="flex flex-col items-center justify-center w-full h-full px-1.5 text-center gap-1">
        <div className="text-[12px] font-semibold truncate max-w-full">{player.name}</div>
        <div className="text-[12px] leading-tight">Tore: {player.tore}</div>
        <div className="text-[12px] leading-tight">Zu Null: {player.zuNull}</div>
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
  overlayLegend?: boolean
  overlay?: ReactNode
}

export default function AufstellungsFeld({
  aufstellung,
  modus,
  compact = false,
  showLegend = true,
  overlayLegend = false,
  overlay,
}: AufstellungsFeldProps) {
  const reduceMotion = useMedia('(prefers-reduced-motion: reduce)')
  const canHover = useMedia('(hover: hover)')

  const wrapperRef = useRef<HTMLDivElement>(null)
  const [boxWidth, setBoxWidth] = useState<number | null>(null)

  useEffect(() => {
    if (compact) return
    const el = wrapperRef.current
    if (!el) return
    const compute = () => {
      const top = el.getBoundingClientRect().top
      const availH = Math.max(0, window.innerHeight - top - 64)
      const availW = el.clientWidth
      setBoxWidth(Math.min(availW, availH * (2752 / 1536)))
    }
    compute()
    window.addEventListener('resize', compute)
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => {
      window.removeEventListener('resize', compute)
      ro.disconnect()
    }
  }, [compact])

  const grouped = useMemo(() => {
    const map: Record<string, SpielerAufstellung[]> = { GOALKEEPER: [], DEFENDER: [], MIDFIELD: [], STRIKER: [] }
    for (const s of aufstellung.spieler) {
      if (map[s.position]) map[s.position].push(s)
    }
    return map
  }, [aufstellung.spieler])

  const sum = aufstellung.spieler.reduce((a, s) => a + bigOf(s, modus), 0)

  const sumBig = modus === 'wert' ? formatMillionen(sum) : formatPoints(sum)
  const sumLabel = modus === 'wert' ? 'Kaderwert' : modus === 'spieltag' ? 'Punkte Spieltag' : 'Punkte gesamt'

  const cardWidth = compact ? 64 : 'clamp(118px, 11.2vw, 142px)'
  const cardHeight = compact ? 64 : 146
  let cardIndex = 0

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="w-full" ref={wrapperRef}>
        <div
          className={`relative overflow-hidden ${compact ? 'w-full' : 'mr-auto'}`}
          style={{
            aspectRatio: '2752 / 1536',
            ...(compact
              ? {}
              : { width: boxWidth ? `${boxWidth}px` : '100%' }),
            borderRadius: 6,
            border: '1px solid var(--color-pitch-line)',
            backgroundImage: 'url(/stadion.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="img-overlay" />
          {overlay && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-md bg-pitch-block/80 p-1.5">
              {overlay}
            </div>
          )}
          <div className="absolute inset-0 flex" style={{ padding: '28px 20px', justifyContent: 'space-around' }}>
            {COLUMNS.map(pos => {
              const players = grouped[pos]
              if (!players || players.length === 0) return null
              return (
                <div
                  key={pos}
                  className="flex flex-col items-center"
                  style={{ justifyContent: 'space-around', minWidth: cardWidth, maxWidth: cardWidth }}
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
                          width={cardWidth}
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

          {!compact && (
            <div
              className="absolute text-right"
              style={{
                top: 12,
                right: 12,
                padding: 12,
                borderRadius: 6,
                backgroundColor: 'var(--color-pitch-block)',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              <div className="text-xl font-bold tabular-nums leading-none" style={{ color: '#fafaf9' }}>
                {sumBig}
              </div>
              <div
                className="text-[10px] font-semibold uppercase mt-1"
                style={{ color: 'var(--color-pitch-block-label)', letterSpacing: '0.12em' }}
              >
                {sumLabel}
              </div>
            </div>
          )}

          {overlayLegend && (
            <>
              <div className="absolute bottom-2 left-2 z-10 flex items-center gap-3 rounded-md bg-pitch-block/80 px-2 py-1">
                {LEGEND.map(row => (
                  <span
                    key={row.position}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
                    style={{ color: '#fafaf9' }}
                  >
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: POSITION_COLOR[row.position] }} />
                    {row.label}
                  </span>
                ))}
              </div>
              <div
                className="absolute bottom-2 right-2 z-10 rounded-md bg-pitch-block/80 px-2 py-1 text-[11px] font-semibold"
                style={{ color: 'var(--color-pitch-block-label)', letterSpacing: '0.04em' }}
                aria-hidden="true"
              >
                {canHover ? 'Anklicken zum Umdrehen' : 'Antippen zum Umdrehen'}
              </div>
            </>
          )}
        </div>
      </div>

      {showLegend && !overlayLegend && (
        <div className="w-full flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-muted">
            {LEGEND.map(row => (
              <span key={row.position} className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: POSITION_COLOR[row.position] }} />
                {row.label}
              </span>
            ))}
          </div>
          {!compact && (
            <p className="text-xs text-muted ml-auto">{canHover ? 'Anklicken zum Umdrehen' : 'Antippen zum Umdrehen'}</p>
          )}
        </div>
      )}
    </div>
  )
}
