import { useState, useEffect, useRef, useMemo } from 'react'
import type { Player, Position } from '../types'

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
}: {
  slot: PlayerSlot
  players: Player[]
  selectedIds: Set<number>
  value: number | null
  onChange: (id: number | null) => void
  disabled?: boolean
}) {
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

  useEffect(() => {
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
  }, [])

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
    return (
      <div className="group bg-elevated/50 border border-border/60 rounded-lg p-2 flex items-center gap-2">
        <div className="relative shrink-0">
          {selectedPlayer.pictureUrl ? (
            <img src={selectedPlayer.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center">
              <span className="text-[9px] text-muted">{POSITION_LABELS[selectedPlayer.position]}</span>
            </div>
          )}
          {!disabled && (
            <button
              onClick={handleClear}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Entfernen"
            >
              <i className="sap-icon sap-icon-decline text-[11px] text-red-400" />
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground leading-tight truncate">
            {selectedPlayer.firstName && selectedPlayer.lastName
              ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}`
              : selectedPlayer.nameKicker}
          </p>
          <p className="text-[11px] text-muted mt-0.5">{selectedPlayer.prize.toLocaleString('de-DE')} €</p>
        </div>
        {team?.logoSUrl ? (
          <img src={team.logoSUrl} alt={team.name} className="w-8 h-8 object-contain shrink-0" />
        ) : (
          <div className="w-8 h-8 shrink-0" />
        )}
      </div>
    )
  }

  if (disabled) {
    return (
      <div className="input-field w-full px-3 py-2 rounded text-xs flex items-center justify-between text-placeholder opacity-50">
        <span>{slot.label} wählen...</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="input-field w-full px-3 py-2 rounded text-xs cursor-pointer flex items-center justify-between text-placeholder"
        onClick={() => {
          setIsOpen(!isOpen)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
      >
        <span>{slot.label} wählen...</span>
        <i className="sap-icon sap-icon-slim-arrow-down text-[10px] text-muted" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-[380px] w-full bg-surface border border-border rounded-lg shadow-xl max-h-[320px] flex flex-col">
          <div className="p-2 border-b border-border space-y-1.5">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Spieler suchen..."
              className="input-field w-full px-2 py-1.5 rounded text-xs focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="Min €"
                className="input-field w-1/2 px-2 py-1 rounded text-[11px] focus:outline-none"
              />
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Max €"
                className="input-field w-1/2 px-2 py-1 rounded text-[11px] focus:outline-none"
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
