import { useState, useMemo, useRef, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Search, FilterX, Shield, ShieldHalf, CircleDot, Target, Users } from 'lucide-react'
import { usePlayers } from '../hooks/usePlayers'
import type { Team, Player } from '../types'

export const positionLabels: Record<string, string> = {
  GOALKEEPER: 'Torwart',
  DEFENDER: 'Verteidiger',
  MIDFIELD: 'Mittelfeld',
  STRIKER: 'Stürmer'
}

export const positionColors: Record<string, 'warning' | 'accent' | 'success' | 'danger'> = {
  GOALKEEPER: 'warning',
  DEFENDER: 'accent',
  MIDFIELD: 'success',
  STRIKER: 'danger'
}

const positionChipClass: Record<string, string> = {
  GOALKEEPER: 'chip-warning',
  DEFENDER: 'chip-accent',
  MIDFIELD: 'chip-success',
  STRIKER: 'chip-danger'
}

const positionIcon: Record<string, React.ComponentType<{size?: number; className?: string}>> = {
  GOALKEEPER: Shield,
  DEFENDER: ShieldHalf,
  MIDFIELD: CircleDot,
  STRIKER: Target,
}

const positionChipActiveColors: Record<string, string> = {
  GOALKEEPER: 'bg-warning/15 text-warning border-warning/40',
  DEFENDER: 'bg-accent/15 text-accent border-accent/40',
  MIDFIELD: 'bg-success/15 text-success border-success/40',
  STRIKER: 'bg-danger/15 text-danger border-danger/40',
}

const chipInactive = 'bg-elevated text-muted border-border'

type SortKey = 'positionTotal' | 'positionChange' | 'nameKicker' | 'points' | 'pointsLastRound' | 'managerCount' | 'prize' | 'position'
type SortOrder = 'asc' | 'desc'

interface TeamDropdownProps {
  teams: Team[]
  selectedTeamId: number | 'ALL'
  onSelect: (id: number | 'ALL') => void
}

