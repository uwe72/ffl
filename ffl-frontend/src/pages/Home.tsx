import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useCurrentManager, useManagersBySeason, useManagerCurrentPlayers } from '../hooks/useManagers'
import { useCurrentSeason, useBestTeam } from '../hooks/useSeasons'
import { usePlayersBySeason } from '../hooks/usePlayers'
import { useAuth } from '../context/AuthContext'
import CardContainer from '../components/CardContainer'
import SortIcon from '../components/SortIcon'
import { TableHead, ThSortable, TableBody, TableRow, Td } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'
import { formatCurrency, formatMillions, formatMillionsShort, formatPoints } from '../utils/format'
import { positionLabels, positionBadgeVariant, positionBarColor } from '../utils/positions'
import Badge from '../components/Badge'
import TopPlayerStack from '../components/TopPlayerStack'

import type { PlayerPoint } from '../types'

type ManagerSortKey = 'positionTotal' | 'positionChange' | 'shortName' | 'pointsTotal' | 'pointsLastRound' | 'name' | 'teamValue'
type PlayerSortKey = 'positionTotal' | 'positionChange' | 'nameKicker' | 'points' | 'pointsLastRound' | 'managerCount' | 'prize' | 'position' | 'team'

function PlayerCardDashboard({ player }: { player: PlayerPoint }) {
  return (
    <div className="card relative overflow-hidden p-4 pl-5 bg-surface border border-border rounded-card">
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${positionBarColor[player.position ?? 'GOALKEEPER']}`} />
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
                <Badge variant={positionBadgeVariant[player.position]}>
                  {positionLabels[player.position]}
                </Badge>
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
            <span className="font-medium text-foreground">{formatPoints(player.pointsTotal)}</span>
          </div>
          <div>
            <span className="text-subtle">Spieltag: </span>
            <span className="font-medium text-foreground">{formatPoints(player.pointsLastRound)}</span>
          </div>
          <div>
            <span className="text-subtle">+-: </span>
            {player.positionChange != null && player.positionChange !== 0 ? (
              <span className={`font-medium ${player.positionChange > 0 ? 'text-success' : 'text-danger'}`}>
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
            <span className="font-medium text-foreground">{formatCurrency(player.prize)}</span>
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
  const { data: seasonPlayers } = usePlayersBySeason(season?.id ?? 0)
  const { data: bestTeam } = useBestTeam(season?.id ?? 0)

  const [showAllPlayers, setShowAllPlayers] = useState(false)
  const [managerFilter, setManagerFilter] = useState('')
  const [managerPage, setManagerPage] = useState(1)
  const [managerSortKey, setManagerSortKey] = useState<ManagerSortKey>('positionTotal')
  const [managerSortOrder, setManagerSortOrder] = useState<'asc' | 'desc'>('asc')
  const [playerSortKey, setPlayerSortKey] = useState<PlayerSortKey>('position')
  const [playerSortOrder, setPlayerSortOrder] = useState<'asc' | 'desc'>('asc')

  const MANAGERS_PER_PAGE = 9
  const initialManagerPageSet = useRef(false)

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
        case 'name':
          comparison = `${a.firstName || ''} ${a.lastName || ''}`.trim().localeCompare(`${b.firstName || ''} ${b.lastName || ''}`.trim())
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

  const managerTotalPages = Math.max(1, Math.ceil(filteredManagers.length / MANAGERS_PER_PAGE))

  useEffect(() => {
    if (!initialManagerPageSet.current && displayManager && filteredManagers.length > 0) {
      const idx = filteredManagers.findIndex(m => m.id === displayManager.id)
      if (idx >= 0) {
        setManagerPage(Math.floor(idx / MANAGERS_PER_PAGE) + 1)
        initialManagerPageSet.current = true
      }
    }
  }, [displayManager, filteredManagers])

  useEffect(() => {
    if (initialManagerPageSet.current) {
      setManagerPage(1)
    }
  }, [managerFilter, managerSortKey, managerSortOrder])

  useEffect(() => {
    if (managerPage > managerTotalPages) setManagerPage(managerTotalPages)
  }, [managerPage, managerTotalPages])

  const pagedManagers = useMemo(() => {
    const start = (managerPage - 1) * MANAGERS_PER_PAGE
    return filteredManagers.slice(start, start + MANAGERS_PER_PAGE)
  }, [filteredManagers, managerPage])

  const filteredPlayers = useMemo(() => {
    if (!currentPlayers) return []
    if (!showAllPlayers) return currentPlayers.filter(p => p.points > 0)
    return currentPlayers
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

  const topPlayers = useMemo(() => {
    if (!seasonPlayers) return []
    return [...seasonPlayers]
      .filter(p => (p.points ?? 0) > 0)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .slice(0, 5)
  }, [seasonPlayers])

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

  return (
    <div className="pb-6">
      {displayManager && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 flex flex-col gap-6">
          {currentPlayers && currentPlayers.length > 0 && (
            <CardContainer
              title="Deine Spieler"
              subtitle="Punkte und Marktwerte deiner Aufstellung"
              headerRight={
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={!showAllPlayers}
                    onChange={() => setShowAllPlayers(!showAllPlayers)}
                    className="accent-accent"
                  />
                  Nur Punktende
                </label>
              }
            >
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <TableHead>
                    <tr>
                      <ThSortable align="center" onClick={() => handlePlayerSort('positionTotal')}>
                        Pos<SortIcon column="positionTotal" activeKey={playerSortKey} order={playerSortOrder} />
                      </ThSortable>
                      <ThSortable align="center" onClick={() => handlePlayerSort('positionChange')}>
                        +-<SortIcon column="positionChange" activeKey={playerSortKey} order={playerSortOrder} />
                      </ThSortable>
                      <ThSortable align="left" onClick={() => handlePlayerSort('nameKicker')}>
                        Name<SortIcon column="nameKicker" activeKey={playerSortKey} order={playerSortOrder} />
                      </ThSortable>
                      <ThSortable numeric onClick={() => handlePlayerSort('points')}>
                        Pkt<SortIcon column="points" activeKey={playerSortKey} order={playerSortOrder} />
                      </ThSortable>
                      <ThSortable numeric onClick={() => handlePlayerSort('pointsLastRound')}>
                        Spieltag<SortIcon column="pointsLastRound" activeKey={playerSortKey} order={playerSortOrder} />
                      </ThSortable>
                      <ThSortable numeric onClick={() => handlePlayerSort('managerCount')}>
                        Manager<SortIcon column="managerCount" activeKey={playerSortKey} order={playerSortOrder} />
                      </ThSortable>
                      <ThSortable numeric onClick={() => handlePlayerSort('prize')}>
                        Preis €<SortIcon column="prize" activeKey={playerSortKey} order={playerSortOrder} />
                      </ThSortable>
                      <ThSortable align="left" onClick={() => handlePlayerSort('position')}>
                        Position<SortIcon column="position" activeKey={playerSortKey} order={playerSortOrder} />
                      </ThSortable>
                      <ThSortable align="left" onClick={() => handlePlayerSort('team')}>
                        Team<SortIcon column="team" activeKey={playerSortKey} order={playerSortOrder} />
                      </ThSortable>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {sortedPlayerPoints.map(pp => {
                      return (
                        <TableRow key={pp.playerId}>
                          <Td align="center" className="text-foreground">
                            {pp.positionTotal ? `${pp.positionTotal}.` : '-'}
                          </Td>
                          <Td align="center">
                            {pp.positionChange != null && pp.positionChange !== 0 ? (
                              <span className={`${pp.positionChange > 0 ? 'text-up' : 'text-down'}`}>
                                {pp.positionChange > 0 ? `↑${pp.positionChange}` : `↓${Math.abs(pp.positionChange)}`}
                              </span>
                            ) : (
                              <span className="text-subtle">-</span>
                            )}
                          </Td>
                          <Td>
                            <RouterLink
                              to={`/players/${pp.playerId}`}
                              className="flex items-center gap-3 min-w-0"
                            >
                              {pp.pictureUrl && (
                                <img src={pp.pictureUrl} alt={pp.playerName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                              )}
                              <span className="font-medium text-foreground hover:text-accent hover:underline whitespace-nowrap">{pp.playerName}</span>
                            </RouterLink>
                          </Td>
                          <Td numeric className="text-foreground font-medium">
                            {formatPoints(pp.pointsTotal)}
                          </Td>
                          <Td numeric className="text-muted">
                            {formatPoints(pp.pointsLastRound)}
                          </Td>
                          <Td numeric>
                            <RouterLink to={`/players/${pp.playerId}`}>
                              <span
                                className={`${pp.managerCount && pp.managerCount > 0 ? 'chip-accent' : ''} text-xs font-medium px-2 py-0.5 rounded-badge cursor-pointer hover:opacity-80`}
                              >
                                {pp.managerCount ?? 0}
                              </span>
                            </RouterLink>
                          </Td>
                          <Td numeric className="text-foreground">
                            {formatMillionsShort(pp.prize)}
                          </Td>
                          <Td>
                            {pp.position && (
                              <Badge variant={positionBadgeVariant[pp.position]}>
                                {positionLabels[pp.position]}
                              </Badge>
                            )}
                          </Td>
                          <Td className="text-muted">
                            {pp.teamName && (
                              <span className="flex items-center gap-2 min-w-0">
                                {pp.teamLogoUrl && (
                                  <img
                                    src={pp.teamLogoUrl}
                                    alt={pp.teamName}
                                    className="w-5 h-5 object-contain shrink-0"
                                  />
                                )}
                                <span className="text-foreground truncate">{pp.teamName}</span>
                              </span>
                            )}
                          </Td>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </table>
              </div>

              <div className="md:hidden grid gap-4 px-6 py-4">
                {sortedPlayerPoints.map(pp => (
                  <PlayerCardDashboard key={pp.playerId} player={pp} />
                ))}
              </div>
            </CardContainer>
          )}
          <CardContainer
            title="Rangliste der Manager"
            subtitle="Aktuelle Platzierung in der Liga"
            headerRight={
              <>
                <div className="relative min-w-[140px] max-w-[220px]">
                  <i className="sap-icon sap-icon-search absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-subtle" />
                  <input
                    type="text"
                    value={managerFilter}
                    onChange={e => setManagerFilter(e.target.value)}
                    placeholder="Manager suchen..."
                    className="input-field pl-8 pr-3 py-1.5 text-xs w-full"
                  />
                </div>

                {managerFilter && (
                  <button
                    onClick={() => setManagerFilter('')}
                    className="p-1 rounded-badge text-subtle hover:text-danger transition-colors"
                    title="Filter zurücksetzen"
                  >
                    <i className="sap-icon sap-icon-decline text-[14px]" />
                  </button>
                )}
              </>
            }
          >
            <div className="overflow-x-auto">
              <table className={`w-full ${isMobile ? 'min-w-[500px]' : 'table-fixed'}`}>
                {!isMobile && (
                  <colgroup>
                    <col className="w-[60px]" />
                    <col className="w-[60px]" />
                    <col className="max-w-[200px]" />
                    <col className="w-[70px]" />
                    <col className="w-[90px]" />
                    <col className="max-w-[220px]" />
                    <col className="w-[130px]" />
                  </colgroup>
                )}
                <TableHead>
                  <tr>
                    <ThSortable align="center" className={isMobile ? 'sticky left-0 w-[50px] bg-elevated z-10' : ''} onClick={() => handleManagerSort('positionTotal')}>
                      Pos<SortIcon column="positionTotal" activeKey={managerSortKey} order={managerSortOrder} />
                    </ThSortable>
                    <ThSortable align="center" className={isMobile ? 'sticky left-[50px] w-[50px] bg-elevated z-10' : ''} onClick={() => handleManagerSort('positionChange')}>
                      +-<SortIcon column="positionChange" activeKey={managerSortKey} order={managerSortOrder} />
                    </ThSortable>
                    <ThSortable align="left" className={`bg-elevated ${isMobile ? 'min-w-[120px]' : ''}`} onClick={() => handleManagerSort('shortName')}>
                      Manager<SortIcon column="shortName" activeKey={managerSortKey} order={managerSortOrder} />
                    </ThSortable>
                    <ThSortable align={isMobile ? 'center' : 'right'} numeric={!isMobile} className={isMobile ? 'sticky right-[70px] w-[60px] bg-elevated z-10' : ''} onClick={() => handleManagerSort('pointsTotal')}>
                      Pkt<SortIcon column="pointsTotal" activeKey={managerSortKey} order={managerSortOrder} />
                    </ThSortable>
                    <ThSortable align={isMobile ? 'center' : 'right'} numeric={!isMobile} className={isMobile ? 'sticky right-0 w-[70px] bg-elevated z-10' : ''} onClick={() => handleManagerSort('pointsLastRound')}>
                      Spieltag<SortIcon column="pointsLastRound" activeKey={managerSortKey} order={managerSortOrder} />
                    </ThSortable>
                    {!isMobile && (
                      <>
                        <ThSortable align="left" className="bg-elevated" onClick={() => handleManagerSort('name')}>
                          Name<SortIcon column="name" activeKey={managerSortKey} order={managerSortOrder} />
                        </ThSortable>
                        <ThSortable numeric className="bg-elevated" onClick={() => handleManagerSort('teamValue')}>
                          Teamwert<SortIcon column="teamValue" activeKey={managerSortKey} order={managerSortOrder} />
                        </ThSortable>
                      </>
                    )}
                  </tr>
                </TableHead>
                <TableBody>
                  {pagedManagers.map(m => {
                    const isCurrentManager = m.id === displayManager?.id
                    const stickyBg = isCurrentManager ? 'bg-accent-muted' : 'bg-surface'
                    return (
                      <TableRow
                        key={m.id}
                        active={isCurrentManager}
                      >
                        <Td align="center" className={`text-foreground ${isMobile ? `sticky left-0 w-[50px] ${stickyBg} z-10` : ''}`}>
                          {m.positionTotal ? `${m.positionTotal}.` : '-'}
                        </Td>
                        <Td align="center" className={isMobile ? `sticky left-[50px] w-[50px] ${stickyBg} z-10` : ''}>
                          {m.positionChange != null && m.positionChange !== 0 ? (
                            <span className={`${m.positionChange > 0 ? 'text-up' : 'text-down'}`}>
                              {m.positionChange > 0 ? `↑${m.positionChange}` : `↓${Math.abs(m.positionChange)}`}
                            </span>
                          ) : (
                            <span className="text-subtle">-</span>
                          )}
                        </Td>
                        <Td className={isMobile ? 'min-w-[120px]' : ''}>
                          {isMobile ? (
                            <span className="text-foreground">{m.shortName || '-'}</span>
                          ) : (
                            <RouterLink
                              to={`/managers/${m.id}`}
                              className="text-foreground hover:text-accent hover:underline truncate"
                            >
                              {m.shortName || '-'}
                            </RouterLink>
                          )}
                        </Td>
                        <Td align={isMobile ? 'center' : 'right'} numeric={!isMobile} className={`text-foreground ${isMobile ? `sticky right-[70px] w-[60px] ${stickyBg} z-10` : ''}`}>
                          {formatPoints(m.pointsTotal)}
                        </Td>
                        <Td align={isMobile ? 'center' : 'right'} numeric={!isMobile} className={`text-muted ${isMobile ? `sticky right-0 w-[70px] ${stickyBg} z-10` : ''}`}>
                          {formatPoints(m.pointsLastRound)}
                        </Td>
                        {!isMobile && (
                          <>
                            <Td className="text-muted truncate">
                              {`${m.firstName || ''} ${m.lastName || ''}`.trim() || '-'}
                            </Td>
                            <Td numeric className="text-foreground">
                              {formatMillions(m.teamValue)}
                            </Td>
                          </>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-border">
              <span className="text-[13px] text-muted">
                Seite {managerPage} von {managerTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setManagerPage(1)}
                  disabled={managerPage <= 1}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-badge text-[13px] font-medium border border-border text-foreground hover:bg-card-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Erste Seite"
                >
                  «
                </button>
                <button
                  onClick={() => setManagerPage(p => Math.max(1, p - 1))}
                  disabled={managerPage <= 1}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-badge text-[13px] font-medium border border-border text-foreground hover:bg-card-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Vorherige Seite"
                >
                  <i className="sap-icon sap-icon-navigation-left-arrow text-[14px]" />
                </button>
                <button
                  onClick={() => setManagerPage(p => Math.min(managerTotalPages, p + 1))}
                  disabled={managerPage >= managerTotalPages}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-badge text-[13px] font-medium border border-border text-foreground hover:bg-card-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Nächste Seite"
                >
                  <i className="sap-icon sap-icon-navigation-right-arrow text-[14px]" />
                </button>
                <button
                  onClick={() => setManagerPage(managerTotalPages)}
                  disabled={managerPage >= managerTotalPages}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-badge text-[13px] font-medium border border-border text-foreground hover:bg-card-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Letzte Seite"
                >
                  »
                </button>
              </div>
            </div>
          </CardContainer>
            </div>

            <div className="flex flex-col gap-6">
              <CardContainer title="Topspieler nach Punkten" subtitle="Die besten 5 Spieler der Saison">
                <div className="px-6 py-4">
                  {topPlayers.length === 0 ? (
                    <p className="text-sm text-muted">Noch keine Punkte in dieser Saison</p>
                  ) : (
                    <TopPlayerStack
                      players={topPlayers.map((pp, idx) => ({
                        rank: idx + 1,
                        name: pp.nameKicker,
                        points: pp.points ?? 0,
                        marketValue: pp.prize ?? 0,
                        position: positionLabels[pp.position ?? ''] ?? pp.position ?? '',
                        teamName: pp.teams?.[0]?.name ?? '',
                        pictureUrl: pp.pictureUrl,
                        teamLogoUrl: pp.teams?.[0]?.logoSUrl,
                      }))}
                    />
                  )}
                </div>
              </CardContainer>

              {bestTeam && bestTeam.players.length > 0 && (
                <CardContainer
                  title="Bestmögliche Aufstellung"
                  subtitle={`Dream Team · Formation ${bestTeam.formation.substring(2)}`}
                  headerRight={
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span className="tabular-nums font-medium text-foreground">{formatPoints(bestTeam.totalPoints)} Pkt</span>
                      <span className="tabular-nums">{formatMillions(bestTeam.totalCost)}</span>
                    </div>
                  }
                >
                  <div className="px-6 py-4">
                    <TopPlayerStack
                      players={bestTeam.players.map((bp, idx) => ({
                        rank: idx + 1,
                        name: bp.name,
                        points: bp.points,
                        marketValue: bp.prize,
                        position: `${positionLabels[bp.position] ?? bp.position}${bp.freeChoice ? ' · Free Choice' : ''}`,
                        teamName: bp.teamName ?? '',
                        pictureUrl: bp.pictureUrl,
                        teamLogoUrl: bp.teamLogoUrl,
                      }))}
                      interval={4000}
                    />
                  </div>
                </CardContainer>
              )}

              <CardContainer title="Deine Platzierung" subtitle={`${season?.currentMatchday ? `${season.currentMatchday}. Spieltag` : 'Kennzahlen'} von ${displayManager.shortName}`}>
                <div className="px-6 py-4 grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-xs text-muted">Platz</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{displayManager.positionTotal ? `${displayManager.positionTotal}.` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Punkte</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{formatPoints(displayManager.pointsTotal ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Spieltag</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{formatPoints(displayManager.pointsLastRound ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Teamwert</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{formatMillions(displayManager.teamValue ?? 0)}</p>
                  </div>
                </div>
              </CardContainer>

              <CardContainer title="Liga in Zahlen" subtitle="Umfang der aktuellen Saison">
                <div className="px-6 py-4 grid grid-cols-2 gap-x-6">
                  <div>
                    <p className="text-xs text-muted">Manager</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{formatPoints(managers?.length ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Spieler</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{formatPoints(seasonPlayers?.length ?? 0)}</p>
                  </div>
                </div>
              </CardContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
