import { Link as RouterLink } from 'react-router-dom'
import { Card } from '@heroui/react'
import { useState, useMemo, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useCurrentManager, useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useAuth } from '../context/AuthContext'
import { useMyGroupsWithStats, useManagerGroupsWithStats } from '../hooks/useManagerGroups'

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

  useEffect(() => {
    if (groupsWithStats && groupsWithStats.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groupsWithStats[0].groupId.toString())
    }
  }, [groupsWithStats, selectedGroupId])

  const topManagersLastRound = useMemo(() => {
    if (!managers) return []
    return [...managers]
      .filter(m => m.pointsLastRound !== undefined)
      .sort((a, b) => (b.pointsLastRound ?? 0) - (a.pointsLastRound ?? 0))
      .slice(0, 3)
  }, [managers])

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

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {isAuthenticated && displayManager ? (
          <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4 flex items-center gap-2">
              <span className="text-[#c9a66b]">👤</span> {isAdmin ? 'Admin-Ansicht: uwe72' : 'Dein Manager'}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-[#c9a66b]">{displayManager.positionTotal ?? '-'}</p>
                <p className="text-sm text-[#6b7280]">Platz</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#f5f5f5]">{displayManager.pointsTotal ?? '-'}</p>
                <p className="text-sm text-[#6b7280]">Punkte</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#f5f5f5]">+{displayManager.pointsLastRound ?? '-'}</p>
                <p className="text-sm text-[#6b7280]">Letzte Rd</p>
              </div>
            </div>
            <RouterLink 
              to={`/managers/${displayManager.id}`} 
              className="block mt-4 text-center text-[#c9a66b] hover:text-[#d4b77a] link"
            >
              Zum Manager →
            </RouterLink>
          </Card>
        ) : (
          <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4 flex items-center gap-2">
              <span className="text-[#c9a66b]">👤</span> Dein Manager
            </h3>
            <p className="text-[#6b7280] text-center py-4">
              Melde dich an, um deinen Manager zu sehen.
            </p>
          </Card>
        )}

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4 flex items-center gap-2">
            <span className="text-[#c9a66b]">🏆</span> Manager des {season?.currentMatchday ? `${season.currentMatchday}. ` : ''}Spieltags
          </h3>
          {topManagersLastRound.length > 0 ? (
            <div className="space-y-3">
              {topManagersLastRound.map((m, i) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : 'bg-amber-700 text-white'
                    }`}>
                      {i + 1}
                    </span>
                    <RouterLink to={`/managers/${m.id}`} className="text-[#c9a66b] hover:text-[#f5f5f5] link">
                      {m.firstName && m.lastName 
                        ? `${m.firstName} ${m.lastName} (${m.shortName || m.name})`
                        : m.shortName || m.name}
                    </RouterLink>
                  </div>
                  <span className="text-[#f5f5f5] font-medium">{m.pointsLastRound} Punkte</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#6b7280] text-center py-4">Keine Daten verfügbar</p>
          )}
        </Card>
      </div>

      {groupsWithStats && groupsWithStats.length > 0 && (
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748] mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#f5f5f5] flex items-center gap-2">
              <span className="text-[#c9a66b]">📈</span> Punkte-Entwicklung in Gruppe
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
