import { useParams, Link as RouterLink } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useManager, useManagerRoundDetails, useManagerGroups } from '../hooks/useManagers'
import { useManagerGroupsWithStats } from '../hooks/useManagerGroups'
import { useAuth } from '../context/AuthContext'
import { useAvatar, useUploadAvatar, useDeleteAvatar } from '../hooks/useAvatar'
import { positionLabels, positionColors } from './Players'
import Badge from '../components/Badge'
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

type SortKey = 'positionTotal' | 'positionChange' | 'nameKicker' | 'points' | 'pointsLastRound' | 'managerCount' | 'prize' | 'position' | 'team'
type SortOrder = 'asc' | 'desc'

function PlayerRow({ player }: { player: Player }) {
  const currentTeam = player.teams[player.teams.length - 1]
  return (
    <tr className="border-b border-border hover:bg-card-hover">
      <td className="px-3 py-2 text-center font-medium text-foreground">
        {player.positionTotal ? `${player.positionTotal}.` : '-'}
      </td>
      <td className="px-3 py-2 text-center">
        {player.positionChange != null && player.positionChange !== 0 ? (
          <span className={`font-medium ${player.positionChange > 0 ? 'text-success' : 'text-danger'}`}>
            {player.positionChange > 0 ? `↑${player.positionChange}` : `↓${Math.abs(player.positionChange)}`}
          </span>
        ) : (
          <span className="text-subtle">-</span>
        )}
      </td>
      <td className="px-3 py-2">
        <RouterLink to={`/players/${player.id}`} className="flex items-center hover:text-foreground link">
          {player.pictureUrl && (
            <img src={player.pictureUrl} alt={player.nameKicker} className="w-10 h-10 rounded-full object-cover mr-3" />
          )}
          <div>
            <div className="font-medium text-primary">{player.nameKicker}</div>
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
            className={`text-xs font-medium px-2 py-0.5 rounded cursor-pointer hover:opacity-80 ${player.managerCount && player.managerCount > 0 ? 'chip-accent' : 'bg-elevated text-muted'}`}
          >
            {player.managerCount ?? 0}
          </span>
        </RouterLink>
      </td>
      <td className="px-3 py-2 text-right font-medium text-foreground">
        {player.prize.toLocaleString()} €
      </td>
      <td className="px-3 py-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${positionColors[player.position]}`}>
          {positionLabels[player.position]}
        </span>
      </td>
      <td className="px-3 py-2 text-muted">
        {currentTeam ? (
          <span className="flex items-center gap-1">
            {currentTeam.logoSUrl && (
              <img 
                src={currentTeam.logoSUrl} 
                alt={currentTeam.name} 
                className="w-5 h-5 object-contain flex-shrink-0"
              />
            )}
            <span className="font-semibold text-foreground">{currentTeam.name}</span>
          </span>
        ) : '-'}
      </td>
    </tr>
  )
}