function TeamDropdown({ teams, selectedTeamId, onSelect }: TeamDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedTeam = teams.find(t => t.id === selectedTeamId)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-40 px-2 py-1.5 rounded bg-elevated border border-border text-foreground text-xs flex items-center justify-between gap-1.5 focus:outline-none focus:border-accent hover:border-border-hover transition-colors"
      >
        <span className="flex items-center gap-1.5 truncate">
          {selectedTeam?.logoSUrl && (
            <img src={selectedTeam.logoSUrl} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
          )}
          <span className="truncate">{selectedTeam?.name || 'Alle Vereine'}</span>
        </span>
        <span className="text-subtle text-[10px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-surface border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          <button
            onClick={() => { onSelect('ALL'); setIsOpen(false) }}
            className={`w-full px-2 py-1.5 text-left text-xs hover:bg-elevated transition-colors ${selectedTeamId === 'ALL' ? 'bg-elevated text-accent' : 'text-muted'}`}
          >
            Alle Vereine
          </button>
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => { onSelect(team.id); setIsOpen(false) }}
              className={`w-full px-2 py-1.5 text-left text-xs flex items-center gap-1.5 hover:bg-elevated transition-colors ${selectedTeamId === team.id ? 'bg-elevated text-accent' : 'text-foreground'}`}
            >
              {team.logoSUrl && (
                <img src={team.logoSUrl} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
              )}
              <span className="truncate">{team.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterBar({ selectedPositions, setSelectedPositions, selectedTeamId, setSelectedTeamId, searchTerm, setSearchTerm, teams, hasFilter }: {
  selectedPositions: Set<string>
  setSelectedPositions: (s: Set<string>) => void
  selectedTeamId: number | 'ALL'
  setSelectedTeamId: (id: number | 'ALL') => void
  searchTerm: string
  setSearchTerm: (s: string) => void
  teams: Team[]
  hasFilter: boolean
}) {
  const togglePosition = (pos: string) => {
    const next = new Set(selectedPositions)
    if (next.has(pos)) next.delete(pos)
    else next.add(pos)
    setSelectedPositions(next)
  }

  const clearFilter = () => {
    setSelectedPositions(new Set())
    setSelectedTeamId('ALL')
    setSearchTerm('')
  }

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-elevated/50 border-b border-border flex-wrap">
      <div className="relative flex-1 min-w-[180px] max-w-[280px]">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Spieler suchen..."
          className="input-field pl-8 pr-3 py-1.5 text-xs w-full"
        />
      </div>

      <div className="h-5 w-px bg-border" />

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as const).map(pos => {
          const active = selectedPositions.has(pos)
          const Icon = positionIcon[pos]
          return (
            <button
              key={pos}
              onClick={() => togglePosition(pos)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? positionChipActiveColors[pos] : chipInactive}`}
            >
              <Icon size={12} />
              {positionLabels[pos]}
            </button>
          )
        })}
      </div>

      <div className="h-5 w-px bg-border" />

      <TeamDropdown
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelect={setSelectedTeamId}
      />

      {hasFilter && (
        <button
          onClick={clearFilter}
          className="p-1 rounded text-subtle hover:text-danger transition-colors"
          title="Filter zurücksetzen"
        >
          <FilterX size={14} />
        </button>
      )}
    </div>
  )
}

function formatPrice(price: number | undefined): string {
  if (!price) return '- €'
  if (price >= 1_000_000) {
    const millions = price / 1_000_000
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M €`
  }
  return `${Math.round(price / 1_000)}K €`
}

function PlayerCard({ player }: { player: Player }) {
  return (
    <RouterLink to={`/players/${player.id}`} className="block">
      <div className="card p-4 bg-surface border border-border hover:border-border-hover transition-colors">
        <div className="flex gap-4 items-center">
          {player.pictureUrl ? (
            <img 
              src={player.pictureUrl} 
              alt={player.nameKicker}
              className="w-14 h-14 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-elevated flex items-center justify-center flex-shrink-0">
              <span className="text-xl text-subtle">👤</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-accent truncate">{player.nameKicker}</div>
            <div className="mt-1">
              <span className={`${positionChipClass[player.position]} text-xs font-medium px-2 py-0.5 rounded`}>
                {positionLabels[player.position]}
              </span>
            </div>
          </div>
          {player.teams.length > 0 && player.teams[0].logoSUrl && (
            <img 
              src={player.teams[0].logoSUrl} 
              alt={player.teams[0].name}
              className="w-14 h-14 object-contain flex-shrink-0"
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
          <div>
            <span className="text-subtle">Pos: </span>
            <span className="font-medium text-foreground">
              {player.positionTotal ? `${player.positionTotal}.` : '-'}
            </span>
          </div>
          <div>
            <span className="text-subtle">Pkt: </span>
            <span className="font-medium text-foreground">{player.points ?? '-'}</span>
          </div>
          <div>
            <span className="text-subtle">Spieltag: </span>
            <span className="font-medium text-foreground">{player.pointsLastRound ?? '-'}</span>
          </div>
          <div>
            <span className="text-subtle">+-: </span>
            {player.positionChange != null && player.positionChange !== 0 ? (
              <span className={`font-medium ${player.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {player.positionChange > 0 ? `↑${player.positionChange}` : `↓${Math.abs(player.positionChange)}`}
              </span>
            ) : (
              <span className="text-subtle">-</span>
            )}
          </div>
          <div>
            <span className="text-subtle">Manager: </span>
            <span className="font-medium text-foreground">{player.managerCount ?? 0}</span>
          </div>
          <div>
            <span className="text-subtle">Preis: </span>
            <span className="font-medium text-foreground">{formatPrice(player.prize)}</span>
          </div>
        </div>
      </div>
    </RouterLink>
  )
}

export default function Players() {
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set())
  const [selectedTeamId, setSelectedTeamId] = useState<number | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const { data: players, isLoading, error } = usePlayers()

  const teams = useMemo(() => {
    if (!players) return []
    const teamMap = new Map<number, Team>()
    players.forEach(p => p.teams.forEach(t => teamMap.set(t.id, t)))
    return Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [players])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const hasActiveFilter = selectedPositions.size > 0 || selectedTeamId !== 'ALL' || searchTerm !== ''

  const filteredPlayers = useMemo(() => {
    if (!players) return []
    
    const filtered = players.filter(player => {
      const matchesPosition = selectedPositions.size === 0 || selectedPositions.has(player.position)
      const matchesTeam = selectedTeamId === 'ALL' || player.teams.some(t => t.id === selectedTeamId)
      const matchesSearch = 
        player.nameKicker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.teams.some(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchesPosition && matchesTeam && matchesSearch
    })

    return filtered.sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'positionTotal':
          comparison = (a.positionTotal ?? 999) - (b.positionTotal ?? 999)
          break
        case 'positionChange':
          comparison = (a.positionChange ?? 0) - (b.positionChange ?? 0)
          break
        case 'nameKicker':
          comparison = a.nameKicker.localeCompare(b.nameKicker)
          break
        case 'points':
          comparison = (b.points ?? 0) - (a.points ?? 0)
          break
        case 'pointsLastRound':
          comparison = (b.pointsLastRound ?? 0) - (a.pointsLastRound ?? 0)
          break
        case 'managerCount':
          comparison = (a.managerCount ?? 0) - (b.managerCount ?? 0)
          break
        case 'prize':
          comparison = a.prize - b.prize
          break
        case 'position':
          comparison = a.position.localeCompare(b.position)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [players, selectedPositions, selectedTeamId, searchTerm, sortKey, sortOrder])

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Users size={28} className="text-accent" />
        <h1 className="text-sm font-medium text-accent">Spieler</h1>
      </div>

      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <FilterBar
          selectedPositions={selectedPositions}
          setSelectedPositions={setSelectedPositions}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          teams={teams}
          hasFilter={hasActiveFilter}
        />

        <div className="p-4">

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-3 py-2 text-muted text-center text-xs font-medium cursor-pointer hover:text-accent" onClick={() => handleSort('positionTotal')}>
                  Pos<SortIcon column="positionTotal" />
                </th>
                <th className="px-3 py-2 text-muted text-center text-xs font-medium cursor-pointer hover:text-accent" onClick={() => handleSort('positionChange')}>
                  +-<SortIcon column="positionChange" />
                </th>
                <th className="px-3 py-2 text-muted text-left text-xs font-medium cursor-pointer hover:text-accent" onClick={() => handleSort('nameKicker')}>
                  Name<SortIcon column="nameKicker" />
                </th>
                <th className="px-3 py-2 text-muted text-center text-xs font-medium cursor-pointer hover:text-accent" onClick={() => handleSort('points')}>
                  Pkt<SortIcon column="points" />
                </th>
                <th className="px-3 py-2 text-muted text-center text-xs font-medium cursor-pointer hover:text-accent" onClick={() => handleSort('pointsLastRound')}>
                  Spieltag<SortIcon column="pointsLastRound" />
                </th>
                <th className="px-3 py-2 text-muted text-center text-xs font-medium cursor-pointer hover:text-accent" onClick={() => handleSort('managerCount')}>
                  Manager<SortIcon column="managerCount" />
                </th>
                <th className="px-3 py-2 text-muted text-right text-xs font-medium cursor-pointer hover:text-accent" onClick={() => handleSort('prize')}>
                  Preis<SortIcon column="prize" />
                </th>
                <th className="px-3 py-2 text-muted text-left text-xs font-medium cursor-pointer hover:text-accent" onClick={() => handleSort('position')}>
                  Position<SortIcon column="position" />
                </th>
                <th className="px-3 py-2 text-muted text-left text-xs font-medium">Team</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers && filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <tr key={player.id} className="table-row hover:bg-elevated">
                    <td className="px-3 py-2 text-center font-medium text-foreground">
                      {player.positionTotal ? `${player.positionTotal}.` : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {player.positionChange != null && player.positionChange !== 0 ? (
                        <span className={`font-medium ${player.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {player.positionChange > 0 ? `↑${player.positionChange}` : `↓${Math.abs(player.positionChange)}`}
                        </span>
                      ) : (
                        <span className="text-subtle">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <RouterLink to={`/players/${player.id}`} className="flex items-center hover:text-foreground link">
                        {player.pictureUrl && (
                          <img src={player.pictureUrl} alt={player.nameKicker} className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-medium text-accent">{player.nameKicker}</div>
                          {player.firstName && player.lastName && (
                            <div className="text-sm text-subtle">
                              {player.firstName} {player.lastName}
                            </div>
                          )}
                        </div>
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-foreground">
                      {player.points ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-muted">
                      {player.pointsLastRound ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <RouterLink to={`/players/${player.id}`}>
                        <span 
                          className={`${player.managerCount && player.managerCount > 0 ? 'chip-accent' : ''} text-xs font-medium px-2 py-0.5 rounded cursor-pointer hover:opacity-80`}
                        >
                          {player.managerCount ?? 0}
                        </span>
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground">
                      {player.prize.toLocaleString()} €
                    </td>
                    <td className="px-3 py-2">
                      <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded`}>
                        {positionLabels[player.position]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {player.teams.length > 0 ? (
                        <span className="flex items-center gap-1 flex-wrap">
                          {player.teams.map((team, index) => (
                            <span key={team.id} className="flex items-center gap-1">
                              {index > 0 && <span className="text-subtle">,</span>}
                              {team.logoSUrl && (
                                <img 
                                  src={team.logoSUrl} 
                                  alt={team.name} 
                                  className="w-5 h-5 object-contain flex-shrink-0"
                                />
                              )}
                              <span className="font-semibold text-foreground">{team.name}</span>
                            </span>
                          ))}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center text-subtle py-8">
                    Keine Spieler gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden grid gap-4 mt-4">
          {filteredPlayers && filteredPlayers.length > 0 ? (
            filteredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))
          ) : (
            <div className="text-center text-subtle py-8">
              Keine Spieler gefunden
            </div>
          )}
        </div>

        {filteredPlayers && (
          <div className="mt-4 text-sm text-subtle">
            {filteredPlayers.length} von {players?.length || 0} Spielern
          </div>
        )}
        </div>
      </div>
    </div>
  )
}