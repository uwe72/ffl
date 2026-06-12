import { useState, useMemo, useRef, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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
        className="min-w-48 px-3 py-2 rounded-lg bg-elevated border border-border text-foreground text-sm flex items-center justify-between gap-2 focus:outline-none focus:border-accent hover:border-border-hover transition-colors"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedTeam?.logoSUrl && (
            <img src={selectedTeam.logoSUrl} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
          )}
          <span className="truncate">{selectedTeam?.name || 'Alle Vereine'}</span>
        </span>
        <span className="text-subtle text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-surface border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          <button
            onClick={() => { onSelect('ALL'); setIsOpen(false) }}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-elevated transition-colors ${selectedTeamId === 'ALL' ? 'bg-elevated text-accent' : 'text-muted'}`}
          >
            Alle Vereine
          </button>
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => { onSelect(team.id); setIsOpen(false) }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-elevated transition-colors ${selectedTeamId === team.id ? 'bg-elevated text-accent' : 'text-foreground'}`}
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
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL')
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

  const filteredPlayers = useMemo(() => {
    if (!players) return []
    
    const filtered = players.filter(player => {
      const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition
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
  }, [players, selectedPosition, selectedTeamId, searchTerm, sortKey, sortOrder])

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Spieler</h1>

      <div className="card p-4 bg-surface border border-border">
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <div className="flex gap-2 flex-wrap">
            <button
              className={`px-4 py-2 rounded font-medium transition-colors ${selectedPosition === 'ALL' ? 'button-primary bg-primary text-background hover:bg-button-primary-hover' : 'button-secondary bg-elevated text-foreground border-border-hover'}`}
              onClick={() => setSelectedPosition('ALL')}
            >
              Alle
            </button>
            {(['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as const).map(pos => (
              <button
                key={pos}
                className={`px-4 py-2 rounded font-medium transition-colors ${selectedPosition === pos ? 'button-primary bg-primary text-background hover:bg-button-primary-hover' : 'button-secondary bg-elevated text-foreground border-border-hover'}`}
                onClick={() => setSelectedPosition(pos)}
              >
                {positionLabels[pos]}
              </button>
            ))}
          </div>

          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Spieler suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-48 px-3 py-2 rounded-lg bg-elevated border border-border text-foreground text-sm placeholder-[#8899aa] focus:outline-none focus:border-accent hover:border-border-hover transition-colors"
            />
            <TeamDropdown
              teams={teams}
              selectedTeamId={selectedTeamId}
              onSelect={setSelectedTeamId}
            />
          </div>
        </div>

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
  )
}