function PlayerTable({ players, title }: { players: Player[]; title: string }) {
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
    if (sortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
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
          comparison = (positionOrder[a.position] || 0) - (positionOrder[b.position] || 0)
          break
        case 'team':
          const teamA = a.teams[a.teams.length - 1]?.name || ''
          const teamB = b.teams[b.teams.length - 1]?.name || ''
          comparison = teamA.localeCompare(teamB)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [players, sortKey, sortOrder])

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-elevated sticky top-0">
            <tr>
              <th 
                className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('positionTotal')}
              >
                Pos<SortIcon column="positionTotal" />
              </th>
              <th 
                className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('positionChange')}
              >
                +-<SortIcon column="positionChange" />
              </th>
              <th 
                className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('nameKicker')}
              >
                Name<SortIcon column="nameKicker" />
              </th>
              <th 
                className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('points')}
              >
                Pkt<SortIcon column="points" />
              </th>
              <th 
                className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('pointsLastRound')}
              >
                Spieltag<SortIcon column="pointsLastRound" />
              </th>
              <th 
                className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('managerCount')}
              >
                Manager<SortIcon column="managerCount" />
              </th>
              <th 
                className="px-3 py-2 text-right text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('prize')}
              >
                Preis<SortIcon column="prize" />
              </th>
              <th 
                className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('position')}
              >
                Position<SortIcon column="position" />
              </th>
              <th 
                className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('team')}
              >
                Team<SortIcon column="team" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface text-sm">
            {sortedPlayers.map((player) => (
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
    if (sortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
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
      <h2 className="text-lg font-semibold text-foreground mb-3">{group.name}</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-elevated sticky top-0">
            <tr>
              <th 
                className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('position')}
              >
                Pos<SortIcon column="position" />
              </th>
              <th 
                className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('playerName')}
              >
                Kürzel<SortIcon column="playerName" />
              </th>
              <th 
                className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('firstName')}
              >
                Vorname<SortIcon column="firstName" />
              </th>
              <th 
                className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('lastName')}
              >
                Nachname<SortIcon column="lastName" />
              </th>
              <th 
                className="px-3 py-2 text-right text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('points')}
              >
                Pkt<SortIcon column="points" />
              </th>
              <th className="px-3 py-2 text-right text-xs text-muted font-bold border-b border-border">Letzter Spieltag</th>
            </tr>
          </thead>
          <tbody className="bg-surface text-sm">
            {sortedManagers.map((m) => (
              <tr 
                key={m.id} 
                className={`hover:bg-card-hover border-b border-border ${m.id === currentManagerId ? 'bg-default' : ''}`}
              >
                <td className="px-3 py-2 text-foreground font-medium">{m.positionTotal ? `${m.positionTotal}.` : '-'}</td>
                <td className="px-3 py-2">
                  <RouterLink
                    to={`/managers/${m.id}`}
                    className={`hover:text-primary link ${m.id === currentManagerId ? 'text-primary font-semibold' : 'text-foreground'}`}
                  >
                    {m.shortName || m.name}
                  </RouterLink>
                </td>
                <td className="px-3 py-2 text-muted">{m.firstName || '-'}</td>
                <td className="px-3 py-2 text-muted">{m.lastName || '-'}</td>
                <td className="px-3 py-2 text-right font-medium text-primary">{m.pointsTotal ?? '-'}</td>
                <td className="px-3 py-2 text-right text-muted">{m.pointsLastRound ?? '-'}</td>
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
  const { user } = useAuth()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()
  const { data: managerAvatarUrl } = useAvatar(manager?.userId ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isOwnManager = !!(user && manager && manager.login === user.login)

  const managerInitials = useMemo(() => {
    if (!manager) return ''
    const first = manager.firstName?.trim()?.[0] ?? ''
    const last = manager.lastName?.trim()?.[0] ?? ''
    return (first + last).toUpperCase()
  }, [manager])

  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  useEffect(() => {
    if (managerGroupsWithStats && managerGroupsWithStats.length > 0 && !selectedGroupId) {
      setSelectedGroupId(managerGroupsWithStats[0].groupId.toString())
    }
  }, [managerGroupsWithStats, selectedGroupId])

  const handleAvatarClick = () => {
    if (isOwnManager) {
      fileInputRef.current?.click()
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !manager?.userId) return
    try {
      await uploadAvatar.mutateAsync({ file, userId: manager.userId })
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAvatarDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!manager?.userId) return
    if (!window.confirm('Profilbild wirklich löschen?')) return
    try {
      await deleteAvatar.mutateAsync({ userId: manager.userId })
    } catch (err) {
      console.error('Avatar delete failed:', err)
    }
  }

  const selectedGroup = useMemo(() => {
    if (!managerGroupsWithStats || !selectedGroupId) return null
    return managerGroupsWithStats.find(g => g.groupId.toString() === selectedGroupId)
  }, [managerGroupsWithStats, selectedGroupId])

  const sortedGroupManagers = useMemo(() => {
    if (!selectedGroup || selectedGroup.managers.length === 0) return []
    return [...selectedGroup.managers].sort((a, b) => {
      const aLastRound = a.roundData[a.roundData.length - 1]?.pointsCumulative ?? 0
      const bLastRound = b.roundData[b.roundData.length - 1]?.pointsCumulative ?? 0
      return bLastRound - aLastRound
    })
  }, [selectedGroup])

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

  const GroupLegend = ({ managers }: { managers: typeof sortedGroupManagers }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {managers.map((m, index) => (
          <div key={m.managerId} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: m.isCurrentUser ? '#0a6ed1' : LINE_COLORS[index % LINE_COLORS.length] }}
            />
            <span className="text-muted text-sm">
              {index + 1}. {m.shortName || m.managerName}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const GroupCustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="text-primary font-medium mb-2">Spieltag {label}</p>
          {[...payload].sort((a, b) => b.value - a.value).map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} Punkte
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>
  if (!manager) return <div className="text-center py-8 text-subtle">Manager nicht gefunden</div>

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
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="text-foreground font-semibold mb-2">Spieltag {label}</p>
          <p className="text-primary font-medium mb-2">{data.punkte} Punkte</p>
          {playerPoints.length > 0 && (
            <div className="text-sm">
              <p className="text-muted mb-1">Spieler:</p>
              {playerPoints.map((pp: { playerName: string; points: number }, idx: number) => (
                <p key={idx} className="text-foreground">{pp.playerName}: {pp.points} Pkt</p>
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
      <RouterLink to="/managers" className="inline-flex items-center gap-1 text-sm text-[#c9a66b] hover:text-[#d4b77a] hover:underline mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Übersicht
      </RouterLink>
      
      <div className="bg-surface border border-border rounded-lg shadow-2xl flex flex-col">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] md:grid-rows-[auto_auto] gap-3 md:gap-x-6 md:gap-y-3">
            <div className="relative group w-24 h-24 shrink-0 justify-self-center md:justify-self-start row-span-1 md:row-span-2">
              <button
                onClick={handleAvatarClick}
                className={`w-24 h-24 p-0 rounded-full overflow-hidden ${isOwnManager ? 'cursor-pointer' : 'cursor-default'}`}
                disabled={!isOwnManager || uploadAvatar.isPending || deleteAvatar.isPending}
                title={isOwnManager ? 'Profilbild ändern' : undefined}
              >
                {managerAvatarUrl ? (
                  <img
                    src={managerAvatarUrl}
                    alt={manager.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-elevated flex items-center justify-center">
                    {managerInitials ? (
                      <span className="text-2xl font-bold text-primary">{managerInitials}</span>
                    ) : (
                      <i className="sap-icon sap-icon-employee text-[28px] text-primary" />
                    )}
                  </div>
                )}
              </button>
              {isOwnManager && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                  <i className="sap-icon sap-icon-camera text-white text-xl" />
                </div>
              )}
              {isOwnManager && managerAvatarUrl && (
                <button
                  type="button"
                  onClick={handleAvatarDelete}
                  disabled={deleteAvatar.isPending || uploadAvatar.isPending}
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto shadow-md"
                  title="Profilbild löschen"
                >
                  <i className="sap-icon sap-icon-delete text-sm" />
                </button>
              )}
              {(uploadAvatar.isPending || deleteAvatar.isPending) && (
                <div className="absolute inset-0 bg-surface/80 flex items-center justify-center rounded-full">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{manager.name}</h1>
              {manager.shortName && (
                <Badge>{manager.shortName}</Badge>
              )}
              <Badge variant="muted">Manager</Badge>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${manager.paymentState === 'PAID' ? 'chip-success' : 'chip-danger'}`}>
                {paymentStateLabels[manager.paymentState as keyof typeof paymentStateLabels] || manager.paymentState}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex md:items-start md:gap-2">
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-badge text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Position (Saison)</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{manager.positionTotal ? `${manager.positionTotal}.` : '-'}</p>
                </div>
              </div>
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-horizontal-bar-chart text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Punkte (Saison)</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{manager.pointsTotal ?? '-'}</p>
                </div>
              </div>
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-calendar text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Letzte Runde</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{manager.pointsLastRound ?? '-'} Pkt</p>
                </div>
              </div>
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-date-time text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Spieltag</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{currentRoundNumber || '-'}</p>
                </div>
              </div>
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-money-bills text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Hinrunde-Wert</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{(hinrundeBudget / 1000000).toFixed(2)} Mio. €</p>
                </div>
              </div>
              {hasExchanges && (
                <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <i className="sap-icon sap-icon-money-bills text-base text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted leading-tight">Rückrunde-Wert</p>
                    <p className="text-sm font-bold text-foreground leading-tight">{(rueckrundeBudget / 1000000).toFixed(2)} Mio. €</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
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
            <h2 className="text-lg font-semibold text-foreground mb-3">Winterwechsel</h2>
            
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
            <h2 className="text-lg font-semibold text-foreground mb-3">Punkte pro Spieltag</h2>
            <div className="bg-surface p-4 rounded-lg border border-border">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
                  <XAxis dataKey="name" stroke="#c5c5c5" />
                  <YAxis stroke="#c5c5c5" />
                  <RechartsTooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                  <Bar dataKey="punkte" fill="#0a6ed1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {positionChartData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">Gesamtposition pro Spieltag</h2>
            <div className="bg-surface p-4 rounded-lg border border-border">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={positionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
                  <XAxis dataKey="name" stroke="#c5c5c5" label={{ value: 'Spieltag', position: 'bottom', fill: '#c5c5c5' }} />
                  <YAxis stroke="#c5c5c5" reversed domain={[1, 'auto']} tickCount={10} />
                  <RechartsTooltip 
                    cursor={false}
                    wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
                            <p className="text-foreground font-semibold">Spieltag {label}</p>
                            <p className="text-primary">Position: {payload[0].value}.</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line type="monotone" dataKey="position" stroke="#0a6ed1" strokeWidth={2} dot={{ fill: '#0a6ed1', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {managerGroupsWithStats && managerGroupsWithStats.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Punkte-Entwicklung in Gruppe</h2>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="input-field rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
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
              <div className="bg-surface p-4 rounded-lg border border-border">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={groupLineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
                    <XAxis dataKey="round" stroke="#8999a8" />
                    <YAxis stroke="#8999a8" />
                    <RechartsTooltip content={<GroupCustomTooltip />} cursor={false} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                    {sortedGroupManagers.map((m, index) => (
                      <Line
                        key={m.managerId}
                        type="monotone"
                        dataKey={m.shortName || m.managerName}
                        stroke={m.isCurrentUser ? '#0a6ed1' : LINE_COLORS[index % LINE_COLORS.length]}
                        strokeWidth={m.isCurrentUser ? 3 : 2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <GroupLegend managers={sortedGroupManagers} />
              </div>
            ) : (
              <p className="text-subtle text-center py-8">
                Wähle eine Gruppe aus, um die Punkte-Entwicklung zu sehen.
              </p>
            )}
          </div>
        )}
        </div>
      </div>
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
    if (sortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
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
      <h2 className="text-lg font-semibold text-foreground mb-3">Punkte letzte Runde</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-elevated sticky top-0">
            <tr>
              <th 
                className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('nameKicker')}
              >
                Spieler<SortIcon column="nameKicker" />
              </th>
              <th 
                className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('team')}
              >
                Team<SortIcon column="team" />
              </th>
              <th 
                className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('position')}
              >
                Position<SortIcon column="position" />
              </th>
              <th 
                className="px-3 py-2 text-right text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('prize')}
              >
                Wert<SortIcon column="prize" />
              </th>
              <th 
                className="px-3 py-2 text-right text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                onClick={() => handleSort('points')}
              >
                Punkte<SortIcon column="points" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface text-sm">
            {sortedPlayers.map((pp) => {
              const player = pp.player
              const currentTeam = player?.teams[player.teams.length - 1]
              const rulesText = pp.rules && pp.rules.length > 0 
                ? pp.rules.map(r => `${r.ruleLabel}${r.count > 1 ? ` (${r.count}x)` : ''}`).join(', ')
                : '-'
              return (
                <tr key={pp.playerId} className="hover:bg-card-hover border-b border-border">
                  <td className="px-3 py-2">
                    <RouterLink
                      to={`/players/${pp.playerId}`}
                      className="flex items-center hover:text-foreground link"
                    >
                      {pp.player?.pictureUrl && (
                        <img src={pp.player.pictureUrl} alt={pp.playerName} className="w-10 h-10 rounded-full object-cover mr-3" />
                      )}
                      <div className="font-medium text-primary">{pp.playerName}</div>
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
                    <span className="text-muted">{currentTeam?.name || '-'}</span>
                  </td>
                  <td className="px-3 py-2">
                    {player && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${positionColors[player.position]}`}>
                        {positionLabels[player.position]}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-primary">
                    {player ? `${(player.prize / 1000000).toFixed(1)} Mio.` : '-'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span 
                      className="font-medium text-primary cursor-help" 
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
