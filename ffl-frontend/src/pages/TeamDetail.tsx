import { useState, useMemo } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { Table, Button, Chip, Card, Avatar } from '@heroui/react'
import { useTeam, useTeamPlayers } from '../hooks/useTeams'
import { positionLabels, positionColors } from './Players'

type SortKey = 'positionTotal' | 'positionChange' | 'nameKicker' | 'points' | 'pointsLastRound' | 'managerCount' | 'prize' | 'position'
type SortOrder = 'asc' | 'desc'

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(Number(id))
  const { data: players, isLoading: playersLoading } = useTeamPlayers(Number(id))
  
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

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
      const matchesSearch = 
        player.nameKicker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesPosition && matchesSearch
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
  }, [players, selectedPosition, searchTerm, sortKey, sortOrder])

  const isLoading = teamLoading || playersLoading
  const error = teamError

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>
  if (!team) return <div className="text-center py-8 text-[#6b7280]">Team nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/teams" className="text-[#c9a66b] hover:text-[#d4b77a] mb-4 inline-block link">
        &larr; Zurück zur Übersicht
      </RouterLink>
      
      <Card className="p-6 mt-4 bg-[#1a2028] border border-[#2d3748]">
        <div className="flex items-start gap-6">
          {team.logoXxlUrl && (
            <img
              src={team.logoXxlUrl}
              alt={team.name}
              className="w-32 h-32 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#f5f5f5]">{team.name}</h1>
            {team.shortName && (
              <p className="text-lg text-[#a0aec0] mt-1">{team.shortName}</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 mt-6 bg-[#1a2028] border border-[#2d3748]">
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

          <input
            type="text"
            placeholder="Spieler suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-48 px-3 py-2 rounded-lg bg-[#242d38] border border-[#2d3748] text-[#f5f5f5] text-sm placeholder-[#6b7280] focus:outline-none focus:border-[#c9a66b] hover:border-[#3d4a5c] transition-colors"
          />
        </div>

        <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">
          Spieler ({filteredPlayers?.length || 0})
        </h2>
        
        <Table>
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
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={8} className="text-center text-[#6b7280] py-8">
                      Keine Spieler gefunden
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card>
    </div>
  )
}