import { useState, useMemo } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { Table, Card, Chip, Avatar } from '@heroui/react'
import { useTeam, useTeamPlayers } from '../hooks/useTeams'
import { positionLabels, positionColors } from './Players'

type SortKey = 'nameKicker' | 'position' | 'prize' | 'managerCount'
type SortOrder = 'asc' | 'desc'

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(Number(id))
  const { data: players, isLoading: playersLoading } = useTeamPlayers(Number(id))
  
  const [sortKey, setSortKey] = useState<SortKey>('nameKicker')
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

  const sortedPlayers = useMemo(() => {
    if (!players) return []
    return [...players].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'nameKicker':
          comparison = a.nameKicker.localeCompare(b.nameKicker)
          break
        case 'position':
          comparison = a.position.localeCompare(b.position)
          break
        case 'prize':
          comparison = a.prize - b.prize
          break
        case 'managerCount':
          comparison = (a.managerCount ?? 0) - (b.managerCount ?? 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [players, sortKey, sortOrder])

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
        <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">
          Spieler ({players?.length || 0})
        </h2>
        
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Spieler-Tabelle">
              <Table.Header>
                <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('nameKicker')}>
                  Name<SortIcon column="nameKicker" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('position')}>
                  Position<SortIcon column="position" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] text-right cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('prize')}>
                  Preis<SortIcon column="prize" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('managerCount')}>
                  Manager<SortIcon column="managerCount" />
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {sortedPlayers && sortedPlayers.length > 0 ? (
                  sortedPlayers.map((player) => (
                    <Table.Row key={player.id} className="hover:bg-[#242d38]">
                      <Table.Cell>
                        <RouterLink to={`/players/${player.id}`} className="flex items-center hover:text-[#c9a66b] link">
                          {player.pictureUrl && (
                            <Avatar size="sm" className="mr-3">
                              <Avatar.Image src={player.pictureUrl} alt={player.nameKicker} />
                            </Avatar>
                          )}
                          <div>
                            <div className="font-medium text-[#f5f5f5]">{player.nameKicker}</div>
                            {player.firstName && player.lastName && (
                              <div className="text-sm text-[#6b7280]">
                                {player.firstName} {player.lastName}
                              </div>
                            )}
                          </div>
                        </RouterLink>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" color={positionColors[player.position]} variant="soft">
                          {positionLabels[player.position]}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-[#c9a66b]">
                        {player.prize.toLocaleString()} €
                      </Table.Cell>
                      <Table.Cell className="text-center">
                        <Chip 
                          size="sm" 
                          variant="soft" 
                          color={player.managerCount && player.managerCount > 0 ? 'accent' : 'default'}
                        >
                          {player.managerCount ?? 0}
                        </Chip>
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={4} className="text-center text-[#6b7280] py-8">
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