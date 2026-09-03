import { useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Aufstellung, SpielerAufstellung } from '../../types/dashboard'
import FallblattTafel from './FallblattTafel'
import { formatPoints, formatMillionen, formatMillionsShort } from '../../utils/format'
import { positionLabels } from '../../utils/positions'
import useElementSize from '../../hooks/useElementSize'

const CARD_W = 142
const CARD_H = 146
const PAD_H = 20
const PAD_V = 28
const GAP_V = 24
const BADGE_PROTRUDE = 12
const FIELD_RATIO = 2752 / 1536
const MAX_FIELD_W = 1252
const MIN_FIELD_W = 900
const DESIGN_COL_H = 2 * PAD_V + 4 * CARD_H + 3 * GAP_V
const DESIGN_ROW_W = 2 * PAD_H + 4 * (CARD_W + 2 * BADGE_PROTRUDE)

type FeldModus = 'gesamt' | 'spieltag' | 'wert'

const POSITION_COLOR: Record<string, string> = {
  GOALKEEPER: 'var(--color-goalkeeper)',
  DEFENDER: 'var(--color-defender)',
  MIDFIELD: 'var(--color-midfield)',
  STRIKER: 'var(--color-striker)',
}

const BADGE_RING = '0 0 0 3px var(--color-accent-ring)'
const BADGE_SHADOW = '0 2px 8px rgba(0, 0, 0, 0.28)'

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
  pictureScale?: number
  mobile?: boolean
}

