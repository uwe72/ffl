import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Card, Chip } from '@heroui/react'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useCurrentManager, useManagersBySeason, useManagerCurrentPlayers } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useAuth } from '../context/AuthContext'

const positionLabels: Record<string, string> = {
  GOALKEEPER: 'Torwart',
  DEFENDER: 'Verteidiger',
  MIDFIELD: 'Mittelfeld',
  STRIKER: 'Stürmer'
}

const positionColors: Record<string, 'success' | 'warning' | 'accent' | 'danger'> = {
  GOALKEEPER: 'success',
  DEFENDER: 'warning',
  MIDFIELD: 'accent',
  STRIKER: 'danger'
}

type ManagerSortKey = 'positionTotal' | 'positionChange' | 'shortName' | 'pointsTotal' | 'pointsLastRound' | 'firstName' | 'lastName' | 'teamValue'
type PlayerSortKey = 'positionTotal' | 'positionChange' | 'nameKicker' | 'points' | 'pointsLastRound' | 'managerCount' | 'prize' | 'position' | 'team'

export default function Home() {
  const { isAuthenticated, user } = useAuth()
  const { data: season } = useCurrentSeason()
  const { data: currentManager } = useCurrentManager()
  const { data: managers } = useManagersBySeason(season?.id || 0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])
  
  const isAdmin = user?.role === 'ADMIN'
  const uwe72Manager = managers?.find(m => m.shortName === 'uwe72')
  const displayManager = isAdmin ? uwe72Manager : currentManager

  const { data: currentPlayers } = useManagerCurrentPlayers(displayManager?.id ?? 0)

  const [showAllPlayers, setShowAllPlayers] = useState(false)
  const [showAllManagers, setShowAllManagers] = useState(false)
  const [managerFilter, setManagerFilter] = useState('')
  const [managerSortKey, setManagerSortKey] = useState<ManagerSortKey>('positionTotal')
  const [managerSortOrder, setManagerSortOrder] = useState<'asc' | 'desc'>('asc')
