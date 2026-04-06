import { useParams, Link as RouterLink } from 'react-router-dom'
import { Card, Chip } from '@heroui/react'
import { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { useManager, useManagerRoundDetails, useManagerGroups } from '../hooks/useManagers'
import { useManagerGroupsWithStats } from '../hooks/useManagerGroups'
import { positionLabels, positionColors } from './Players'
import type { Player, ManagerGroup, RulePoint } from '../types'

const LINE_COLORS = [
  '#f97316',
  '#22c55e', 
  '#3b82f6', 
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#ef4444',
  '#06b6d4',
  '#8b5cf6'
]

const paymentStateLabels = {
  PAID: 'Bezahlt',
  NOT_PAID: 'Nicht bezahlt'
}

const positionOrder: Record<string, number> = {
  GOALKEEPER: 0,
  DEFENDER: 1,
  MIDFIELD: 2,
  STRIKER: 3
}

type SortKey = 'nameKicker' | 'team' | 'position' | 'prize' | 'points'
type SortOrder = 'asc' | 'desc'

function PlayerRow({ player }: { player: Player }) {
  const currentTeam = player.teams[player.teams.length - 1]
  return (
    <tr className="hover:bg-[#242d38] border-b border-[#2d3748]">
      <td className="px-3 py-2">
        <RouterLink
          to={`/players/${player.id}`}
          className="hover:text-[#c9a66b] link text-[#f5f5f5]"
        >
          {player.nameKicker}
        </RouterLink>
      </td>
      <td className="px-3 py-2">
        {currentTeam?.logoSUrl && (
          <img 
            src={currentTeam.logoSUrl} 
            alt={currentTeam.name}
            className="w-6 h-6 object-contain inline-block mr-2"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <span className="text-[#a0aec0]">{currentTeam?.name || '-'}</span>
      </td>
      <td className="px-3 py-2">
        <Chip size="sm" color={positionColors[player.position]} variant="soft">
          {positionLabels[player.position]}
        </Chip>
      </td>
      <td className="px-3 py-2 text-right font-medium text-[#c9a66b]">
        {(player.prize / 1000000).toFixed(1)} Mio.
      </td>
      <td className="px-3 py-2 text-right font-medium text-[#f5f5f5]">
        {player.points ?? 0}
      </td>
    </tr>
  )
}

function PlayerTable({ players, title }: { players: Player[]; title: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('position')
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
    return [...players].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'nameKicker':
          comparison = a.nameKicker.localeCompare(b.nameKicker)
          break
        case 'team':
          const teamA = a.teams[a.teams.length - 1]?.name || ''
          const teamB = b.teams[b.teams.length - 1]?.name || ''
          comparison = teamA.localeCompare(teamB)
          break
        case 'position':
          comparison = (positionOrder[a.position] || 0) - (positionOrder[b.position] || 0)
          break
        case 'prize':
          comparison = a.prize - b.prize
          break
        case 'points':
          comparison = (a.points ?? 0) - (b.points ?? 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [players, sortKey, sortOrder])

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-[#2d3748]">
        <table className="w-full">
          <thead className="bg-[#1a2028]">
            <tr>
              <th 
                className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('nameKicker')}
              >
                Spieler<SortIcon column="nameKicker" />
              </th>
              <th 
                className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('team')}
              >
                Team<SortIcon column="team" />
              </th>
              <th 
                className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('position')}
              >
                Position<SortIcon column="position" />
              </th>
              <th 
                className="px-3 py-2 text-right text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('prize')}
              >
                Wert<SortIcon column="prize" />
              </th>
              <th 
                className="px-3 py-2 text-right text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('points')}
              >
                Punkte<SortIcon column="points" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-[#1a2028]">
            {sortedPlayers.map(player => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type ManagerGroupSortKey = 'position' | 'playerName' | 'firstName' | 'lastName' | 'points'

function ManagerGroupTable({ group, currentManagerId }: { group: ManagerGroup; currentManagerId: number }) {
  const [sortKey, setSortKey] = useState<ManagerGroupSortKey>('position')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (key: ManagerGroupSortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ column }: { column: ManagerGroupSortKey }) => {
    if (sortKey !== column) return <span className="text-[#6b7280] ml-1">⇅</span>
    return <span className="text-[#c9a66b] ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const sortedManagers = useMemo(() => {
    return [...group.managers].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'playerName':
          comparison = (a.shortName || a.name).localeCompare(b.shortName || b.name)
          break
        case 'firstName':
          comparison = (a.firstName || '').localeCompare(b.firstName || '')
          break
        case 'lastName':
          comparison = (a.lastName || '').localeCompare(b.lastName || '')
          break
        case 'position':
          comparison = (a.positionTotal ?? 999) - (b.positionTotal ?? 999)
          break
        case 'points':
          comparison = (a.pointsTotal ?? 0) - (b.pointsTotal ?? 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [group.managers, sortKey, sortOrder])

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">{group.name}</h2>
      <div className="overflow-x-auto rounded-lg border border-[#2d3748]">
        <table className="w-full">
          <thead className="bg-[#1a2028]">
            <tr>
              <th 
                className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('position')}
              >
                Pos<SortIcon column="position" />
              </th>
              <th 
                className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('playerName')}
              >
                Kürzel<SortIcon column="playerName" />
              </th>
              <th 
                className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('firstName')}
              >
                Vorname<SortIcon column="firstName" />
              </th>
              <th 
                className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('lastName')}
              >
                Nachname<SortIcon column="lastName" />
              </th>
              <th 
                className="px-3 py-2 text-right text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('points')}
              >
                Pkt<SortIcon column="points" />
              </th>
              <th className="px-3 py-2 text-right text-[#a0aec0] font-medium border-b border-[#2d3748]">Letzter Spieltag</th>
            </tr>
          </thead>
          <tbody className="bg-[#1a2028]">
            {sortedManagers.map(m => (
              <tr 
                key={m.id} 
                className={`hover:bg-[#242d38] border-b border-[#2d3748] ${m.id === currentManagerId ? 'bg-[#2d3748]' : ''}`}
              >
                <td className="px-3 py-2 text-[#f5f5f5] font-medium">{m.positionTotal ? `${m.positionTotal}.` : '-'}</td>
                <td className="px-3 py-2">
                  <RouterLink
                    to={`/managers/${m.id}`}
                    className={`hover:text-[#c9a66b] link ${m.id === currentManagerId ? 'text-[#c9a66b] font-semibold' : 'text-[#f5f5f5]'}`}
                  >
                    {m.shortName || m.name}
                  </RouterLink>
                </td>
                <td className="px-3 py-2 text-[#a0aec0]">{m.firstName || '-'}</td>
                <td className="px-3 py-2 text-[#a0aec0]">{m.lastName || '-'}</td>
                <td className="px-3 py-2 text-right font-medium text-[#c9a66b]">{m.pointsTotal ?? '-'}</td>
                <td className="px-3 py-2 text-right text-[#a0aec0]">{m.pointsLastRound ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ManagerDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: manager, isLoading, error } = useManager(Number(id))
  const { data: roundDetails } = useManagerRoundDetails(Number(id))
  const { data: managerGroups } = useManagerGroups(Number(id))
  const { data: managerGroupsWithStats } = useManagerGroupsWithStats(Number(id), true)

  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  useEffect(() => {
    if (managerGroupsWithStats && managerGroupsWithStats.length > 0 && !selectedGroupId) {
      setSelectedGroupId(managerGroupsWithStats[0].groupId.toString())
    }
  }, [managerGroupsWithStats, selectedGroupId])

  const selectedGroup = useMemo(() => {
    if (!managerGroupsWithStats || !selectedGroupId) return null
    return managerGroupsWithStats.find(g => g.groupId.toString() === selectedGroupId)
  }, [managerGroupsWithStats, selectedGroupId])

  const groupLineChartData = useMemo(() => {
    if (!selectedGroup || selectedGroup.managers.length === 0) return []
    
    const maxRound = Math.max(...selectedGroup.managers.flatMap(m => m.roundData.map(rd => rd.round)))
    
    const data = []
    for (let round = 1; round <= maxRound; round++) {
      const roundPoint: Record<string, number | string> = { round }
      selectedGroup.managers.forEach(m => {
        const rd = m.roundData.find(r => r.round === round)
        roundPoint[m.shortName || m.managerName] = rd?.pointsCumulative ?? 0
      })
      data.push(roundPoint)
    }
    return data
  }, [selectedGroup])

  const GroupCustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-3 shadow-lg">
          <p className="text-[#c9a66b] font-medium mb-2">Spieltag {label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} Punkte
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>
  if (!manager) return <div className="text-center py-8 text-[#6b7280]">Manager nicht gefunden</div>

  const oldPlayers = [manager.playerExchangedOld1, manager.playerExchangedOld2, manager.playerExchangedOld3].filter(Boolean) as Player[]
  const newPlayers = [manager.playerExchangedNew1, manager.playerExchangedNew2, manager.playerExchangedNew3].filter(Boolean) as Player[]
  const hasExchanges = oldPlayers.length > 0 || newPlayers.length > 0

  const hinrundePlayers: Player[] = [
    manager.playerGoalkeeper,
    manager.playerDefender1,
    manager.playerDefender2,
    manager.playerDefender3,
    manager.playerMidfield1,
    manager.playerMidfield2,
    manager.playerMidfield3,
    manager.playerStriker1,
    manager.playerStriker2,
    manager.playerStriker3,
    manager.playerFreeChoice
  ].filter(Boolean) as Player[]

  const hinrundeBudget = hinrundePlayers.reduce((sum, p) => sum + p.prize, 0)

  const rueckrundePlayers = hasExchanges
    ? [...hinrundePlayers.filter(p => !oldPlayers.find(op => op.id === p.id)), ...newPlayers]
    : hinrundePlayers

  const rueckrundeBudget = rueckrundePlayers.reduce((sum, p) => sum + p.prize, 0)

  const chartData = roundDetails?.map(r => ({
    name: `${r.roundNumber}`,
    punkte: r.pointsRound,
    roundNumber: r.roundNumber,
    playerPoints: r.playerPoints
  })) || []

  const positionChartData = roundDetails?.map(r => ({
    name: `${r.roundNumber}`,
    position: r.positionTotal,
    roundNumber: r.roundNumber
  })) || []

  const lastRound = roundDetails && roundDetails.length > 0 ? roundDetails[roundDetails.length - 1] : null
  const currentRoundNumber = manager.currentMatchday || lastRound?.roundNumber || 0
  const lastRoundPlayerPoints = lastRound?.playerPoints || []

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { punkte: number; playerPoints: Array<{ playerName: string; points: number }> } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const playerPoints = data.playerPoints || []
      return (
        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-3 shadow-lg">
          <p className="text-[#f5f5f5] font-semibold mb-2">Spieltag {label}</p>
          <p className="text-[#c9a66b] font-medium mb-2">{data.punkte} Punkte</p>
          {playerPoints.length > 0 && (
            <div className="text-sm">
              <p className="text-[#a0aec0] mb-1">Spieler:</p>
              {playerPoints.map((pp: { playerName: string; points: number }, idx: number) => (
                <p key={idx} className="text-[#f5f5f5]">{pp.playerName}: {pp.points} Pkt</p>
              ))}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div>
      <RouterLink to="/managers" className="text-[#c9a66b] hover:text-[#d4b77a] mb-4 inline-block link">
        &larr; Zurück zur Übersicht
      </RouterLink>
      
      <Card className="p-6 mt-4 bg-[#1a2028] border border-[#2d3748]">
        <div className="flex items-start justify-between">
          <div>
            {manager.shortName && (
              <p className="text-lg text-[#c9a66b] font-medium">{manager.shortName}</p>
            )}
            <h1 className="text-3xl font-bold text-[#f5f5f5]">{manager.name}</h1>
          </div>
          <Chip
            color={manager.paymentState === 'PAID' ? 'success' : 'danger'}
            variant="soft"
          >
            {paymentStateLabels[manager.paymentState as keyof typeof paymentStateLabels] || manager.paymentState}
          </Chip>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
            <p className="text-sm text-[#a0aec0]">Position (Saison)</p>
            <p className="text-2xl font-bold text-[#f5f5f5]">{manager.positionTotal ? `${manager.positionTotal}.` : '-'}</p>
          </Card>
          <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
            <p className="text-sm text-[#a0aec0]">Punkte (Saison)</p>
            <p className="text-2xl font-bold text-[#c9a66b]">{manager.pointsTotal ?? '-'}</p>
          </Card>
          <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
            <p className="text-sm text-[#a0aec0]">Letzte Runde</p>
            <p className="text-2xl font-bold text-[#c9a66b]">{manager.pointsLastRound ?? '-'} Pkt</p>
          </Card>
          <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
            <p className="text-sm text-[#a0aec0]">Aktueller Spieltag</p>
            <p className="text-2xl font-bold text-[#f5f5f5]">{currentRoundNumber || '-'}</p>
          </Card>
          <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
            <p className="text-sm text-[#a0aec0]">Hinrunde-Teamwert</p>
            <p className="text-2xl font-bold text-[#c9a66b]">{(hinrundeBudget / 1000000).toFixed(2)} Mio. €</p>
          </Card>
          {hasExchanges && (
            <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
              <p className="text-sm text-[#a0aec0]">Rückrunde-Teamwert</p>
              <p className="text-2xl font-bold text-[#c9a66b]">{(rueckrundeBudget / 1000000).toFixed(2)} Mio. €</p>
            </Card>
          )}
        </div>

        {lastRoundPlayerPoints.length > 0 && (
          <LastRoundPlayerTable players={lastRoundPlayerPoints} allPlayers={rueckrundePlayers.length > 0 ? rueckrundePlayers : hinrundePlayers} />
        )}

        {managerGroups && managerGroups.length > 0 && (
          <>
            {managerGroups.map(group => (
              <ManagerGroupTable key={group.id} group={group} currentManagerId={manager.id} />
            ))}
          </>
        )}

        {hinrundePlayers.length > 0 && (
          <PlayerTable players={hinrundePlayers} title={`Hinrunde-Aufstellung (${hinrundePlayers.length} Spieler)`} />
        )}

        {hasExchanges && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">Winterwechsel</h2>
            
            {oldPlayers.length > 0 && (
              <PlayerTable players={oldPlayers} title="Raus:" />
            )}

            {newPlayers.length > 0 && (
              <PlayerTable players={newPlayers} title="Rein:" />
            )}
          </div>
        )}

        {hasExchanges && rueckrundePlayers.length > 0 && (
          <PlayerTable players={rueckrundePlayers} title={`Rückrunde-Aufstellung (${rueckrundePlayers.length} Spieler)`} />
        )}

        {chartData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">Punkte pro Spieltag</h2>
            <div className="bg-[#1a2028] p-4 rounded-lg border border-[#2d3748]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="name" stroke="#a0aec0" />
                  <YAxis stroke="#a0aec0" />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="punkte" fill="#c9a66b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {positionChartData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">Gesamtposition pro Spieltag</h2>
            <div className="bg-[#1a2028] p-4 rounded-lg border border-[#2d3748]">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={positionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="name" stroke="#a0aec0" label={{ value: 'Spieltag', position: 'bottom', fill: '#a0aec0' }} />
                  <YAxis stroke="#a0aec0" reversed domain={[1, 'auto']} tickCount={10} />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-3 shadow-lg">
                            <p className="text-[#f5f5f5] font-semibold">Spieltag {label}</p>
                            <p className="text-[#c9a66b]">Position: {payload[0].value}.</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line type="monotone" dataKey="position" stroke="#c9a66b" strokeWidth={2} dot={{ fill: '#c9a66b', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {managerGroupsWithStats && managerGroupsWithStats.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#f5f5f5]">Punkte-Entwicklung in Gruppe</h2>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="bg-[#242d38] border border-[#3d4a5c] text-[#f5f5f5] rounded-lg px-4 py-2 focus:outline-none focus:border-[#c9a66b]"
              >
                <option value="">Gruppe wählen</option>
                {managerGroupsWithStats.map((group) => (
                  <option key={group.groupId} value={group.groupId}>
                    {group.groupName}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedGroup && groupLineChartData.length > 0 ? (
              <div className="bg-[#1a2028] p-4 rounded-lg border border-[#2d3748]">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={groupLineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                    <XAxis dataKey="round" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<GroupCustomTooltip />} />
                    <Legend wrapperStyle={{ color: '#a0aec0' }} />
                    {selectedGroup.managers.map((m, index) => (
                      <Line
                        key={m.managerId}
                        type="monotone"
                        dataKey={m.shortName || m.managerName}
                        stroke={m.isCurrentUser ? '#c9a66b' : LINE_COLORS[index % LINE_COLORS.length]}
                        strokeWidth={m.isCurrentUser ? 3 : 2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-[#6b7280] text-center py-8">
                Wähle eine Gruppe aus, um die Punkte-Entwicklung zu sehen.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

type LastRoundSortKey = 'nameKicker' | 'team' | 'position' | 'prize' | 'points'

function LastRoundPlayerTable({ players, allPlayers }: { players: { playerId: number; playerName: string; points: number; rules: RulePoint[] }[]; allPlayers: Player[] }) {
  const [sortKey, setSortKey] = useState<LastRoundSortKey>('points')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const handleSort = (key: LastRoundSortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ column }: { column: LastRoundSortKey }) => {
    if (sortKey !== column) return <span className="text-[#6b7280] ml-1">⇅</span>
    return <span className="text-[#c9a66b] ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const enrichedPlayers = useMemo(() => {
    return players.map(pp => {
      const player = allPlayers.find(p => p.id === pp.playerId)
      return {
        ...pp,
        player: player || null
      }
    })
  }, [players, allPlayers])

  const sortedPlayers = useMemo(() => {
    return [...enrichedPlayers].sort((a, b) => {
      let comparison = 0
      const playerA = a.player
      const playerB = b.player
      
      switch (sortKey) {
        case 'nameKicker':
          comparison = a.playerName.localeCompare(b.playerName)
          break
        case 'team':
          const teamA = playerA?.teams[playerA.teams.length - 1]?.name || ''
          const teamB = playerB?.teams[playerB.teams.length - 1]?.name || ''
          comparison = teamA.localeCompare(teamB)
          break
        case 'position':
          const posA = playerA ? (positionOrder[playerA.position] || 0) : 999
          const posB = playerB ? (positionOrder[playerB.position] || 0) : 999
          comparison = posA - posB
          break
        case 'prize':
          const prizeA = playerA?.prize || 0
          const prizeB = playerB?.prize || 0
          comparison = prizeA - prizeB
          break
        case 'points':
          comparison = a.points - b.points
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [enrichedPlayers, sortKey, sortOrder])

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">Punkte letzte Runde</h2>
      <div className="overflow-x-auto rounded-lg border border-[#2d3748]">
        <table className="w-full">
          <thead className="bg-[#1a2028]">
            <tr>
              <th 
                className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('nameKicker')}
              >
                Spieler<SortIcon column="nameKicker" />
              </th>
              <th 
                className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('team')}
              >
                Team<SortIcon column="team" />
              </th>
              <th 
                className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('position')}
              >
                Position<SortIcon column="position" />
              </th>
              <th 
                className="px-3 py-2 text-right text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('prize')}
              >
                Wert<SortIcon column="prize" />
              </th>
              <th 
                className="px-3 py-2 text-right text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                onClick={() => handleSort('points')}
              >
                Punkte<SortIcon column="points" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-[#1a2028]">
            {sortedPlayers.map(pp => {
              const player = pp.player
              const currentTeam = player?.teams[player.teams.length - 1]
              const rulesText = pp.rules && pp.rules.length > 0 
                ? pp.rules.map(r => `${r.ruleLabel}${r.count > 1 ? ` (${r.count}x)` : ''}`).join(', ')
                : '-'
              return (
                <tr key={pp.playerId} className="hover:bg-[#242d38] border-b border-[#2d3748]">
                  <td className="px-3 py-2">
                    <RouterLink
                      to={`/players/${pp.playerId}`}
                      className="hover:text-[#c9a66b] link text-[#f5f5f5]"
                    >
                      {pp.playerName}
                    </RouterLink>
                  </td>
                  <td className="px-3 py-2">
                    {currentTeam?.logoSUrl && (
                      <img 
                        src={currentTeam.logoSUrl} 
                        alt={currentTeam.name}
                        className="w-6 h-6 object-contain inline-block mr-2"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                    <span className="text-[#a0aec0]">{currentTeam?.name || '-'}</span>
                  </td>
                  <td className="px-3 py-2">
                    {player && (
                      <Chip size="sm" color={positionColors[player.position]} variant="soft">
                        {positionLabels[player.position]}
                      </Chip>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-[#c9a66b]">
                    {player ? `${(player.prize / 1000000).toFixed(1)} Mio.` : '-'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span 
                      className="font-medium text-[#c9a66b] cursor-help" 
                      title={rulesText}
                    >
                      {pp.points}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}