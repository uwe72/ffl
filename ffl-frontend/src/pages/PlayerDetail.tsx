import { useState, useMemo, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { Card, Chip, Avatar, Table, Input, Button } from '@heroui/react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { usePlayer, useUpdatePlayer, usePlayerRanks } from '../hooks/usePlayers'
import { useAuth } from '../context/AuthContext'
import { positionLabels } from './Players'
import type { Position } from '../types'

type SortKey = 'positionTotal' | 'positionChange' | 'shortName' | 'pointsTotal' | 'pointsLastRound' | 'firstName' | 'lastName' | 'teamValue' | 'hinrunde' | 'rueckrunde'
type SortOrder = 'asc' | 'desc'

const paymentStateLabels = {
  PAID: 'Bezahlt',
  NOT_PAID: 'Nicht bezahlt'
}

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: player, isLoading, error } = usePlayer(Number(id))
  const { data: playerRanks } = usePlayerRanks(Number(id))
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [editData, setEditData] = useState({ prize: 0, pictureUrl: '', position: '' as Position })
  const [isSaving, setIsSaving] = useState(false)
  const updatePlayer = useUpdatePlayer()

  useEffect(() => {
    if (player) {
      setEditData({ prize: player.prize, pictureUrl: player.pictureUrl || '', position: player.position })
    }
  }, [player])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updatePlayer.mutateAsync({ id: Number(id), data: editData })
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (value: number): string => {
    if (value === 0) return ''
    return value.toLocaleString('de-DE') + ' €'
  }

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/\./g, '').replace('€', '').replace(/\s/g, '').trim()
    return parseInt(cleaned) || 0
  }

  const hasChanges = player && (
    editData.prize !== player.prize ||
    editData.pictureUrl !== (player.pictureUrl || '') ||
    editData.position !== player.position
  )

  const chartData = useMemo(() => {
    if (!playerRanks || !player?.season?.currentMatchday) return []
    
    const maxMatchday = player.season.currentMatchday
    const ranksMap = new Map(playerRanks.map(r => [r.roundNumber, r]))
    
    return Array.from({ length: maxMatchday }, (_, i) => {
      const roundNumber = i + 1
      const rank = ranksMap.get(roundNumber)
      return {
        name: `${roundNumber}`,
        punkte: rank?.pointsRound ?? 0,
        roundNumber,
        gameName: rank?.gameName,
        goalHost: rank?.goalHost,
        goalVisitor: rank?.goalVisitor,
        rules: rank?.rules
      }
    })
  }, [playerRanks, player?.season?.currentMatchday])

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { punkte: number; gameName?: string; goalHost?: number; goalVisitor?: number; rules?: Array<{ ruleLabel: string; count: number; points: number }> } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const gameName = data.gameName
      const goalHost = data.goalHost
      const goalVisitor = data.goalVisitor
      const rules = data.rules
      
      return (
        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-3 shadow-lg min-w-[180px]">
          <p className="text-[#f5f5f5] font-semibold">Spieltag {label}</p>
          {gameName && (
            <p className="text-[#a0aec0] text-sm">
              {gameName}{goalHost != null && goalVisitor != null ? ` ${goalHost}:${goalVisitor}` : ''}
            </p>
          )}
          <p className="text-[#c9a66b]">{data.punkte} Punkte</p>
          {rules && rules.length > 0 && (
            <>
              <hr className="border-[#2d3748] my-2" />
              {rules.map((rule, idx) => (
                <p key={idx} className="text-[#a0aec0] text-sm">
                  {rule.count}x {rule.ruleLabel} ({rule.points})
                </p>
              ))}
            </>
          )}
        </div>
      )
    }
    return null
  }

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
        case 'positionChange':
          comparison = (a.positionChange || 0) - (b.positionChange || 0)
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
          <Avatar className="w-32 h-32">
            <Avatar.Image src={player.pictureUrl || ''} alt={player.nameKicker} />
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#f5f5f5]">{player.nameKicker}</h1>
            {player.firstName && player.lastName && (
              <p className="text-lg text-[#a0aec0] mt-1">
                {player.firstName} {player.lastName}
              </p>
            )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {player.teams.map((team) => (
                  <RouterLink 
                    key={team.id}
                    to={`/teams/${team.id}`}
                  >
                    <Chip
                      variant="soft"
                      className="cursor-pointer bg-[#242d38] text-[#f5f5f5] hover:bg-[#2d3748]"
                    >
                      <span className="flex items-center gap-1">
                        {team.logoSUrl && (
                          <img 
                            src={team.logoSUrl} 
                            alt={team.name}
                            className="w-5 h-5 object-contain"
                          />
                        )}
                        {team.name}
                      </span>
                    </Chip>
                  </RouterLink>
                ))}
              </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
            <p className="text-sm text-[#a0aec0]">Gesamtposition</p>
            <p className="text-2xl font-bold text-[#f5f5f5] min-h-[42px] flex items-center">{player.positionTotal ? `${player.positionTotal}.` : '-'}</p>
          </Card>
          <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
            <p className="text-sm text-[#a0aec0]">Punkte (Saison)</p>
            <p className="text-2xl font-bold text-[#f5f5f5] min-h-[42px] flex items-center">{player.points ?? '-'}</p>
          </Card>
          <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
            <p className="text-sm text-[#a0aec0]">Punkte (Spieltag)</p>
            <p className="text-2xl font-bold text-[#f5f5f5] min-h-[42px] flex items-center">{player.pointsLastRound ?? '-'}</p>
          </Card>
          <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
            <p className="text-sm text-[#a0aec0]">Position</p>
            {isAdmin ? (
              <select
                value={editData.position}
                onChange={(e) => setEditData({ ...editData, position: e.target.value as Position })}
                className="w-36 bg-[#1a2028] border border-[#3d4a5c] text-[#f5f5f5] rounded-lg px-3 min-h-[42px] focus:outline-none focus:border-[#c9a66b]"
              >
                <option value="GOALKEEPER">Torwart</option>
                <option value="DEFENDER">Abwehr</option>
                <option value="MIDFIELD">Mittelfeld</option>
                <option value="STRIKER">Sturm</option>
              </select>
            ) : (
              <p className="text-2xl font-bold text-[#f5f5f5] min-h-[42px] flex items-center">{positionLabels[player.position]}</p>
            )}
          </Card>
          {isAdmin && (
            <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
              <p className="text-sm text-[#a0aec0]">Marktwert</p>
              <Input
                type="text"
                value={formatCurrency(editData.prize)}
                onChange={(e) => setEditData({ ...editData, prize: parseCurrency(e.target.value) })}
                className="w-36"
                placeholder="0 €"
              />
            </Card>
          )}
          {isAdmin && (
            <Card className="p-4 bg-[#242d38] border border-[#3d4a5c] flex-1 min-w-[300px]">
              <p className="text-sm text-[#a0aec0]">Bild-URL</p>
              <Input
                value={editData.pictureUrl}
                onChange={(e) => setEditData({ ...editData, pictureUrl: e.target.value })}
                className="w-full"
              />
            </Card>
          )}
          {isAdmin && hasChanges && (
            <Button variant="primary" className="bg-[#c9a66b] text-[#1a2028] hover:bg-[#d4b77a] min-h-[42px]" onPress={handleSave} isDisabled={isSaving}>
              {isSaving ? 'Speichern...' : 'Speichern'}
            </Button>
          )}
        </div>

        {chartData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">Punkte pro Spieltag</h2>
            <div className="bg-[#1a2028] p-4 rounded-lg border border-[#2d3748]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="name" stroke="#a0aec0" />
                  <YAxis stroke="#a0aec0" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="punkte" fill="#c9a66b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

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
                      <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('positionChange')}>
                        +-<SortIcon column="positionChange" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('shortName')}>
                        Manager<SortIcon column="shortName" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('pointsTotal')}>
                        Pkt<SortIcon column="pointsTotal" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('pointsLastRound')}>
                        Spieltag<SortIcon column="pointsLastRound" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('firstName')}>
                        Vorname<SortIcon column="firstName" />
                      </Table.Column>
                      <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('lastName')}>
                        Nachname<SortIcon column="lastName" />
                      </Table.Column>
                      {isAdmin && <Table.Column className="text-[#a0aec0]">Status</Table.Column>}
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
                          <Table.Cell className="text-center">
                            {manager.positionChange != null && manager.positionChange !== 0 ? (
                              <span className={`font-medium ${manager.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {manager.positionChange > 0 ? `↑${manager.positionChange}` : `↓${Math.abs(manager.positionChange)}`}
                              </span>
                            ) : (
                              <span className="text-[#6b7280]">-</span>
                            )}
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
                          {isAdmin && (
                            <Table.Cell>
                              <Chip
                                size="sm"
                                color={manager.paymentState === 'PAID' ? 'success' : 'danger'}
                                variant="soft"
                              >
                                {paymentStateLabels[manager.paymentState as keyof typeof paymentStateLabels] || manager.paymentState || '-'}
                              </Chip>
                            </Table.Cell>
                          )}
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
