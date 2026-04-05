import { useState, useMemo } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { Card, Chip, Avatar, Table } from '@heroui/react'
import { usePlayer } from '../hooks/usePlayers'
import { positionLabels, positionColors } from './Players'

type SortKey = 'positionTotal' | 'shortName' | 'pointsTotal' | 'pointsLastRound' | 'firstName' | 'lastName' | 'teamValue' | 'hinrunde' | 'rueckrunde'
type SortOrder = 'asc' | 'desc'

const paymentStateLabels = {
  PAID: 'Bezahlt',
  NOT_PAID: 'Nicht bezahlt'
}

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: player, isLoading, error } = usePlayer(Number(id))
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

  const sortedManagers = useMemo(() => {
    if (!player?.managers) return []
    
    return [...player.managers].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'shortName':
          comparison = (a.shortName || '').localeCompare(b.shortName || '')
          break
        case 'firstName':
          comparison = (a.firstName || '').localeCompare(b.firstName || '')
          break
        case 'lastName':
          comparison = (a.lastName || '').localeCompare(b.lastName || '')
          break
        case 'teamValue':
          comparison = (a.teamValue || 0) - (b.teamValue || 0)
          break
        case 'positionTotal':
          comparison = (a.positionTotal || 999) - (b.positionTotal || 999)
          break
        case 'pointsTotal':
          comparison = (b.pointsTotal || 0) - (a.pointsTotal || 0)
          break
        case 'pointsLastRound':
          comparison = (b.pointsLastRound || 0) - (a.pointsLastRound || 0)
          break
        case 'hinrunde':
          comparison = (a.hinrunde ? 1 : 0) - (b.hinrunde ? 1 : 0)
          break
        case 'rueckrunde':
          comparison = (a.rueckrunde ? 1 : 0) - (b.rueckrunde ? 1 : 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [player?.managers, sortKey, sortOrder])

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>
  if (!player) return <div className="text-center py-8 text-[#6b7280]">Spieler nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/players" className="text-[#c9a66b] hover:text-[#d4b77a] mb-4 inline-block link">
        &larr; Zurück zur Übersicht
      </RouterLink>
      
      <Card className="p-6 mt-4 bg-[#1a2028] border border-[#2d3748]">
        <div className="flex items-start gap-6">
          {player.pictureUrl && (
            <Avatar className="w-32 h-32">
              <Avatar.Image src={player.pictureUrl} alt={player.nameKicker} />
            </Avatar>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#f5f5f5]">{player.nameKicker}</h1>
            {player.firstName && player.lastName && (
              <p className="text-lg text-[#a0aec0] mt-1">
                {player.firstName} {player.lastName}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip color={positionColors[player.position]} variant="soft">
                {positionLabels[player.position]}
              </Chip>
              {player.teams.map((team, index) => (
                <RouterLink 
                  key={team.id}
                  to={`/teams/${team.id}`}
                >
                  <Chip
                    variant="soft"
                    className={`cursor-pointer ${
                      index === player.teams.length - 1
                        ? 'bg-[#242d38] text-[#f5f5f5] hover:bg-[#2d3748]'
                        : 'bg-[#1a2028] text-[#6b7280] hover:bg-[#242d38] line-through'
                    }`}
                  >
                    {team.name}
                  </Chip>
                </RouterLink>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
            <p className="text-sm text-[#a0aec0]">Marktwert</p>
            <p className="text-2xl font-bold text-[#c9a66b]">{player.prize.toLocaleString()} €</p>
          </Card>
        </div>

        {player.managers && player.managers.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">
              Manager mit diesem Spieler ({player.managers.length})
            </h2>
            <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label="Manager-Tabelle">
                    <Table.Header>
                      <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('positionTotal')}>
                        Pos<SortIcon column="positionTotal" />
                      </Table.Column>
                      <Table.Column className="text-[#c9a66b] cursor-pointer hover:text-[#f5f5f5]" onClick={() => handleSort('shortName')}>
                        Manager<SortIcon column="shortName" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('pointsTotal')}>
                        Pkt<SortIcon column="pointsTotal" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('pointsLastRound')}>
                        Letzter Spieltag<SortIcon column="pointsLastRound" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('firstName')}>
                        Vorname<SortIcon column="firstName" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('lastName')}>
                        Nachname<SortIcon column="lastName" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0]">Status</Table.Column>
                      <Table.Column className="text-[#a0aec0] text-right cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('teamValue')}>
                        Teamwert<SortIcon column="teamValue" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('hinrunde')}>
                        Hinrunde<SortIcon column="hinrunde" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('rueckrunde')}>
                        Rückrunde<SortIcon column="rueckrunde" />
                      </Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {sortedManagers.map((manager) => (
                        <Table.Row key={manager.id} className="hover:bg-[#1a2028]">
                          <Table.Cell className="text-center font-medium text-[#f5f5f5]">
                            {manager.positionTotal ? `${manager.positionTotal}.` : '-'}
                          </Table.Cell>
                          <Table.Cell className="text-[#c9a66b]">
                            <RouterLink to={`/managers/${manager.id}`} className="hover:text-[#f5f5f5] link font-medium">
                              {manager.shortName || manager.name || '-'}
                            </RouterLink>
                          </Table.Cell>
                          <Table.Cell className="text-center font-medium text-[#f5f5f5]">
                            {manager.pointsTotal ?? '-'}
                          </Table.Cell>
                          <Table.Cell className="text-center text-[#a0aec0]">
                            {manager.pointsLastRound ?? '-'}
                          </Table.Cell>
                          <Table.Cell className="text-[#a0aec0]">
                            {manager.firstName || '-'}
                          </Table.Cell>
                          <Table.Cell className="text-[#a0aec0]">
                            {manager.lastName || '-'}
                          </Table.Cell>
                          <Table.Cell>
                            <Chip
                              size="sm"
                              color={manager.paymentState === 'PAID' ? 'success' : 'danger'}
                              variant="soft"
                            >
                              {paymentStateLabels[manager.paymentState as keyof typeof paymentStateLabels] || manager.paymentState || '-'}
                            </Chip>
                          </Table.Cell>
                          <Table.Cell className="text-right font-medium text-[#f5f5f5]">
                            {manager.teamValue ? (manager.teamValue / 1000000).toFixed(2) : '0.00'} Mio.
                          </Table.Cell>
                          <Table.Cell className="text-center">
                            {manager.hinrunde ? (
                              <Chip size="sm" variant="soft" color="accent">Hin</Chip>
                            ) : (
                              <span className="text-[#6b7280]">-</span>
                            )}
                          </Table.Cell>
                          <Table.Cell className="text-center">
                            {manager.rueckrunde ? (
                              <Chip size="sm" variant="soft" color="success">Rück</Chip>
                            ) : (
                              <span className="text-[#6b7280]">-</span>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </Card>
          </div>
        )}
      </Card>
    </div>
  )
}
