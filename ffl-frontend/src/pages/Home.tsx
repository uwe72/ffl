import { Link as RouterLink } from 'react-router-dom'
import { Card, Chip } from '@heroui/react'
import { useState, useMemo, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useCurrentManager, useManagersBySeason, useManagerRoundDetails } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useAuth } from '../context/AuthContext'
import { useMyGroupsWithStats, useManagerGroupsWithStats } from '../hooks/useManagerGroups'
import type { Player } from '../types'

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

const positionLabels: Record<string, string> = {
  GOALKEEPER: 'TW',
  DEFENDER: 'VT',
  MIDFIELD: 'MF',
  STRIKER: 'ST'
}

const positionColors: Record<string, 'success' | 'warning' | 'accent' | 'danger'> = {
  GOALKEEPER: 'success',
  DEFENDER: 'warning',
  MIDFIELD: 'accent',
  STRIKER: 'danger'
}

export default function Home() {
  const { isAuthenticated, user } = useAuth()
  const { data: season } = useCurrentSeason()
  const { data: currentManager } = useCurrentManager()
  const { data: managers } = useManagersBySeason(season?.id || 0)
  
  const isAdmin = user?.role === 'ADMIN'
  const uwe72Manager = managers?.find(m => m.shortName === 'uwe72')
  const displayManager = isAdmin ? uwe72Manager : currentManager
  
  const { data: myGroupsWithStats } = useMyGroupsWithStats(!isAdmin)
  const { data: uwe72GroupsWithStats } = useManagerGroupsWithStats(uwe72Manager?.id ?? 0, isAdmin && !!uwe72Manager)
  const groupsWithStats = isAdmin ? uwe72GroupsWithStats : myGroupsWithStats

  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  const { data: roundDetails } = useManagerRoundDetails(displayManager?.id ?? 0)

  useEffect(() => {
    if (groupsWithStats && groupsWithStats.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groupsWithStats[0].groupId.toString())
    }
  }, [groupsWithStats, selectedGroupId])

  const sortedManagers = useMemo(() => {
    if (!managers) return []
    return [...managers].sort((a, b) => (a.positionTotal ?? 999) - (b.positionTotal ?? 999))
  }, [managers])

  const managerRankChange = useMemo(() => {
    if (!roundDetails || !season?.currentMatchday) return null
    const currentMatchday = season.currentMatchday
    const currentRound = roundDetails.find(r => r.roundNumber === currentMatchday)
    const previousRound = roundDetails.find(r => r.roundNumber === currentMatchday - 1)
    if (!currentRound || !previousRound) return null
    if (currentRound.positionTotal == null || previousRound.positionTotal == null) return null
    return previousRound.positionTotal - currentRound.positionTotal
  }, [roundDetails, season])

  const nearbyManagers = useMemo(() => {
    if (!sortedManagers.length || !displayManager?.positionTotal) return []
    const currentPos = displayManager.positionTotal
    return sortedManagers.filter(m => {
      const pos = m.positionTotal ?? 999
      return pos >= currentPos - 2 && pos <= currentPos + 2
    })
  }, [sortedManagers, displayManager])

  const lastRoundPlayerPoints = useMemo(() => {
    if (!roundDetails || roundDetails.length === 0) return []
    const lastRound = roundDetails[roundDetails.length - 1]
    return lastRound?.playerPoints || []
  }, [roundDetails])

  const displayManagerPlayers = useMemo((): Player[] => {
    if (!displayManager) return []
    return [
      displayManager.playerGoalkeeper,
      displayManager.playerDefender1,
      displayManager.playerDefender2,
      displayManager.playerDefender3,
      displayManager.playerMidfield1,
      displayManager.playerMidfield2,
      displayManager.playerMidfield3,
      displayManager.playerStriker1,
      displayManager.playerStriker2,
      displayManager.playerStriker3,
      displayManager.playerFreeChoice
    ].filter(Boolean) as Player[]
  }, [displayManager])

  const enrichedPlayerPoints = useMemo(() => {
    return lastRoundPlayerPoints.map(pp => {
      const player = displayManagerPlayers.find(p => p.id === pp.playerId)
      return {
        ...pp,
        player
      }
    })
  }, [lastRoundPlayerPoints, displayManagerPlayers])

  const selectedGroup = useMemo(() => {
    if (!groupsWithStats || !selectedGroupId) return null
    return groupsWithStats.find(g => g.groupId.toString() === selectedGroupId)
  }, [groupsWithStats, selectedGroupId])

  const lineChartData = useMemo(() => {
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-3 shadow-lg">
          <p className="text-[#c9a66b] font-medium mb-2">Spieltag {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} Punkte
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="py-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#f5f5f5] mb-2">
          Willkommen bei FFL
        </h1>
        {season && (
          <p className="text-[#a0aec0]">
            Saison {season.name} · {season.seasonState === 'RUNNING_HINRUNDE' ? 'Hinrunde' : season.seasonState === 'RUNNING_RUECKRUNDE' ? 'Rückrunde' : 'Vor Saison'}
            {season.currentMatchday && ` · Spieltag ${season.currentMatchday}`}
          </p>
        )}
      </div>

      {isAuthenticated && displayManager && (
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748] mb-8">
          <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4">
            {isAdmin ? 'Uwe Clement (Admin)' : (displayManager.shortName || displayManager.name)}
          </h3>
          
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-[#242d38] rounded-lg border border-[#3d4a5c]">
              <p className="text-2xl font-bold text-[#f5f5f5]">{displayManager.positionTotal ? `${displayManager.positionTotal}.` : '-'}</p>
              <p className="text-xs text-[#6b7280] mt-1">Platz</p>
            </div>
            <div className="text-center p-3 bg-[#242d38] rounded-lg border border-[#3d4a5c]">
              {managerRankChange !== null && managerRankChange !== 0 ? (
                <div className="flex items-center justify-center gap-1">
                  <span className={`text-2xl font-bold ${managerRankChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {managerRankChange > 0 ? '↑' : '↓'}
                  </span>
                  <span className={`text-xl font-bold ${managerRankChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Math.abs(managerRankChange)}
                  </span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-[#f5f5f5]">-</p>
              )}
              <p className="text-xs text-[#6b7280] mt-1">Platz-Änderung</p>
            </div>
            <div className="text-center p-3 bg-[#242d38] rounded-lg border border-[#3d4a5c]">
              <p className="text-2xl font-bold text-[#c9a66b]">{displayManager.pointsTotal ?? '-'}</p>
              <p className="text-xs text-[#6b7280] mt-1">Punkte gesamt</p>
            </div>
            <div className="text-center p-3 bg-[#242d38] rounded-lg border border-[#3d4a5c]">
              <p className="text-2xl font-bold text-[#c9a66b]">+{displayManager.pointsLastRound ?? '-'}</p>
              <p className="text-xs text-[#6b7280] mt-1">Letzter Spieltag</p>
            </div>
          </div>

          {nearbyManagers.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-[#a0aec0] mb-2">Manager im Umfeld</h4>
              <div className="overflow-x-auto rounded-lg border border-[#2d3748]">
                <table className="w-full">
                  <thead className="bg-[#242d38]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium">Pos</th>
                      <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium">Manager</th>
                      <th className="px-3 py-2 text-right text-xs text-[#a0aec0] font-medium">Pkt</th>
                      <th className="px-3 py-2 text-right text-xs text-[#a0aec0] font-medium">Letzter ST</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#1a2028]">
                    {nearbyManagers.map(m => (
                      <tr 
                        key={m.id} 
                        className={`border-b border-[#2d3748] hover:bg-[#242d38] ${m.id === displayManager.id ? 'bg-[#2d3748]' : ''}`}
                      >
                        <td className="px-3 py-2 text-[#f5f5f5] font-medium">{m.positionTotal ? `${m.positionTotal}.` : '-'}</td>
                        <td className="px-3 py-2">
                          <RouterLink 
                            to={`/managers/${m.id}`} 
                            className={`hover:text-[#c9a66b] link ${m.id === displayManager.id ? 'text-[#c9a66b] font-semibold' : 'text-[#f5f5f5]'}`}
                          >
                            {m.shortName || m.name}
                          </RouterLink>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-[#c9a66b]">{m.pointsTotal ?? '-'}</td>
                        <td className="px-3 py-2 text-right text-[#a0aec0]">+{m.pointsLastRound ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {enrichedPlayerPoints.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#a0aec0] mb-2">Spielerpunkte letzte Runde</h4>
              <div className="overflow-x-auto rounded-lg border border-[#2d3748]">
                <table className="w-full">
                  <thead className="bg-[#242d38]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium">Spieler</th>
                      <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium">Team</th>
                      <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium">Pos</th>
                      <th className="px-3 py-2 text-right text-xs text-[#a0aec0] font-medium">Wert</th>
                      <th className="px-3 py-2 text-right text-xs text-[#a0aec0] font-medium">Punkte</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#1a2028]">
                    {enrichedPlayerPoints
                      .sort((a, b) => b.points - a.points)
                      .map(pp => {
                        const player = pp.player
                        const currentTeam = player?.teams?.[player.teams.length - 1]
                        const rulesText = pp.rules && pp.rules.length > 0 
                          ? pp.rules.map(r => `${r.ruleLabel}${r.count > 1 ? ` (${r.count}x)` : ''}`).join(', ')
                          : '-'
                        return (
                          <tr key={pp.playerId} className="border-b border-[#2d3748] hover:bg-[#242d38]">
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
                                  className="w-5 h-5 object-contain inline-block mr-1"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              )}
                              <span className="text-[#a0aec0] text-sm">{currentTeam?.name || '-'}</span>
                            </td>
                            <td className="px-3 py-2">
                              {player && (
                                <Chip size="sm" color={positionColors[player.position]} variant="soft">
                                  {positionLabels[player.position]}
                                </Chip>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-medium text-[#c9a66b]">
                              {player ? `${(player.prize / 1000000).toFixed(1)}M` : '-'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span 
                                className="font-medium text-[#c9a66b] cursor-help text-sm" 
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
          )}

          <RouterLink 
            to={`/managers/${displayManager.id}`} 
            className="block mt-4 text-center text-[#c9a66b] hover:text-[#d4b77a] link text-sm"
          >
            Zur Manager-Übersicht →
          </RouterLink>
        </Card>
      )}

      {groupsWithStats && groupsWithStats.length > 0 && (
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748] mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#f5f5f5]">
              Punkte-Entwicklung in Gruppe
            </h3>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-[#242d38] border border-[#3d4a5c] text-[#f5f5f5] rounded-lg px-4 py-2 focus:outline-none focus:border-[#c9a66b]"
            >
              <option value="">Gruppe wählen</option>
              {groupsWithStats.map((group) => (
                <option key={group.groupId} value={group.groupId}>
                  {group.groupName}
                </option>
              ))}
            </select>
          </div>
          
          {selectedGroup && lineChartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="round" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
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
        </Card>
      )}

    </div>
  )
}
