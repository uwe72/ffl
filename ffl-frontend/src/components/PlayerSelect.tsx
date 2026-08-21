import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Player, Position } from '../types'
import { positionLabels, positionColors } from '../pages/Players'
import { positionBarColor } from '../utils/positions'
import EmptySlotCard from './EmptySlotCard'
import PlayerTable from './PlayerTable'

export interface PlayerSlot {
  key: string
  label: string
  position: Position
}

const POSITION_LABELS: Record<Position, string> = {
  GOALKEEPER: 'TW',
  DEFENDER: 'ABW',
  MIDFIELD: 'MF',
  STRIKER: 'ST',
}

export default function PlayerSelect({
  slot,
  players,
  selectedIds,
  value,
  onChange,
  disabled,
  highlightClass,
  badge,
  modal,
  fixedPosition,
}: {
  slot: PlayerSlot
  players: Player[]
  selectedIds: Set<number>
  value: number | null
  onChange: (id: number | null) => void
  disabled?: boolean
  highlightClass?: string
  badge?: string
  modal?: boolean
  fixedPosition?: Position | null
}) {
  const tableFixedPosition = fixedPosition === undefined ? slot.position : fixedPosition
  const [search, setSearch] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedPlayer = useMemo(
    () => (value ? players.find(p => p.id === value) : null),
    [value, players]
  )

  const filteredPlayers = useMemo(() => {
    let filtered = players.filter(p => p.position === slot.position)

    filtered = filtered.filter(p => p.id === value || !selectedIds.has(p.id))

    if (search.trim()) {
      const term = search.toLowerCase()
      filtered = filtered.filter(p =>
        p.nameKicker.toLowerCase().includes(term) ||
        (p.firstName && p.firstName.toLowerCase().includes(term)) ||
        (p.lastName && p.lastName.toLowerCase().includes(term)) ||
        (p.teams && p.teams.length > 0 && p.teams[p.teams.length - 1].name.toLowerCase().includes(term))
      )
    }

    const min = priceMin ? Number(priceMin) : 0
    const max = priceMax ? Number(priceMax) : Infinity
    if (min > 0 || max < Infinity) {
      filtered = filtered.filter(p => p.prize >= min && p.prize <= max)
    }

    return filtered.sort((a, b) => a.nameKicker.localeCompare(b.nameKicker))
  }, [players, slot.position, selectedIds, value, search, priceMin, priceMax])

  const excludedIds = useMemo(() => {
    const set = new Set(selectedIds)
    if (value != null) set.delete(value)
    return set
  }, [selectedIds, value])

  const closeModal = () => {
    setIsOpen(false)
    setSearch('')
    setPriceMin('')
    setPriceMax('')
  }

  useEffect(() => {
    if (!modal) {
      const handleClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false)
          setSearch('')
          setPriceMin('')
          setPriceMax('')
        }
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [modal])

  useEffect(() => {
    if (!isOpen || !modal) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, modal])

  const handleSelect = (player: Player) => {
    onChange(player.id)
    setIsOpen(false)
    setSearch('')
    setPriceMin('')
    setPriceMax('')
  }

  const handleClear = () => {
    onChange(null)
  }

  if (selectedPlayer) {
    const team = selectedPlayer.teams && selectedPlayer.teams.length > 0 ? selectedPlayer.teams[selectedPlayer.teams.length - 1] : null
    const priceLabel = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(selectedPlayer.prize)
    return (
      <div className={`group relative overflow-hidden bg-surface border border-border rounded-none p-3 pl-4 flex items-center gap-2 transition-colors hover:border-border-hover ${highlightClass || ''}`}>
        {!disabled ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={`${selectedPlayer.nameKicker} entfernen`}
            title="Entfernen"
            className="group/bar absolute left-0 top-0 bottom-0 w-4 flex items-center justify-start cursor-pointer hover:bg-accent-soft/40 transition-colors"
          >
            <span className={`w-[3px] h-full ${positionBarColor[selectedPlayer.position]} group-hover/bar:w-[5px] transition-all`} />
          </button>
        ) : (
          <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${positionBarColor[selectedPlayer.position]}`} />
        )}
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={`${selectedPlayer.nameKicker} entfernen`}
            title="Entfernen"
            className="hidden sm:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-danger hover:bg-danger-hover text-danger-foreground items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
          >
            <i className="sap-icon sap-icon-decline text-base" />
          </button>
        )}
        <div className="relative shrink-0">
          {selectedPlayer.pictureUrl ? (
            <img src={selectedPlayer.pictureUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center">
              <span className="text-[10px] text-muted">{POSITION_LABELS[selectedPlayer.position]}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground leading-6 truncate">
            {selectedPlayer.firstName && selectedPlayer.lastName
              ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}`
              : selectedPlayer.nameKicker}
          </p>
          <p className="text-sm font-medium text-muted tabular-nums leading-5">{priceLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {team?.logoSUrl && (
            <img src={team.logoSUrl} alt={team.name} className="w-7 h-7 object-contain rounded-card" />
          )}
          {badge && (
            <span className="text-[10px] font-semibold text-accent border border-accent rounded-badge px-1 py-0.5 leading-none">{badge}</span>
          )}
        </div>
      </div>
    )
  }

  if (disabled) {
    return <EmptySlotCard label={slot.label} disabled ariaLabel={`${slot.label} wählen (gesperrt)`} />
  }

  return (
    <div ref={containerRef} className="relative">
      <EmptySlotCard
        label={slot.label}
        onClick={() => {
          setIsOpen(!isOpen)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        ariaLabel={`${slot.label} wählen`}
      />

      {isOpen && modal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={closeModal}
        >
          <div
            className="bg-surface border border-border rounded-card shadow-2xl w-full max-w-[760px] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">{slot.label}</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Schließen"
                className="text-subtle hover:text-foreground transition-colors p-1 -mr-1"
              >
                <i className="sap-icon sap-icon-decline text-[18px]" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              <PlayerTable
                players={players}
                fixedPosition={tableFixedPosition === null ? undefined : tableFixedPosition}
                excludePlayerIds={excludedIds}
                onSelect={handleSelect}
                defaultSortKey="prize"
                defaultSortOrder="asc"
                defaultAktivFilter="aktiv"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {isOpen && !modal && (
        <div className="absolute z-50 mt-1 min-w-[380px] w-full bg-surface border border-border rounded-card shadow-xl max-h-[320px] flex flex-col">
          <div className="p-2 border-b border-border space-y-1.5">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Spieler suchen..."
              className="input-field control w-full px-2 py-1.5 rounded-badge text-xs focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="Min €"
                className="input-field control w-1/2 px-2 py-1 rounded-badge text-[11px] focus:outline-none"
              />
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Max €"
                className="input-field control w-1/2 px-2 py-1 rounded-badge text-[11px] focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredPlayers.length === 0 ? (
              <div className="px-3 py-4 text-center text-subtle text-xs">Keine Spieler gefunden</div>
            ) : (
              filteredPlayers.map(player => {
                const team = player.teams && player.teams.length > 0 ? player.teams[player.teams.length - 1] : null
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handleSelect(player)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-elevated transition-colors flex items-center justify-between gap-3 ${
                      player.id === value ? 'bg-accent-muted' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {player.pictureUrl && (
                        <img src={player.pictureUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                      )}
                      <span className="text-foreground whitespace-nowrap">{player.nameKicker}</span>
                      <span className={`${positionColors[player.position]} text-[10px] font-medium px-1.5 py-0.5 rounded-badge`}>{positionLabels[player.position]}</span>
                      {team && (
                        <span className="text-subtle text-[11px] whitespace-nowrap">
                          {team.shortName || team.name}
                        </span>
                      )}
                    </div>
                    <span className="text-accent text-[11px] font-semibold shrink-0">{player.prize.toLocaleString('de-DE')} €</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
