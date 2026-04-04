import { useParams, Link as RouterLink } from 'react-router-dom'
import { Card, Chip, Avatar, Table } from '@heroui/react'
import { usePlayer } from '../hooks/usePlayers'
import { positionLabels, positionColors } from './Players'

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: player, isLoading, error } = usePlayer(Number(id))

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
                      <Table.Column className="text-[#a0aec0]">Name</Table.Column>
                      <Table.Column className="text-[#a0aec0]">Kürzel</Table.Column>
                      <Table.Column className="text-[#a0aec0] text-center">Hinrunde</Table.Column>
                      <Table.Column className="text-[#a0aec0] text-center">Rückrunde</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {player.managers.map((manager) => (
                        <Table.Row key={manager.id} className="hover:bg-[#1a2028]">
                          <Table.Cell>
                            <RouterLink to={`/managers/${manager.id}`} className="text-[#f5f5f5] hover:text-[#c9a66b] link font-medium">
                              {manager.name}
                            </RouterLink>
                          </Table.Cell>
                          <Table.Cell className="text-[#a0aec0]">
                            {manager.shortName || '-'}
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