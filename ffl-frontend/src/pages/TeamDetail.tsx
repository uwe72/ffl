import { useState, useMemo } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { useTeam, useTeamPlayers } from '../hooks/useTeams'
import PageHeader from '../components/PageHeader'
import CardContainer from '../components/CardContainer'
import SortIcon from '../components/SortIcon'
import { TableContent, TableHead, ThSortable, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'
import type { Player } from '../types'

export const positionLabels: Record<string, string> = {
  GOALKEEPER: 'Torwart',
  DEFENDER: 'Verteidiger',
  MIDFIELD: 'Mittelfeld',
  STRIKER: 'Stürmer'
}

export const positionColors: Record<string, string> = {
  GOALKEEPER: 'chip-success',
  DEFENDER: 'chip-warning',
  MIDFIELD: 'chip-accent',
  STRIKER: 'chip-danger'
}

const positionSapIcon: Record<string, string> = {
  GOALKEEPER: 'sap-icon-shield',
  DEFENDER: 'sap-icon-shield',
  MIDFIELD: 'sap-icon-circle-task',
  STRIKER: 'sap-icon-target',
}

const positionChipActiveColors: Record<string, string> = {
  GOALKEEPER: 'bg-success/15 text-success border-success/40',
  DEFENDER: 'bg-warning/15 text-warning border-warning/40',
  MIDFIELD: 'bg-accent/15 text-accent border-accent/40',
  STRIKER: 'bg-danger/15 text-danger border-danger/40',
}

const chipInactive = 'bg-elevated text-muted border-border'

type SortKey = 'positionTotal' | 'positionChange' | 'nameKicker' | 'points' | 'pointsLastRound' | 'managerCount' | 'prize' | 'position'
type SortOrder = 'asc' | 'desc'

function FilterBar({ selectedPositions, setSelectedPositions, searchTerm, setSearchTerm, hasFilter }: {
  selectedPositions: Set<string>
  setSelectedPositions: (s: Set<string>) => void
  searchTerm: string
  setSearchTerm: (s: string) => void
  hasFilter: boolean
}) {
  const togglePosition = (pos: string) => {
    const next = new Set(selectedPositions)
    if (next.has(pos)) next.delete(pos)
    else next.add(pos)
    setSelectedPositions(next)
  }

  const clearFilter = () => {
    setSelectedPositions(new Set())
    setSearchTerm('')
  }

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-elevated/50 border-b border-border flex-wrap">
      <div className="relative flex-1 min-w-[180px] max-w-[280px]">
        <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Spieler suchen..."
          className="input-field pl-8 pr-3 py-1.5 text-xs w-full"
        />
      </div>

      <div className="h-5 w-px bg-border" />

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as const).map(pos => {
          const active = selectedPositions.has(pos)
          return (
            <button
              key={pos}
              onClick={() => togglePosition(pos)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? positionChipActiveColors[pos] : chipInactive}`}
            >
              <i className={`sap-icon ${positionSapIcon[pos]} text-[12px]`} />
              {positionLabels[pos]}
            </button>
          )
        })}
      </div>

      {hasFilter && (
        <button
          onClick={clearFilter}
          className="p-1 rounded text-subtle hover:text-danger transition-colors"
          title="Filter zurücksetzen"
        >
          <i className="sap-icon sap-icon-decline text-[14px]" />
        </button>
      )}
    </div>
  )
}

function formatPrice(price: number | undefined): string {
  if (!price) return '- €'
  if (price >= 1_000_000) {
    const millions = price / 1_000_000
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M €`
  }
  return `${Math.round(price / 1_000)}K €`
}

function PlayerCard({ player }: { player: Player }) {
  return (
    <div className="card p-4 bg-surface border border-border">
      <div className="flex gap-4 items-center">
        {player.pictureUrl ? (
          <img 
            src={player.pictureUrl} 
            alt={player.nameKicker}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-elevated flex items-center justify-center flex-shrink-0">
            <span className="text-xl text-subtle">👤</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate">{player.nameKicker}</div>
          <div className="mt-1">
            <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded`}>
              {positionLabels[player.position]}
            </span>
          </div>
        </div>
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
          <span className="font-medium text-foreground">{player.points ?? '-'}</span>
        </div>
        <div>
          <span className="text-subtle">Spieltag: </span>
          <span className="font-medium text-foreground">{player.pointsLastRound ?? '-'}</span>
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
          <span className="font-medium text-foreground">{formatPrice(player.prize)}</span>
        </div>
      </div>
    </div>
  )
}

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>()
  const isMobile = useIsMobile()
  const { data: team } = useTeam(Number(id))
  const { data: players, isLoading, error } = useTeamPlayers(Number(id))
  
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
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

  const hasActiveFilter = selectedPositions.size > 0 || searchTerm !== ''

  const filteredPlayers = useMemo(() => {
    if (!players) return []
    
    const filtered = players.filter(player => {
      const matchesPosition = selectedPositions.size === 0 || selectedPositions.has(player.position)
      const matchesSearch = 
        player.nameKicker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesPosition && matchesSearch
    })

    return filtered.sort((a, b) => {
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
          const posOrder: Record<string, number> = { GOALKEEPER: 0, DEFENDER: 1, MIDFIELD: 2, STRIKER: 3 }
          comparison = (posOrder[a.position] ?? 999) - (posOrder[b.position] ?? 999)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [players, selectedPositions, searchTerm, sortKey, sortOrder])

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <PageHeader icon="sap-icon-shield" title={team?.name || 'Laden...'}>
        {team?.logoSUrl && (
          <img src={team.logoSUrl} alt={team.name} className="w-8 h-8 object-contain" />
        )}
      </PageHeader>

      <CardContainer>
        <FilterBar
          selectedPositions={selectedPositions}
          setSelectedPositions={setSelectedPositions}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          hasFilter={hasActiveFilter}
        />

        {!isMobile && (
        <TableContent count={filteredPlayers.length} total={players?.length || 0} countLabel="Spielern">
          <table className="w-full">
            <TableHead>
              <tr>
                <ThSortable align="center" onClick={() => handleSort('positionTotal')}>
                  Pos<SortIcon column="positionTotal" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable align="center" onClick={() => handleSort('positionChange')}>
                  +-<SortIcon column="positionChange" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable align="left" onClick={() => handleSort('nameKicker')}>
                  Name<SortIcon column="nameKicker" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable align="center" onClick={() => handleSort('points')}>
                  Pkt<SortIcon column="points" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable align="center" onClick={() => handleSort('pointsLastRound')}>
                  Spieltag<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable align="center" onClick={() => handleSort('managerCount')}>
                  Manager<SortIcon column="managerCount" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable align="right" onClick={() => handleSort('prize')}>
                  Preis<SortIcon column="prize" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable align="left" onClick={() => handleSort('position')}>
                  Position<SortIcon column="position" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
              </tr>
            </TableHead>
            <TableBody>
              {filteredPlayers && filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <tr key={player.id} className="border-b border-border hover:bg-card-hover">
                    <td className="px-3 py-2 text-center text-foreground">
                      {player.positionTotal ? `${player.positionTotal}.` : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {player.positionChange != null && player.positionChange !== 0 ? (
                        <span className={`${player.positionChange > 0 ? 'text-success' : 'text-danger'}`}>
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
                        <div className="font-medium text-primary">{player.nameKicker}</div>
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2 text-center text-foreground">
                      {player.points ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-muted">
                      {player.pointsLastRound ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <RouterLink to={`/players/${player.id}`}>
                        <span
                          className={`${player.managerCount && player.managerCount > 0 ? 'chip-accent' : ''} text-xs font-medium px-2 py-0.5 rounded cursor-pointer hover:opacity-80`}
                        >
                          {player.managerCount ?? 0}
                        </span>
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {player.prize ? player.prize.toLocaleString() : '-'} €
                    </td>
                    <td className="px-3 py-2">
                      <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded`}>
                        {positionLabels[player.position]}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-subtle py-8">
                    Keine Spieler gefunden
                  </td>
                </tr>
              )}
            </TableBody>
          </table>
        </TableContent>
        )}

        {isMobile && (
        <div className="flex-1 px-6 pb-6 overflow-x-auto">
          <div className="grid gap-4 mt-4">
            {filteredPlayers && filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))
            ) : (
              <div className="text-center text-subtle py-8">
                Keine Spieler gefunden
              </div>
            )}
          </div>

          {filteredPlayers && (
            <div className="mt-4 text-sm text-subtle">
              {filteredPlayers.length} von {players?.length || 0} Spielern
            </div>
          )}
        </div>
        )}
      </CardContainer>
    </div>
  )
}
