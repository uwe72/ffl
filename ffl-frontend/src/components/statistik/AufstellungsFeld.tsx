import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
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
      <div className="absolute inset-x-0 top-2 px-1.5 text-center">
        <div className="text-[12px] font-semibold text-foreground truncate leading-tight">{player.name}</div>
        <div className="text-[10px] font-semibold text-muted truncate leading-tight">{player.vereinKuerzel}</div>
      </div>
      <div className="absolute bottom-1.5 left-2 text-xl font-bold text-foreground tabular-nums leading-none">
        {bigText(player, modus)}
      </div>
      {modus === 'gesamt' && player.punkteSpieltag > 0 && (
        <span className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold text-white bg-stat-accent rounded-full px-1.5 py-0.5 leading-none">
          +{formatPoints(player.punkteSpieltag)}
        </span>
      )}
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
    const map: Record<string, SpielerAufstellung[]> = { GOALKEEPER: [], DEFENDER: [], MIDFIELD: [], STRIKER: [] }
    for (const s of aufstellung.spieler) {
      if (map[s.position]) map[s.position].push(s)
    }
    return map
  }, [aufstellung.spieler])

  const sum = aufstellung.spieler.reduce((a, s) => a + bigOf(s, modus), 0)

  const sumBig = modus === 'wert' ? formatMillionen(sum) : formatPoints(sum)
  const sumLabel = modus === 'wert' ? 'Kaderwert' : modus === 'spieltag' ? 'Punkte Spieltag' : 'Punkte gesamt'

  const cardWidth = compact ? 64 : 'clamp(92px, 10vw, 112px)'
  const cardHeight = compact ? 64 : 116
  let cardIndex = 0

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="w-full px-2">
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: '2752 / 1536',
            maxHeight: 520,
            borderRadius: 6,
            border: '1px solid var(--color-pitch-line)',
            backgroundImage: 'url(/stadion.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }} aria-hidden="true" />

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
        </div>
      </div>

      {showLegend && (
        <div className="w-full px-2 flex items-center justify-between gap-3 flex-wrap">
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