export function StatPlayerCard({ player, modus, width, height, compact, pictureScale = 1, mobile = false }: StatPlayerCardProps) {
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
  ) : mobile ? (
    <div
      className="relative w-full h-full bg-stat-card border border-border overflow-hidden flex flex-col items-center justify-center gap-2 px-1"
      style={{ borderRadius: 6 }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: posColor }} />
      <div className="relative flex-shrink-0">
        {player.pictureUrl ? (
          <img
            src={player.pictureUrl}
            alt={fullName}
            className="rounded-full object-cover border border-border"
            style={{ width: 67 * pictureScale, height: 67 * pictureScale }}
          />
        ) : (
          <div
            className="rounded-full bg-elevated border border-border flex items-center justify-center"
            style={{ width: 67 * pictureScale, height: 67 * pictureScale }}
          >
            <i className="sap-icon sap-icon-employee text-[26px] text-subtle" />
          </div>
        )}
        {player.vereinLogoUrl && (
          <img
            src={player.vereinLogoUrl}
            alt={player.vereinKuerzel}
            className="absolute -bottom-1 -right-1 rounded-full bg-white border border-border object-contain"
            style={{ width: 26 * pictureScale, height: 26 * pictureScale }}
          />
        )}
      </div>
      <div className="text-[12px] font-semibold text-foreground truncate leading-tight max-w-full">{fullName}</div>
    </div>
  ) : (
    <div
      className="relative w-full h-full bg-stat-card border border-border overflow-hidden flex flex-col"
      style={{ borderRadius: 6 }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: posColor }} />
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-1 min-h-0">
        <div className="relative flex-shrink-0">
          {player.pictureUrl ? (
            <img
              src={player.pictureUrl}
              alt={fullName}
              className="rounded-full object-cover border border-border"
              style={{ width: 92 * pictureScale, height: 92 * pictureScale }}
            />
          ) : (
            <div
              className="rounded-full bg-elevated border border-border flex items-center justify-center"
              style={{ width: 92 * pictureScale, height: 92 * pictureScale }}
            >
              <i className="sap-icon sap-icon-employee text-[26px] text-subtle" />
            </div>
          )}
          {player.vereinLogoUrl && (
            <img
              src={player.vereinLogoUrl}
              alt={player.vereinKuerzel}
              className="absolute -bottom-1 -right-1 rounded-full bg-white border border-border object-contain"
              style={{ width: 31 * pictureScale, height: 31 * pictureScale }}
            />
          )}
        </div>
        <div className="text-[12px] font-semibold text-foreground truncate leading-tight max-w-full">{fullName}</div>
      </div>
      <div>
        <div className="px-2 pt-0.5 pb-2 text-center">
          <div className="text-[11px] font-semibold text-foreground">{positionLabels[player.position]}</div>
        </div>
      </div>
    </div>
  )

  const back = mobile ? (
    <div
      className="relative w-full h-full overflow-hidden flex flex-col bg-surface"
      style={{ borderRadius: 6, borderTop: `3px solid ${posColor}` }}
    >
      <div className="flex-1 min-h-0 flex flex-col justify-center px-3 py-2">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-muted mb-1.5">Punkte</div>
        <div className="flex items-baseline justify-between text-[13px] mb-1.5">
          <span className="text-subtle">Gesamt</span>
          <span className="font-bold text-foreground tabular-nums">{formatPoints(player.punkteGesamt)}</span>
        </div>
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="text-subtle">Spieltag</span>
          <span className="font-bold text-foreground tabular-nums">{formatPoints(player.punkteSpieltag)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-elevated px-3 py-2">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">Preis</span>
        <span className="text-[13px] font-bold text-foreground tabular-nums">{formatMillionsShort(player.marktwert)} €</span>
      </div>
    </div>
  ) : (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        borderRadius: 6,
        backgroundColor: 'var(--color-background)',
        borderTop: `3px solid ${posColor}`,
      }}
    >
      {player.pictureUrl ? (
        <img src={player.pictureUrl} alt={fullName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[#fafaf9]">
          <i className="sap-icon sap-icon-employee text-[28px] opacity-80" />
          <div className="text-[11px] font-semibold px-1 truncate max-w-full">{fullName}</div>
        </div>
      )}
      <div className="absolute bottom-1.5 inset-x-0 flex justify-center pointer-events-none">
        <span className="text-[11px] font-bold text-[#fafaf9] bg-black rounded-full px-2 py-0.5 tabular-nums">
          {formatMillionsShort(player.marktwert)} €
        </span>
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
      className="relative block p-0 border-0 bg-transparent cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent stat-player-card"
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

      {!compact && (
        <>
          <div
            className="stat-card-badge absolute z-20 flex items-center justify-center leading-none"
            style={{
              top: 'calc(var(--badge-offset, 12px) * -1)',
              right: 'calc(var(--badge-offset, 12px) * -1)',
              minWidth: 37,
              borderRadius: 8,
              backgroundColor: 'var(--color-accent)',
              boxShadow: `${BADGE_RING}, ${BADGE_SHADOW}`,
              padding: '6px 6px',
            }}
          >
            <span className="text-white font-bold tabular-nums" style={{ fontSize: 12 }}>
              {formatPoints(player.punkteGesamt)}
            </span>
          </div>

          {player.punkteSpieltag > 0 && (
            <div
              className="stat-card-badge absolute z-20 flex items-center justify-center font-bold tabular-nums leading-none"
              style={{
                left: 'calc(var(--badge-offset, 12px) * -1)',
                top: mobile ? 'calc(var(--badge-offset, 12px) * -1)' : undefined,
                bottom: mobile ? undefined : 'calc(var(--badge-offset, 12px) * -1)',
                minWidth: 37,
                borderRadius: 8,
                padding: '6px 6px',
                fontSize: 12,
                backgroundColor: 'var(--color-stat-accent)',
                color: 'var(--color-text-on-accent, #fafaf9)',
                boxShadow: `${BADGE_RING}, ${BADGE_SHADOW}`,
              }}
            >
              +{player.punkteSpieltag}
            </div>
          )}
        </>
      )}
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
  hideSum?: boolean
  maxWidth?: number
}

export default function AufstellungsFeld({
  aufstellung,
  modus,
  compact = false,
  showLegend = true,
  overlayLegend = false,
  overlay,
  hideSum = false,
  maxWidth,
}: AufstellungsFeldProps) {
  const reduceMotion = useMedia('(prefers-reduced-motion: reduce)')
  const canHover = useMedia('(hover: hover)')
  const slotRef = useRef<HTMLDivElement>(null)
  const slotSize = useElementSize(slotRef)

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

  let cardIndex = 0

  const layout = useMemo(() => {
    if (compact || !slotSize || slotSize.height <= 0) {
      return { scale: 1, fieldW: undefined as number | undefined, fieldH: undefined as number | undefined }
    }
    const containW = Math.max(MIN_FIELD_W, Math.min(maxWidth ?? MAX_FIELD_W, slotSize.height * FIELD_RATIO))
    const containH = containW / FIELD_RATIO
    const scale = Math.min(containW / DESIGN_ROW_W, containH / DESIGN_COL_H, 1)
    return { scale, fieldW: containW, fieldH: containH }
  }, [compact, slotSize, maxWidth])

  const scale = layout.scale
  const cardWidth = compact ? 64 : CARD_W * scale
  const cardHeight = compact ? 64 : CARD_H * scale
  const padH = PAD_H * scale
  const padV = PAD_V * scale
  const leftPad = padH

  const fieldSizeStyle: CSSProperties = compact
    ? { aspectRatio: '2752 / 1536', width: '100%' }
    : { width: layout.fieldW, height: layout.fieldH }

  const field = (
    <div
      className={`relative overflow-hidden ${compact ? 'w-full' : 'mr-auto'}`}
      style={{
        ...fieldSizeStyle,
        position: 'relative',
        containerType: 'inline-size',
        borderRadius: 6,
        border: '1px solid var(--color-pitch-line)',
        backgroundImage: 'url(/stadion.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="img-overlay" />
      <FallblattTafel aufstellung={aufstellung} />
      {overlay}
      <div
        className="absolute inset-0 flex"
        style={{ padding: `${padV}px ${padH}px`, paddingLeft: leftPad, justifyContent: 'space-around' }}
      >
        {COLUMNS.map(pos => {
          const players = grouped[pos]
          if (!players || players.length === 0) return null
          return (
            <div
              key={pos}
              className="flex flex-col items-center"
              style={{ justifyContent: 'space-around', minWidth: cardWidth, maxWidth: cardWidth, margin: `0 ${BADGE_PROTRUDE * scale}px` }}
            >
              {players.map(player => {
                const idx = cardIndex++
                return (
                  <div
                    key={player.id}
                    style={{
                      width: cardWidth,
                      height: cardHeight,
                      animation: reduceMotion
                        ? undefined
                        : `stat-rise 0.35s cubic-bezier(0.16, 1, 0.3, 1) both`,
                      animationDelay: reduceMotion ? undefined : `${idx * 55}ms`,
                    }}
                  >
                    {compact ? (
                      <StatPlayerCard player={player} modus={modus} width={64} height={64} compact />
                    ) : (
                      <div style={{ width: CARD_W, height: CARD_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                        <StatPlayerCard player={player} modus={modus} width={CARD_W} height={CARD_H} compact={false} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {!compact && !hideSum && (
        <div
          className="absolute text-right"
          style={{
            top: 12 * scale,
            right: 12 * scale,
            padding: 12 * scale,
            borderRadius: 6,
            backgroundColor: 'var(--color-pitch-block)',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <div
            className="font-bold tabular-nums leading-none"
            style={{ color: '#fafaf9', fontSize: 20 * scale }}
          >
            {sumBig}
          </div>
          <div
            className="font-semibold uppercase"
            style={{
              color: 'var(--color-pitch-block-label)',
              letterSpacing: '0.12em',
              fontSize: 10 * scale,
              marginTop: 4 * scale,
            }}
          >
            {sumLabel}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className={`w-full flex flex-col items-center gap-3${compact ? '' : ' relative h-full min-h-0'}`}>
      {compact ? (
        <div className="w-full">{field}</div>
      ) : (
        <>
          <div ref={slotRef} className="w-full flex-1 min-h-0 flex items-start justify-start">{field}</div>
        </>
      )}

      {showLegend && !overlayLegend && (
        <div className="w-full flex items-center justify-between gap-3 flex-wrap shrink-0">
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
