import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import { LayoutDashboard } from 'lucide-react'
import { useCurrentManager, useManagersBySeason, useManagerCurrentPlayers } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useAuth } from '../context/AuthContext'
import type { PlayerPoint } from '../types'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  return isMobile
}

const positionLabels: Record<string, string> = {
  GOALKEEPER: 'Torwart',
  DEFENDER: 'Verteidiger',
  MIDFIELD: 'Mittelfeld',
  STRIKER: 'Stürmer'
}

const positionColors: Record<string, string> = {
  GOALKEEPER: 'chip-success',
  DEFENDER: 'chip-warning',
  MIDFIELD: 'chip-accent',
  STRIKER: 'chip-danger'
}

type ManagerSortKey = 'positionTotal' | 'positionChange' | 'shortName' | 'pointsTotal' | 'pointsLastRound' | 'firstName' | 'lastName' | 'teamValue'
type PlayerSortKey = 'positionTotal' | 'positionChange' | 'nameKicker' | 'points' | 'pointsLastRound' | 'managerCount' | 'prize' | 'position' | 'team'

function formatPrice(price: number | undefined): string {
  if (!price) return '- €'
  if (price >= 1_000_000) {
    const millions = price / 1_000_000
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M €`
  }
  return `${Math.round(price / 1_000)}K €`
}

function PlayerCardDashboard({ player }: { player: PlayerPoint }) {
  return (
    <div className="card p-4 bg-surface border border-border">
      <div className="flex gap-4 items-center">
        {player.pictureUrl ? (
          <img 
            src={player.pictureUrl} 
            alt={player.playerName}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-elevated flex items-center justify-center flex-shrink-0">
            <span className="text-xl text-subtle">👤</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate">{player.playerName}</div>
            {player.position && (
              <div className="mt-1">
                <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded`}>
                  {positionLabels[player.position]}
                </span>
              </div>
            )}
          </div>
          {player.teamLogoUrl && (
            <img 
              src={player.teamLogoUrl} 
              alt={player.teamName}
              className="w-14 h-14 object-contain flex-shrink-0"
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
          <div>
            <span className="text-subtle">Pos: </span>
            <span className="font-medium text-foreground">
              {player.positionTotal ? `${player.positionTotal}.` : '-'}
            </span>
          </div>
          <div>
            <span className="text-subtle">Pkt: </span>
            <span className="font-medium text-foreground">{player.pointsTotal ?? '-'}</span>
          </div>
          <div>
            <span className="text-subtle">Spieltag: </span>
            <span className="font-medium text-foreground">{player.pointsLastRound ?? '-'}</span>
          </div>
          <div>
            <span className="text-subtle">+-: </span>
            {player.positionChange != null && player.positionChange !== 0 ? (
              <span className={`font-medium ${player.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {player.positionChange > 0 ? `↑${player.positionChange}` : `↓${Math.abs(player.positionChange)}`}
              </span>
            ) : (
              <span className="text-subtle">-</span>
            )}
          </div>
          <div>
            <span className="text-subtle">Manager: </span>
            <span className="font-medium text-foreground">{player.managerCount ?? 0}</span>
          </div>
          <div>
            <span className="text-subtle">Preis: </span>
            <span className="font-medium text-foreground">{formatPrice(player.prize)}</span>
          </div>
        </div>
      </div>
    )
  }

export default function Home() {
  const isMobile = useIsMobile()
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
    if (managerSortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{managerSortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const PlayerSortIcon = ({ column }: { column: PlayerSortKey }) => {
    if (playerSortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{playerSortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="pb-6">
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard size={28} className="text-accent" />
        <h1 className="text-2xl font-bold text-accent">Dashboard</h1>
      </div>

      {displayManager && (
        <>
          {currentPlayers && currentPlayers.length > 0 && (
            <div className="card p-4 md:p-6 bg-surface border border-border mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {(() => {
                      const totalPoints = currentPlayers?.reduce((sum, p) => sum + (p.pointsLastRound ?? 0), 0) ?? 0
                      return `${totalPoints} Punkte`
                    })()}
                  </h3>
                  <p className="text-sm text-muted">
                    {season?.currentMatchday ? `${season.currentMatchday}. Spieltag` : 'Spieltag'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <label
                    className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
                      !showAllPlayers ? 'bg-primary text-background' : 'bg-elevated text-muted hover:bg-border-hover'
                    }`}
                    onClick={() => setShowAllPlayers(false)}
                  >
                    Nur Punktende
                  </label>
                  <label
                    className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
                      showAllPlayers ? 'bg-primary text-background' : 'bg-elevated text-muted hover:bg-border-hover'
                    }`}
                    onClick={() => setShowAllPlayers(true)}
                  >
                    Alle
                  </label>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border hidden md:block">
                <table className="w-full">
<thead className="bg-elevated sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-center text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handlePlayerSort('positionTotal')}>
                        Pos<PlayerSortIcon column="positionTotal" />
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handlePlayerSort('positionChange')}>
                        +-<PlayerSortIcon column="positionChange" />
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handlePlayerSort('nameKicker')}>
                        Name<PlayerSortIcon column="nameKicker" />
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handlePlayerSort('points')}>
                        Pkt<PlayerSortIcon column="points" />
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handlePlayerSort('pointsLastRound')}>
                        Spieltag<PlayerSortIcon column="pointsLastRound" />
                      </th>
                      {!isMobile && (
                        <>
                          <th className="px-3 py-2 text-center text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handlePlayerSort('managerCount')}>
                            Manager<PlayerSortIcon column="managerCount" />
                          </th>
                          <th className="px-3 py-2 text-right text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handlePlayerSort('prize')}>
                            Preis<PlayerSortIcon column="prize" />
                          </th>
                        </>
                      )}
                      <th className="px-3 py-2 text-left text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handlePlayerSort('position')}>
                        Position<PlayerSortIcon column="position" />
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handlePlayerSort('team')}>
                        Team<PlayerSortIcon column="team" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface">
                    {sortedPlayerPoints.map(pp => {
                      return (
                        <tr 
                          key={pp.playerId} 
                          className={`border-b border-border hover:bg-elevated ${
                            showAllPlayers && (pp.pointsLastRound ?? 0) > 0 
                              ? 'border-l-4 border-l-accent' 
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-center font-medium text-foreground">
                            {pp.positionTotal ? `${pp.positionTotal}.` : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {pp.positionChange != null && pp.positionChange !== 0 ? (
                              <span className={`font-medium ${pp.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {pp.positionChange > 0 ? `↑${pp.positionChange}` : `↓${Math.abs(pp.positionChange)}`}
                              </span>
                            ) : (
                              <span className="text-subtle">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isMobile ? (
                              <span className="text-accent font-medium">{pp.playerName}</span>
                            ) : (
                              <RouterLink
                                to={`/players/${pp.playerId}`}
                                className="hover:text-accent link text-accent font-medium"
                              >
                                {pp.playerName}
                              </RouterLink>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-medium text-foreground">
                            {pp.pointsTotal ?? '-'}
                          </td>
                          <td className="px-3 py-2 text-center text-muted">
                            {pp.pointsLastRound ?? '-'}
                          </td>
                          {!isMobile && (
                            <>
                              <td className="px-3 py-2 text-center">
                                <RouterLink to={`/players/${pp.playerId}`}>
                                  <span 
                                    className={`${pp.managerCount && pp.managerCount > 0 ? 'chip-accent' : ''} text-xs font-medium px-2 py-0.5 rounded cursor-pointer hover:opacity-80`}
                                  >
                                    {pp.managerCount ?? 0}
                                  </span>
                                </RouterLink>
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-foreground">
                                {pp.prize ? pp.prize.toLocaleString() : '-'} €
                              </td>
                            </>
                          )}
                          <td className="px-3 py-2">
                            {pp.position && (
                              <span className={`${positionColors[pp.position]} text-xs font-medium px-2 py-0.5 rounded`}>
                                {positionLabels[pp.position]}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {pp.teamName && (
                              <span className="flex items-center gap-2">
                                {pp.teamLogoUrl && (
                                  <img 
                                    src={pp.teamLogoUrl} 
                                    alt={pp.teamName} 
                                    className="w-5 h-5 object-contain flex-shrink-0"
                                  />
                                )}
                                <span className="font-semibold text-foreground">{pp.teamName}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden grid gap-4 mt-4">
                {sortedPlayerPoints.map(pp => (
                  <PlayerCardDashboard key={pp.playerId} player={pp} />
                ))}
              </div>
            </div>
          )}

          <div className="card p-4 md:p-6 bg-surface border border-border">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {displayManager?.positionTotal ? `${displayManager.positionTotal}. Platz` : 'Platzierung'}
                </h3>
                <p className="text-sm text-muted">
                  {season?.currentMatchday ? `${season.currentMatchday}. Spieltag` : 'Spieltag'}
                </p>
              </div>
              <div className="flex-1" />
              <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                <input
                  type="text"
                  placeholder="Manager suchen..."
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="w-full md:w-48 px-3 py-2 rounded-lg bg-elevated border border-border text-foreground placeholder-[#8899aa] focus:outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                <label
                  className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    !showAllManagers ? 'bg-primary text-background' : 'bg-elevated text-muted hover:bg-border-hover'
                  }`}
                  onClick={() => setShowAllManagers(false)}
                >
                  Ausschnitt
                </label>
                <label
                  className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    showAllManagers ? 'bg-primary text-background' : 'bg-elevated text-muted hover:bg-border-hover'
                  }`}
                  onClick={() => setShowAllManagers(true)}
                >
                  Alle
                </label>
                </div>
              </div>
            </div>
            <div className={`overflow-x-auto rounded-lg border border-border ${!showAllManagers ? 'max-h-[264px] overflow-y-auto' : ''}`}>
              <table className={`w-full ${isMobile ? 'min-w-[500px]' : ''}`}>
                <thead className="bg-elevated">
                  <tr>
                    <th className={`px-3 py-2 text-center text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border ${isMobile ? 'sticky left-0 w-[50px] bg-elevated z-10' : ''}`} onClick={() => handleManagerSort('positionTotal')}>
                      Pos<ManagerSortIcon column="positionTotal" />
                    </th>
                    <th className={`px-3 py-2 text-center text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border ${isMobile ? 'sticky left-[50px] w-[50px] bg-elevated z-10' : ''}`} onClick={() => handleManagerSort('positionChange')}>
                      +-<ManagerSortIcon column="positionChange" />
                    </th>
                    <th className={`px-3 py-2 text-left text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border ${isMobile ? 'min-w-[120px]' : ''}`} onClick={() => handleManagerSort('shortName')}>
                      Manager<ManagerSortIcon column="shortName" />
                    </th>
                    <th className={`px-3 py-2 text-center text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border ${isMobile ? 'sticky right-[70px] w-[60px] bg-elevated z-10' : ''}`} onClick={() => handleManagerSort('pointsTotal')}>
                      Pkt<ManagerSortIcon column="pointsTotal" />
                    </th>
                    <th className={`px-3 py-2 text-center text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border ${isMobile ? 'sticky right-0 w-[70px] bg-elevated z-10' : ''}`} onClick={() => handleManagerSort('pointsLastRound')}>
                      Spieltag<ManagerSortIcon column="pointsLastRound" />
                    </th>
                    {!isMobile && (
                      <>
                        <th className="px-3 py-2 text-left text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleManagerSort('firstName')}>
                          Vorname<ManagerSortIcon column="firstName" />
                        </th>
                        <th className="px-3 py-2 text-left text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleManagerSort('lastName')}>
                          Nachname<ManagerSortIcon column="lastName" />
                        </th>
                        <th className="px-3 py-2 text-right text-xs text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleManagerSort('teamValue')}>
                          Teamwert<ManagerSortIcon column="teamValue" />
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {filteredManagers.map(m => {
                    const isCurrentManager = m.id === displayManager?.id
                    const stickyBg = isCurrentManager ? 'bg-default' : 'bg-surface'
                    return (
                      <tr 
                        key={m.id} 
                        ref={m.id === displayManager?.id ? currentManagerRowRef : null}
                        className={`border-b border-border hover:bg-elevated ${isCurrentManager ? 'border-l-4 border-l-accent bg-default' : ''}`}
                      >
                        <td className={`px-3 py-2 text-center font-medium text-foreground ${isMobile ? `sticky left-0 w-[50px] ${stickyBg} z-10` : ''}`}>
                          {m.positionTotal ? `${m.positionTotal}.` : '-'}
                        </td>
                        <td className={`px-3 py-2 text-center ${isMobile ? `sticky left-[50px] w-[50px] ${stickyBg} z-10` : ''}`}>
                          {m.positionChange != null && m.positionChange !== 0 ? (
                            <span className={`font-medium ${m.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {m.positionChange > 0 ? `↑${m.positionChange}` : `↓${Math.abs(m.positionChange)}`}
                            </span>
                          ) : (
                            <span className="text-subtle">-</span>
                          )}
                        </td>
                        <td className={`px-3 py-2 ${isMobile ? 'min-w-[120px]' : ''}`}>
                          {isMobile ? (
                            <span className="font-medium text-foreground">{m.shortName || '-'}</span>
                          ) : (
                            <RouterLink 
                              to={`/managers/${m.id}`} 
                              className="hover:text-accent link font-medium text-accent"
                            >
                              {m.shortName || '-'}
                            </RouterLink>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-center font-medium text-foreground ${isMobile ? `sticky right-[70px] w-[60px] ${stickyBg} z-10` : ''}`}>
                          {m.pointsTotal ?? '-'}
                        </td>
                        <td className={`px-3 py-2 text-center text-muted ${isMobile ? `sticky right-0 w-[70px] ${stickyBg} z-10` : ''}`}>
                          {m.pointsLastRound ?? '-'}
                        </td>
                        {!isMobile && (
                          <>
                            <td className="px-3 py-2 text-muted">
                              {m.firstName || '-'}
                            </td>
                            <td className="px-3 py-2 text-muted">
                              {m.lastName || '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-foreground">
                              {m.teamValue ? (m.teamValue / 1000000).toFixed(2) : '0.00'} Mio.
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
