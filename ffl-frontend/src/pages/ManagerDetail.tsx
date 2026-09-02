import { useParams, Link as RouterLink } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useManager, useManagerRoundDetails, useManagerGroups, useUpdateManagerDetails } from '../hooks/useManagers'
import { useManagerGroupsWithStats } from '../hooks/useManagerGroups'
import { useDashboardAufstellung } from '../hooks/useDashboard'
import { useAuth } from '../context/AuthContext'
import { useAvatar, useUploadAvatar, useDeleteAvatar } from '../hooks/useAvatar'
import { positionLabels, positionColors } from './Players'
import Button from '../components/Button'
import BackButton from '../components/BackButton'
import useIsMobile from '../hooks/useIsMobile'
import SortIcon from '../components/SortIcon'
import Badge from '../components/Badge'
import ScoreLine from '../components/statistik/ScoreLine'
import AufstellungVertikal from '../components/statistik/AufstellungVertikal'
import { TableHead, ThSortable, Th, TableBody } from '../components/Table'
import { getChartColors, CHART_SERIES_PALETTE } from '../utils/chartColors'
import type { Player, ManagerGroup, RulePoint } from '../types'

const chartColors = getChartColors()
const LINE_COLORS = CHART_SERIES_PALETTE

const mailThemeLabels = {
  LIGHTMODE: 'Lightmode',
  DARKMODE: 'Darkmode'
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
  const isMobile = useIsMobile()
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
        <RouterLink to={`/players/${player.id}`} className="flex items-center link">
          {!isMobile && player.pictureUrl && (
            <img src={player.pictureUrl} alt={player.nameKicker} className="w-10 h-10 rounded-full object-cover mr-3" />
          )}
          <div>
            <div className={player.aktiv === false ? 'font-medium text-danger line-through' : 'font-medium text-link'}>{player.nameKicker}</div>
            {!isMobile && player.firstName && player.lastName && (
              <div className="text-sm text-subtle">
                {player.firstName} {player.lastName}
              </div>
            )}
          </div>
        </RouterLink>
      </td>
      <td className="px-3 py-2 text-center font-bold text-foreground">
        {player.points ?? '-'}
      </td>
      <td className="px-3 py-2 text-center text-muted">
        {player.pointsLastRound ?? '-'}
      </td>
      <td className="px-3 py-2 text-center">
        <RouterLink to={`/players/${player.id}`}>
          <span 
            className={`text-xs font-medium px-2 py-0.5 rounded-badge cursor-pointer hover:opacity-80 ${player.managerCount && player.managerCount > 0 ? 'chip-accent' : 'bg-elevated text-muted'}`}
          >
            {player.managerCount ?? 0}
          </span>
        </RouterLink>
      </td>
      <td className="px-3 py-2 text-right font-medium text-foreground">
        {player.prize.toLocaleString()} €
      </td>
      <td className="px-3 py-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-badge ${positionColors[player.position]}`}>
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
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full">
          <TableHead>
            <tr>
              <ThSortable align="center" onClick={() => handleSort('positionTotal')}>
                Pos<SortIcon column="positionTotal" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable align="center" onClick={() => handleSort('positionChange')}>
                +-<SortIcon column="positionChange" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable onClick={() => handleSort('nameKicker')}>
                Name<SortIcon column="nameKicker" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable align="center" onClick={() => handleSort('points')}>
                Punkte<SortIcon column="points" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable align="center" onClick={() => handleSort('pointsLastRound')}>
                1. Spieltag<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable align="center" onClick={() => handleSort('managerCount')}>
                Manager<SortIcon column="managerCount" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable align="right" onClick={() => handleSort('prize')}>
                Preis<SortIcon column="prize" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable onClick={() => handleSort('position')}>
                Position<SortIcon column="position" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable onClick={() => handleSort('team')}>
                Verein<SortIcon column="team" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
            </tr>
          </TableHead>
          <TableBody>
            {sortedPlayers.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </TableBody>
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
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full">
          <TableHead>
            <tr>
              <ThSortable onClick={() => handleSort('position')}>
                Pos<SortIcon column="position" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable onClick={() => handleSort('playerName')}>
                Kürzel<SortIcon column="playerName" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable onClick={() => handleSort('firstName')}>
                Vorname<SortIcon column="firstName" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable onClick={() => handleSort('lastName')}>
                Nachname<SortIcon column="lastName" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable align="right" onClick={() => handleSort('points')}>
                Pkt<SortIcon column="points" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <Th align="right">Letzter Spieltag</Th>
            </tr>
          </TableHead>
          <TableBody>
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
          </TableBody>
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
  const { data: aufstellung } = useDashboardAufstellung(Number(id))
  const isVorsaison = aufstellung?.phase === 'VORSAISON'
  const feldModus = isVorsaison ? 'wert' : 'gesamt'
  const { user } = useAuth()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()
  const updateDetails = useUpdateManagerDetails()
  const { data: managerAvatarUrl } = useAvatar(manager?.userId ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  const isAdmin = user?.role === 'ADMIN'
  const isOwnManager = !!(user && manager && manager.login === user.login)

  const [stammdatenOpen, setStammdatenOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    description: '',
    mailTheme: 'LIGHTMODE'
  })

  useEffect(() => {
    if (manager) {
      setEditData({
        firstName: manager.firstName || '',
        lastName: manager.lastName || '',
        description: manager.description || '',
        mailTheme: manager.mailTheme || 'LIGHTMODE'
      })
    }
  }, [manager])

  const hasDetailsChanges = manager && (
    editData.firstName !== (manager.firstName || '') ||
    editData.lastName !== (manager.lastName || '') ||
    editData.description !== (manager.description || '') ||
    editData.mailTheme !== (manager.mailTheme || 'LIGHTMODE')
  )

  const handleDetailsSave = async () => {
    setIsSaving(true)
    try {
      await updateDetails.mutateAsync({ id: Number(id), data: editData })
      setStammdatenOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDetailsCancel = () => {
    if (manager) {
      setEditData({
        firstName: manager.firstName || '',
        lastName: manager.lastName || '',
        description: manager.description || '',
        mailTheme: manager.mailTheme || 'LIGHTMODE'
      })
    }
    setStammdatenOpen(false)
  }

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
              style={{ backgroundColor: m.isCurrentUser ? chartColors.accent : LINE_COLORS[index % LINE_COLORS.length] }}
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
        <div className="bg-surface border border-border rounded-card p-3 shadow-lg">
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

  if (isLoading) {
    return (
      <div className="max-w-6xl" aria-busy="true">
        <BackButton to="/managers" className="mb-4" />
        <div className="p-4 bg-elevated border border-border rounded-card mb-6">
          <div className="flex items-stretch gap-6">
            <div className="aspect-square rounded-full bg-card-muted animate-pulse motion-reduce:animate-none shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-3 w-24 rounded-control bg-card-muted animate-pulse motion-reduce:animate-none mb-3" />
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(i => (
                  <div key={i}>
                    <div className="h-3 w-16 rounded-control bg-card-muted animate-pulse motion-reduce:animate-none mb-2" />
                    <div className="h-8 w-full rounded-control bg-card-muted animate-pulse motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-6xl">
        <BackButton to="/managers" className="mb-4" />
        <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-card">
          <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
          <p className="text-danger text-sm">Fehler beim Laden des Managers.</p>
        </div>
      </div>
    )
  }
  if (!manager) {
    return (
      <div className="max-w-6xl">
        <BackButton to="/managers" className="mb-4" />
        <div className="flex items-center gap-3 p-3 bg-elevated border border-border rounded-card">
          <i className="sap-icon sap-icon-information text-[18px] text-muted shrink-0" />
          <p className="text-sm text-muted">Manager nicht gefunden.</p>
        </div>
      </div>
    )
  }

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

  const rueckrundePlayers = hasExchanges
    ? [...hinrundePlayers.filter(p => !oldPlayers.find(op => op.id === p.id)), ...newPlayers]
    : hinrundePlayers

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
  const lastRoundPlayerPoints = lastRound?.playerPoints || []

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { punkte: number; playerPoints: Array<{ playerName: string; points: number }> } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const playerPoints = data.playerPoints || []
      return (
        <div className="bg-surface border border-border rounded-card p-3 shadow-lg">
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
    <div className="max-w-6xl">
      <BackButton to="/managers" className="mb-4" />

      <div className={`${isMobile ? 'px-3 py-0.5 bg-surface mb-0' : 'p-4 bg-elevated mb-6'} border border-border rounded-card`}>
        <div className="flex items-center gap-4">
          {!isMobile && (
            <>
              <div className="relative group w-20 h-20 shrink-0">
                <button
                  onClick={handleAvatarClick}
                  className={`w-20 h-20 p-0 rounded-full overflow-hidden ${isOwnManager ? 'cursor-pointer' : 'cursor-default'}`}
                  disabled={!isOwnManager || uploadAvatar.isPending || deleteAvatar.isPending}
                  title={isOwnManager ? 'Profilbild ändern' : undefined}
                >
                  {managerAvatarUrl ? (
                    <img
                      src={managerAvatarUrl}
                      alt={manager.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-elevated border border-border flex items-center justify-center">
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
                    className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-danger hover:bg-danger-hover text-danger-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto shadow-md"
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
            </>
          )}

          <div className="flex-1 min-w-0">
            {!stammdatenOpen && isMobile && (
              <div className="min-w-0">
                <div className="text-base font-semibold text-foreground truncate">
                  {manager.firstName || manager.lastName
                    ? `${manager.firstName} ${manager.lastName}`.trim()
                    : manager.name}
                  {manager.login && (
                    <span className="text-sm font-normal text-muted"> ({manager.login})</span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted leading-relaxed">
                  <ScoreLine
                    position={aufstellung?.positionSpieltag ?? null}
                    positionVorher={aufstellung?.positionSpieltagVorher ?? null}
                    punkte={aufstellung?.punkteSpieltag ?? null}
                    punkteVorher={aufstellung?.punkteSpieltagVorher ?? null}
                  />
                </div>
              </div>
            )}

            {!stammdatenOpen && !isMobile && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <div className="min-w-0">
                  <h2 className="text-3xl font-bold text-foreground truncate">
                    {manager.firstName || manager.lastName
                      ? `${manager.firstName} ${manager.lastName}`.trim()
                      : manager.name}
                  </h2>
                  {manager.login && (
                    <p className="text-xs uppercase tracking-wide text-subtle mt-2">
                      {manager.login}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-card rounded-card border border-border px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle">Punkte gesamt</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {manager.pointsTotal != null ? manager.pointsTotal : '—'}
                      </span>
                      {manager.pointsLastRound != null && manager.pointsLastRound > 0 && (
                        <Badge variant="success">+{manager.pointsLastRound}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="bg-card rounded-card border border-border px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle">Position gesamt</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {manager.positionTotal ? `${manager.positionTotal}.` : '—'}
                      </span>
                      {manager.positionChange != null && manager.positionChange !== 0 && (
                        <Badge variant={manager.positionChange > 0 ? 'success' : 'danger'}>
                          {manager.positionChange > 0 ? `+${manager.positionChange}` : `-${Math.abs(manager.positionChange)}`}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {stammdatenOpen && (
              <div id="manager-stammdaten-form">
                <div className="grid grid-cols-3 gap-4">
                  <div className="min-w-0">
                    <span className="text-xs text-muted">Vorname</span>
                    <input
                      type="text"
                      value={editData.firstName}
                      onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted">Nachname</span>
                    <input
                      type="text"
                      value={editData.lastName}
                      onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted">Login (Kürzel)</span>
                    <input
                      type="text"
                      value={manager.login || ''}
                      readOnly
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted">Theme Spieltagsmail</span>
                    <select
                      value={editData.mailTheme}
                      onChange={(e) => setEditData({ ...editData, mailTheme: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1 cursor-pointer"
                    >
                      {Object.entries(mailThemeLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0" />
                  <div className="col-span-3 min-w-0">
                    <span className="text-xs text-muted">Beschreibung</span>
                    <textarea
                      rows={2}
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                </div>
                {hasDetailsChanges && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="emphasized"
                      size="sm"
                      onClick={handleDetailsSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Wird gespeichert...' : 'Speichern'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDetailsCancel}
                    >
                      Abbrechen
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isAdmin && (
            <Button
              variant={stammdatenOpen ? 'ghost' : 'emphasized'}
              size="sm"
              onClick={() => setStammdatenOpen(o => !o)}
              aria-expanded={stammdatenOpen}
              aria-controls="manager-stammdaten-form"
              className="shrink-0 self-start"
            >
              <i className={`sap-icon sap-icon-slim-arrow-${stammdatenOpen ? 'up' : 'down'} text-xs mr-1`} />
              {stammdatenOpen ? 'Schließen' : 'Bearbeiten'}
            </Button>
          )}
        </div>
      </div>

      {isMobile && (
        aufstellung ? (
          <AufstellungVertikal aufstellung={aufstellung} modus={feldModus} />
        ) : (
          <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
        )
      )}

      {lastRoundPlayerPoints.length > 0 && (
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Punkte letzte Runde</h3>
          <LastRoundPlayerTable players={lastRoundPlayerPoints} allPlayers={rueckrundePlayers.length > 0 ? rueckrundePlayers : hinrundePlayers} />
        </div>
      )}

      {!isMobile && isOwnManager && managerGroups && managerGroups.length > 0 && (
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Gruppen</h3>
          {managerGroups.map(group => (
            <ManagerGroupTable key={group.id} group={group} currentManagerId={manager.id} />
          ))}
        </div>
      )}

      {(hinrundePlayers.length > 0 || hasExchanges) && !isMobile && (
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
          {hinrundePlayers.length > 0 && (
            <PlayerTable players={hinrundePlayers} title="Hinrunde-Aufstellung" />
          )}

          {hasExchanges && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-foreground mb-3">Winterwechsel</h3>
              {oldPlayers.length > 0 && (
                <PlayerTable players={oldPlayers} title="Raus:" />
              )}
              {newPlayers.length > 0 && (
                <div className="mt-6">
                  <PlayerTable players={newPlayers} title="Rein:" />
                </div>
              )}
            </div>
          )}

          {hasExchanges && rueckrundePlayers.length > 0 && (
            <div className="mt-6">
              <PlayerTable players={rueckrundePlayers} title={`Rückrunde-Aufstellung (${rueckrundePlayers.length} Spieler)`} />
            </div>
          )}
        </div>
      )}

      {chartData.length > 0 && (
        <div className={`px-3 py-4 md:p-6 bg-surface border border-border ${isMobile ? 'mb-0' : 'mb-6'}`}>
          <h3 className="text-xl font-semibold text-foreground mb-3">Punkte pro Spieltag</h3>
          <div className="bg-card p-4 rounded-card border border-border">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="name" stroke={chartColors.axis} />
                <YAxis stroke={chartColors.axis} />
                <RechartsTooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                <Bar dataKey="punkte" fill={chartColors.accent} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {positionChartData.length > 0 && (
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-3">Gesamtposition pro Spieltag</h3>
          <div className="bg-card p-4 rounded-card border border-border">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={positionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="name" stroke={chartColors.axis} label={{ value: 'Spieltag', position: 'bottom', fill: chartColors.axis }} />
                <YAxis stroke={chartColors.axis} reversed domain={[1, 'auto']} tickCount={10} />
                <RechartsTooltip
                  cursor={false}
                  wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-surface border border-border rounded-card p-3 shadow-lg">
                          <p className="text-foreground font-semibold">Spieltag {label}</p>
                          <p className="text-primary">Position: {payload[0].value}.</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line type="monotone" dataKey="position" stroke={chartColors.accent} strokeWidth={2} dot={{ fill: chartColors.accent, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!isMobile && managerGroupsWithStats && managerGroupsWithStats.length > 0 && (
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Punkte-Entwicklung in Gruppe</h3>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="input-field control rounded-control px-4 py-2 focus:outline-none focus:border-accent cursor-pointer"
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
            <div className="bg-card p-4 rounded-card border border-border">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={groupLineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="round" stroke={chartColors.axis} />
                  <YAxis stroke={chartColors.axis} />
                  <RechartsTooltip content={<GroupCustomTooltip />} cursor={false} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                  {sortedGroupManagers.map((m, index) => (
                    <Line
                      key={m.managerId}
                      type="monotone"
                      dataKey={m.shortName || m.managerName}
                      stroke={m.isCurrentUser ? chartColors.accent : LINE_COLORS[index % LINE_COLORS.length]}
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
    <div>
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full">
          <TableHead>
            <tr>
              <ThSortable onClick={() => handleSort('nameKicker')}>
                Spieler<SortIcon column="nameKicker" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable onClick={() => handleSort('team')}>
                Team<SortIcon column="team" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable onClick={() => handleSort('position')}>
                Position<SortIcon column="position" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable align="right" onClick={() => handleSort('prize')}>
                Wert<SortIcon column="prize" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable align="right" onClick={() => handleSort('points')}>
                Punkte<SortIcon column="points" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
            </tr>
          </TableHead>
          <TableBody>
            {sortedPlayers.map((pp) => {
              const player = pp.player
              const currentTeam = player?.teams[player.teams.length - 1]
              const rulesText = pp.rules && pp.rules.length > 0 
                ? pp.rules.map(r => `${r.ruleLabel}${r.count > 1 ? ` (${r.count}x)` : ''}`).join(', ')
                : '-'
              return (
                <tr key={pp.playerId} className="hover:bg-card-hover border-b border-border">
                  <td className="px-2 py-2 md:px-3">
                    <RouterLink
                      to={`/players/${pp.playerId}`}
                      className="flex items-center link"
                    >
                      {pp.player?.pictureUrl && (
                        <img src={pp.player.pictureUrl} alt={pp.playerName} className="w-10 h-10 rounded-full object-cover mr-3" />
                      )}
                      <div className="font-medium text-link">{pp.playerName}</div>
                    </RouterLink>
                  </td>
                  <td className="px-2 py-2 md:px-3">
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
                  <td className="px-2 py-2 md:px-3">
                    {player && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-badge ${positionColors[player.position]}`}>
                        {positionLabels[player.position]}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 md:px-3 text-right font-medium text-primary">
                    {player ? `${(player.prize / 1000000).toFixed(1)} Mio.` : '-'}
                  </td>
                  <td className="px-2 py-2 md:px-3 text-right">
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
          </TableBody>
        </table>
      </div>

      <div className="h-10" />
    </div>
  )
}