const [playerSortKey, setPlayerSortKey] = useState<PlayerSortKey>('position')
const [playerSortOrder, setPlayerSortOrder] = useState<'asc' | 'desc'>('asc')

  const currentManagerRowRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    if (!showAllManagers && currentManagerRowRef.current) {
      currentManagerRowRef.current.scrollIntoView({ block: 'center' })
    }
  }, [managers, displayManager, showAllManagers])

  const sortedManagers = useMemo(() => {
    if (!managers) return []
    return [...managers].sort((a, b) => {
      let comparison = 0
      switch (managerSortKey) {
        case 'positionTotal':
          comparison = (a.positionTotal ?? 999) - (b.positionTotal ?? 999)
          break
        case 'positionChange':
          comparison = (a.positionChange ?? 0) - (b.positionChange ?? 0)
          break
        case 'shortName':
          comparison = (a.shortName || '').localeCompare(b.shortName || '')
          break
        case 'pointsTotal':
          comparison = (b.pointsTotal ?? 0) - (a.pointsTotal ?? 0)
          break
        case 'pointsLastRound':
          comparison = (b.pointsLastRound ?? 0) - (a.pointsLastRound ?? 0)
          break
        case 'firstName':
          comparison = (a.firstName || '').localeCompare(b.firstName || '')
          break
        case 'lastName':
          comparison = (a.lastName || '').localeCompare(b.lastName || '')
          break
        case 'teamValue':
          comparison = (a.teamValue ?? 0) - (b.teamValue ?? 0)
          break
      }
      return managerSortOrder === 'asc' ? comparison : -comparison
    })
  }, [managers, managerSortKey, managerSortOrder])

  const filteredManagers = useMemo(() => {
    if (!managerFilter.trim()) return sortedManagers
    const filter = managerFilter.toLowerCase()
    return sortedManagers.filter(m => 
      m.shortName?.toLowerCase().includes(filter) ||
      m.firstName?.toLowerCase().includes(filter) ||
      m.lastName?.toLowerCase().includes(filter)
    )
  }, [sortedManagers, managerFilter])

  const filteredPlayers = useMemo(() => {
    if (!currentPlayers) return []
    if (showAllPlayers) return currentPlayers
    return currentPlayers.filter(p => p.points > 0)
  }, [currentPlayers, showAllPlayers])

  const sortedPlayerPoints = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      let comparison = 0
      switch (playerSortKey) {
        case 'positionTotal':
          comparison = (a.positionTotal ?? 999) - (b.positionTotal ?? 999)
          break
        case 'positionChange':
          comparison = (a.positionChange ?? 0) - (b.positionChange ?? 0)
          break
        case 'nameKicker':
          comparison = a.playerName.localeCompare(b.playerName)
          break
        case 'points':
          comparison = (b.pointsTotal ?? 0) - (a.pointsTotal ?? 0)
          break
        case 'pointsLastRound':
          comparison = (a.pointsLastRound ?? 0) - (b.pointsLastRound ?? 0)
          break
        case 'managerCount':
          comparison = (a.managerCount ?? 0) - (b.managerCount ?? 0)
          break
        case 'prize':
          comparison = (a.prize ?? 0) - (b.prize ?? 0)
          break
        case 'position':
          const posOrder: Record<string, number> = { GOALKEEPER: 0, DEFENDER: 1, MIDFIELD: 2, STRIKER: 3 }
          comparison = (posOrder[a.position || ''] ?? 999) - (posOrder[b.position || ''] ?? 999)
          break
        case 'team':
          comparison = (a.teamName || '').localeCompare(b.teamName || '')
          break
      }
      return playerSortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredPlayers, playerSortKey, playerSortOrder])

  const handleManagerSort = (key: ManagerSortKey) => {
    if (managerSortKey === key) {
      setManagerSortOrder(managerSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setManagerSortKey(key)
      setManagerSortOrder('asc')
    }
  }

  const handlePlayerSort = (key: PlayerSortKey) => {
    if (playerSortKey === key) {
      setPlayerSortOrder(playerSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setPlayerSortKey(key)
      setPlayerSortOrder('desc')
    }
  }

  const ManagerSortIcon = ({ column }: { column: ManagerSortKey }) => {
    if (managerSortKey !== column) return <span className="text-[#6b7280] ml-1">⇅</span>
    return <span className="text-[#c9a66b] ml-1">{managerSortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const PlayerSortIcon = ({ column }: { column: PlayerSortKey }) => {
    if (playerSortKey !== column) return <span className="text-[#6b7280] ml-1">⇅</span>
    return <span className="text-[#c9a66b] ml-1">{playerSortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="py-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#f5f5f5] mb-2">Willkommen {displayManager?.firstName || 'bei FFL'}!</h1>
        {season && (
          <p className="text-[#a0aec0]">
            Saison {season.name} · {season.seasonState === 'RUNNING_HINRUNDE' ? 'Hinrunde' : season.seasonState === 'RUNNING_RUECKRUNDE' ? 'Rückrunde' : 'Vor Saison'}
            {season.currentMatchday && ` · Spieltag ${season.currentMatchday}`}
          </p>
        )}
      </div>

      {displayManager && (
        <>
          <Card className="p-6 bg-[#1a2028] border border-[#2d3748] mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-lg font-semibold text-[#f5f5f5]">
                {displayManager?.positionTotal ? `${displayManager.positionTotal}. Platz` : 'Platzierung'} am {season?.currentMatchday ? `${season.currentMatchday}. Spieltag` : 'Spieltag'}
              </h3>
              <div className="flex-1" />
              <input
                type="text"
                placeholder="Manager suchen..."
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="w-48 px-3 py-2 rounded-lg bg-[#242d38] border border-[#2d3748] text-[#f5f5f5] placeholder-[#6b7280] focus:outline-none focus:border-[#c9a66b]"
              />
              <div className="flex gap-2">
                <label
                  className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    !showAllManagers ? 'bg-[#c9a66b] text-[#0f1419]' : 'bg-[#242d38] text-[#a0aec0] hover:bg-[#3d4a5c]'
                  }`}
                  onClick={() => setShowAllManagers(false)}
                >
                  Ausschnitt
                </label>
                <label
                  className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    showAllManagers ? 'bg-[#c9a66b] text-[#0f1419]' : 'bg-[#242d38] text-[#a0aec0] hover:bg-[#3d4a5c]'
                  }`}
                  onClick={() => setShowAllManagers(true)}
                >
                  Alle
                </label>
              </div>
            </div>
            <div className={`overflow-x-auto rounded-lg border border-[#2d3748] ${!showAllManagers ? 'max-h-[264px] overflow-y-auto' : ''}`}>
              <table className="w-full">
                <thead className="bg-[#242d38]">
                  <tr>
                    <th className="px-3 py-2 text-center text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handleManagerSort('positionTotal')}>
                      Pos<ManagerSortIcon column="positionTotal" />
                    </th>
                    <th className="px-3 py-2 text-center text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handleManagerSort('positionChange')}>
                      +-<ManagerSortIcon column="positionChange" />
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handleManagerSort('shortName')}>
                      Manager<ManagerSortIcon column="shortName" />
                    </th>
                    <th className="px-3 py-2 text-center text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handleManagerSort('pointsTotal')}>
                      Pkt<ManagerSortIcon column="pointsTotal" />
                    </th>
                    <th className="px-3 py-2 text-center text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handleManagerSort('pointsLastRound')}>
                      Spieltag<ManagerSortIcon column="pointsLastRound" />
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handleManagerSort('firstName')}>
                      Vorname<ManagerSortIcon column="firstName" />
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handleManagerSort('lastName')}>
                      Nachname<ManagerSortIcon column="lastName" />
                    </th>
                    <th className="px-3 py-2 text-right text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handleManagerSort('teamValue')}>
                      Teamwert<ManagerSortIcon column="teamValue" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#1a2028]">
                  {filteredManagers.map(m => (
                    <tr 
                      key={m.id} 
                      ref={m.id === displayManager?.id ? currentManagerRowRef : null}
                      className={`border-b border-[#2d3748] hover:bg-[#242d38] ${m.id === displayManager?.id ? 'border-l-4 border-l-[#c9a66b] bg-[#2d3748]' : ''}`}
                    >
                      <td className="px-3 py-2 text-center font-medium text-[#f5f5f5]">
                        {m.positionTotal ? `${m.positionTotal}.` : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {m.positionChange != null && m.positionChange !== 0 ? (
                          <span className={`font-medium ${m.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {m.positionChange > 0 ? `↑${m.positionChange}` : `↓${Math.abs(m.positionChange)}`}
                          </span>
                        ) : (
                          <span className="text-[#6b7280]">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <RouterLink 
                          to={`/managers/${m.id}`} 
                          className="hover:text-[#c9a66b] link font-medium text-[#c9a66b]"
                        >
                          {m.shortName || '-'}
                        </RouterLink>
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-[#f5f5f5]">
                        {m.pointsTotal ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-center text-[#a0aec0]">
                        {m.pointsLastRound ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-[#a0aec0]">
                        {m.firstName || '-'}
                      </td>
                      <td className="px-3 py-2 text-[#a0aec0]">
                        {m.lastName || '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-[#f5f5f5]">
                        {m.teamValue ? (m.teamValue / 1000000).toFixed(2) : '0.00'} Mio.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {currentPlayers && currentPlayers.length > 0 && (
            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#f5f5f5]">
                  {(() => {
                    const totalPoints = currentPlayers?.reduce((sum, p) => sum + (p.pointsLastRound ?? 0), 0) ?? 0
                    const matchday = season?.currentMatchday ?? 0
                    return `${totalPoints} Punkte am ${matchday}. Spieltag`
                  })()}
                </h3>
                <div className="flex gap-2">
                  <label
                    className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
                      !showAllPlayers ? 'bg-[#c9a66b] text-[#0f1419]' : 'bg-[#242d38] text-[#a0aec0] hover:bg-[#3d4a5c]'
                    }`}
                    onClick={() => setShowAllPlayers(false)}
                  >
                    Nur Punktende
                  </label>
                  <label
                    className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
                      showAllPlayers ? 'bg-[#c9a66b] text-[#0f1419]' : 'bg-[#242d38] text-[#a0aec0] hover:bg-[#3d4a5c]'
                    }`}
                    onClick={() => setShowAllPlayers(true)}
                  >
                    Alle
                  </label>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[#2d3748]">
                <table className="w-full">
<thead className="bg-[#242d38] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-center text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handlePlayerSort('positionTotal')}>
                        Pos<PlayerSortIcon column="positionTotal" />
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handlePlayerSort('positionChange')}>
                        +-<PlayerSortIcon column="positionChange" />
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handlePlayerSort('nameKicker')}>
                        Name<PlayerSortIcon column="nameKicker" />
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handlePlayerSort('points')}>
                        Pkt<PlayerSortIcon column="points" />
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handlePlayerSort('pointsLastRound')}>
                        Spieltag<PlayerSortIcon column="pointsLastRound" />
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handlePlayerSort('managerCount')}>
                        Manager<PlayerSortIcon column="managerCount" />
                      </th>
                      <th className="px-3 py-2 text-right text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handlePlayerSort('prize')}>
                        Preis<PlayerSortIcon column="prize" />
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handlePlayerSort('position')}>
                        Position<PlayerSortIcon column="position" />
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]" onClick={() => handlePlayerSort('team')}>
                        Team<PlayerSortIcon column="team" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#1a2028]">
                    {sortedPlayerPoints.map(pp => {
                      return (
                        <tr 
                          key={pp.playerId} 
                          className={`border-b border-[#2d3748] hover:bg-[#242d38] ${
                            showAllPlayers && (pp.pointsLastRound ?? 0) > 0 
                              ? 'border-l-4 border-l-[#c9a66b]' 
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-center font-medium text-[#f5f5f5]">
                            {pp.positionTotal ? `${pp.positionTotal}.` : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {pp.positionChange != null && pp.positionChange !== 0 ? (
                              <span className={`font-medium ${pp.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {pp.positionChange > 0 ? `↑${pp.positionChange}` : `↓${Math.abs(pp.positionChange)}`}
                              </span>
                            ) : (
                              <span className="text-[#6b7280]">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <RouterLink
                              to={`/players/${pp.playerId}`}
                              className="hover:text-[#c9a66b] link text-[#c9a66b] font-medium"
                            >
                              {pp.playerName}
                            </RouterLink>
                          </td>
                          <td className="px-3 py-2 text-center font-medium text-[#f5f5f5]">
                            {pp.pointsTotal ?? '-'}
                          </td>
                          <td className="px-3 py-2 text-center text-[#a0aec0]">
                            {pp.pointsLastRound ?? '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <RouterLink to={`/players/${pp.playerId}`}>
                              <Chip 
                                size="sm" 
                                variant="soft" 
                                color={pp.managerCount && pp.managerCount > 0 ? 'accent' : 'default'}
                                className="cursor-pointer hover:opacity-80"
                              >
                                {pp.managerCount ?? 0}
                              </Chip>
                            </RouterLink>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-[#f5f5f5]">
                            {pp.prize ? pp.prize.toLocaleString() : '-'} €
                          </td>
                          <td className="px-3 py-2">
                            {pp.position && (
                              <Chip size="sm" color={positionColors[pp.position]} variant="soft">
                                {positionLabels[pp.position]}
                              </Chip>
                            )}
                          </td>
                          <td className="px-3 py-2 text-[#a0aec0]">
                            {pp.teamName && (
                              <span className="flex items-center gap-2">
                                {pp.teamLogoUrl && (
                                  <img 
                                    src={pp.teamLogoUrl} 
                                    alt={pp.teamName} 
                                    className="w-5 h-5 object-contain flex-shrink-0"
                                  />
                                )}
                                <span className="font-semibold text-[#f5f5f5]">{pp.teamName}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
