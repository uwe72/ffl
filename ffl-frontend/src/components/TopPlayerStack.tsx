import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency } from '../utils/format'

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export interface TopPlayer {
  rank: number
  name: string
  points: number
  marketValue: number
  position: string
  teamName: string
  pictureUrl?: string
  teamLogoUrl?: string
}

interface TopPlayerStackProps {
  players: TopPlayer[]
  interval?: number
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const CARD_HEIGHT = 106
const OFFSET_Y = 9
const MAX_VISIBLE_BEHIND = 3

export default function TopPlayerStack({ players, interval = 5000 }: TopPlayerStackProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const count = players.length

  const c = {
    card: cssVar('--ffl-surface', '#ffffff'),
    border: cssVar('--ffl-border-subtle', '#e7e5e4'),
    accent: cssVar('--ffl-accent', '#c2410c'),
    muted: cssVar('--ffl-surface-sunken', '#f5f5f4'),
    text: cssVar('--ffl-text', '#1c1917'),
    textMuted: cssVar('--ffl-text-muted', '#57534e'),
    dotInactive: cssVar('--ffl-border-strong', '#a8a29e'),
  }

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    if (reducedMotion || count < 2) return
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % count)
    }, interval)
  }, [clearTimer, reducedMotion, count, interval])

  useEffect(() => {
    if (!isPaused) {
      startTimer()
    } else {
      clearTimer()
    }
    return clearTimer
  }, [isPaused, startTimer, clearTimer])

  const advance = useCallback(() => {
    if (count < 2) return
    setActiveIndex(prev => (prev + 1) % count)
    if (!isPaused) startTimer()
  }, [count, isPaused, startTimer])

  const goTo = useCallback((idx: number) => {
    setActiveIndex(idx)
    if (!isPaused) startTimer()
  }, [isPaused, startTimer])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      advance()
    }
  }, [advance])

  if (players.length === 0) return null

  const containerHeight = CARD_HEIGHT + MAX_VISIBLE_BEHIND * OFFSET_Y

  const transitionValue = reducedMotion
    ? 'none'
    : 'transform 480ms cubic-bezier(0.22, 0.8, 0.3, 1), opacity 480ms ease'

  return (
    <div>
      <div
        style={{ position: 'relative', height: containerHeight, cursor: count > 1 ? 'pointer' : 'default' }}
        onClick={advance}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Topspieler Kartenstapel"
      >
        {players.map((player, i) => {
          const off = (i - activeIndex + count) % count
          const translateX = off * 17
          const translateY = off * -9
          const scale = 1 - off * 0.045
          const zIndex = count - off
          const opacity = off > MAX_VISIBLE_BEHIND ? 0 : 1

          return (
            <div
              key={`${player.rank}-${player.name}`}
              style={{
                position: 'absolute',
                top: MAX_VISIBLE_BEHIND * OFFSET_Y,
                left: 0,
                right: 0,
                transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                zIndex,
                opacity,
                transition: transitionValue,
                background: c.card,
                border: `1px solid ${c.border}`,
                borderLeft: `3px solid ${c.accent}`,
                borderRadius: 0,
                padding: 14,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {player.pictureUrl ? (
                  <img
                    src={player.pictureUrl}
                    alt={player.name}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: c.muted,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 16,
                      fontWeight: 600,
                      color: c.textMuted,
                    }}
                  >
                    {getInitials(player.name)}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {player.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 12, color: c.textMuted }}>
                    {player.teamLogoUrl && (
                      <img
                        src={player.teamLogoUrl}
                        alt=""
                        style={{ width: 16, height: 16, flexShrink: 0 }}
                      />
                    )}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {player.teamName}{player.teamName && player.position ? ' · ' : ''}{player.position}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 26, fontWeight: 500, color: c.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {Math.round(player.points).toLocaleString('de-DE')}
                  </div>
                  <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                    Punkte
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderTop: `0.5px solid ${c.muted}`,
                  marginTop: 10,
                  paddingTop: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: c.textMuted,
                }}
              >
                <span>Platz {player.rank}</span>
                <span>{formatCurrency(player.marketValue)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {count > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {players.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Spieler ${i + 1} von ${count} anzeigen`}
              onClick={(e) => {
                e.stopPropagation()
                goTo(i)
              }}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === activeIndex ? c.accent : c.dotInactive,
                transition: reducedMotion ? 'none' : 'background 200ms ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
