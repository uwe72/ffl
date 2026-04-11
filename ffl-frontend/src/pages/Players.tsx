import { useState, useMemo, useRef, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Table, Button, Chip, Card, Avatar } from '@heroui/react'
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
        className="min-w-48 px-3 py-2 rounded-lg bg-[#242d38] border border-[#2d3748] text-[#f5f5f5] text-sm flex items-center justify-between gap-2 focus:outline-none focus:border-[#c9a66b] hover:border-[#3d4a5c] transition-colors"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedTeam?.logoSUrl && (
            <img src={selectedTeam.logoSUrl} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
          )}
          <span className="truncate">{selectedTeam?.name || 'Alle Vereine'}</span>
        </span>
        <span className="text-[#6b7280] text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-[#1a2028] border border-[#2d3748] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          <button
            onClick={() => { onSelect('ALL'); setIsOpen(false) }}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-[#242d38] transition-colors ${selectedTeamId === 'ALL' ? 'bg-[#242d38] text-[#c9a66b]' : 'text-[#a0aec0]'}`}
          >
            Alle Vereine
          </button>
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => { onSelect(team.id); setIsOpen(false) }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#242d38] transition-colors ${selectedTeamId === team.id ? 'bg-[#242d38] text-[#c9a66b]' : 'text-[#f5f5f5]'}`}
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
      <Card className="p-4 bg-[#1a2028] border border-[#2d3748] hover:border-[#3d4a5c] transition-colors">
        <div className="flex gap-4 items-center">
          {player.pictureUrl ? (
            <img 
              src={player.pictureUrl} 
              alt={player.nameKicker}
              className="w-14 h-14 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#242d38] flex items-center justify-center flex-shrink-0">
              <span className="text-xl text-[#6b7280]">👤</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[#c9a66b] truncate">{player.nameKicker}</div>
            <div className="text-sm text-[#a0aec0]">{positionLabels[player.position]}</div>
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
            <span className="text-[#6b7280]">Pos: </span>
            <span className="font-medium text-[#f5f5f5]">
              {player.positionTotal ? `${player.positionTotal}.` : '-'}
            </span>
          </div>
          <div>
            <span className="text-[#6b7280]">Pkt: </span>
            <span className="font-medium text-[#f5f5f5]">{player.points ?? '-'}</span>
          </div>
          <div>
            <span className="text-[#6b7280]">Spieltag: </span>
            <span className="font-medium text-[#f5f5f5]">{player.pointsLastRound ?? '-'}</span>
          </div>
          <div>
            <span className="text-[#6b7280]">+-: </span>
            {player.positionChange != null && player.positionChange !== 0 ? (
              <span className={`font-medium ${player.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {player.positionChange > 0 ? `↑${player.positionChange}` : `↓${Math.abs(player.positionChange)}`}
              </span>
            ) : (
              <span className="text-[#6b7280]">-</span>
            )}
          </div>
          <div>
            <span className="text-[#6b7280]">Manager: </span>
            <span className="font-medium text-[#f5f5f5]">{player.managerCount ?? 0}</span>
          </div>
          <div>
            <span className="text-[#6b7280]">Preis: </span>
            <span className="font-medium text-[#f5f5f5]">{formatPrice(player.prize)}</span>
          </div>
        </div>
      </Card>
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
    if (sortKey !== column) return <span className="text-[#6b7280] ml-1">⇅</span>
    return <span className="text-[#c9a66b] ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
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

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Spieler</h1>

      <Card className="p-4 bg-[#1a2028] border border-[#2d3748]">
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={selectedPosition === 'ALL' ? 'primary' : 'secondary'}
              className={selectedPosition === 'ALL' ? 'bg-[#c9a66b] text-[#0f1419]' : 'bg-[#242d38] text-[#f5f5f5] border-[#3d4a5c]'}
              onPress={() => setSelectedPosition('ALL')}
            >
              Alle
            </Button>
            {(['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as const).map(pos => (
              <Button
                key={pos}
                size="sm"
                variant={selectedPosition === pos ? 'primary' : 'secondary'}
                className={selectedPosition === pos ? 'bg-[#c9a66b] text-[#0f1419]' : 'bg-[#242d38] text-[#f5f5f5] border-[#3d4a5c]'}
                onPress={() => setSelectedPosition(pos)}
              >
                {positionLabels[pos]}
              </Button>
            ))}
          </div>

          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Spieler suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-48 px-3 py-2 rounded-lg bg-[#242d38] border border-[#2d3748] text-[#f5f5f5] text-sm placeholder-[#6b7280] focus:outline-none focus:border-[#c9a66b] hover:border-[#3d4a5c] transition-colors"
            />
            <TeamDropdown
              teams={teams}
              selectedTeamId={selectedTeamId}
              onSelect={setSelectedTeamId}
            />
          </div>
        </div>

        <Table className="hidden md:block">
          <Table.ScrollContainer>
            <Table.Content aria-label="Spieler-Tabelle">
              <Table.Header>
                <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('positionTotal')}>
                  Pos<SortIcon column="positionTotal" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('positionChange')}>
                  +-<SortIcon column="positionChange" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('nameKicker')}>
                  Name<SortIcon column="nameKicker" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('points')}>
                  Pkt<SortIcon column="points" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('pointsLastRound')}>
                  Spieltag<SortIcon column="pointsLastRound" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('managerCount')}>
                  Manager<SortIcon column="managerCount" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] text-right cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('prize')}>
                  Preis<SortIcon column="prize" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('position')}>
                  Position<SortIcon column="position" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0]">Team</Table.Column>
              </Table.Header>
              <Table.Body>
                {filteredPlayers && filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player) => (
                    <Table.Row key={player.id} className="hover:bg-[#242d38]">
                      <Table.Cell className="text-center font-medium text-[#f5f5f5]">
                        {player.positionTotal ? `${player.positionTotal}.` : '-'}
                      </Table.Cell>
                      <Table.Cell className="text-center">
                        {player.positionChange != null && player.positionChange !== 0 ? (
                          <span className={`font-medium ${player.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {player.positionChange > 0 ? `↑${player.positionChange}` : `↓${Math.abs(player.positionChange)}`}
                          </span>
                        ) : (
                          <span className="text-[#6b7280]">-</span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <RouterLink to={`/players/${player.id}`} className="flex items-center hover:text-[#f5f5f5] link">
                          {player.pictureUrl && (
                            <Avatar size="sm" className="mr-3">
                              <Avatar.Image src={player.pictureUrl} alt={player.nameKicker} />
                            </Avatar>
                          )}
                          <div>
                            <div className="font-medium text-[#c9a66b]">{player.nameKicker}</div>
                            {player.firstName && player.lastName && (
                              <div className="text-sm text-[#6b7280]">
                                {player.firstName} {player.lastName}
                              </div>
                            )}
                          </div>
                        </RouterLink>
                      </Table.Cell>
                      <Table.Cell className="text-center font-medium text-[#f5f5f5]">
                        {player.points ?? '-'}
                      </Table.Cell>
                      <Table.Cell className="text-center text-[#a0aec0]">
                        {player.pointsLastRound ?? '-'}
                      </Table.Cell>
                      <Table.Cell className="text-center">
                        <RouterLink to={`/players/${player.id}`}>
                          <Chip 
                            size="sm" 
                            variant="soft" 
                            color={player.managerCount && player.managerCount > 0 ? 'accent' : 'default'}
                            className="cursor-pointer hover:opacity-80"
                          >
                            {player.managerCount ?? 0}
                          </Chip>
                        </RouterLink>
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-[#f5f5f5]">
                        {player.prize.toLocaleString()} €
                      </Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" color={positionColors[player.position]} variant="soft">
                          {positionLabels[player.position]}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell className="text-[#a0aec0]">
                        {player.teams.length > 0 ? (
                          <span className="flex items-center gap-1 flex-wrap">
                            {player.teams.map((team, index) => (
                              <span key={team.id} className="flex items-center gap-1">
                                {index > 0 && <span className="text-[#6b7280]">,</span>}
                                {team.logoSUrl && (
                                  <img 
                                    src={team.logoSUrl} 
                                    alt={team.name} 
                                    className="w-5 h-5 object-contain flex-shrink-0"
                                  />
                                )}
                                <span className="font-semibold text-[#f5f5f5]">{team.name}</span>
                              </span>
                            ))}
                          </span>
                        ) : '-'}
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={9} className="text-center text-[#6b7280] py-8">
                      Keine Spieler gefunden
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>

        <div className="md:hidden grid gap-4 mt-4">
          {filteredPlayers && filteredPlayers.length > 0 ? (
            filteredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))
          ) : (
            <div className="text-center text-[#6b7280] py-8">
              Keine Spieler gefunden
            </div>
          )}
        </div>

        {filteredPlayers && (
          <div className="mt-4 text-sm text-[#6b7280]">
            {filteredPlayers.length} von {players?.length || 0} Spielern
          </div>
        )}
      </Card>
    </div>
  )
}