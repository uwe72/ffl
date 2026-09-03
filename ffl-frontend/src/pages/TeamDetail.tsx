import { useState, useMemo, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { useTeam, useTeamPlayers, useUpdateTeam } from '../hooks/useTeams'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import BackButton from '../components/BackButton'
import SortIcon from '../components/SortIcon'
import { TableHead, ThSortable, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'
import type { Player } from '../types'
import { positionBarColor } from '../utils/positions'

export const positionLabels: Record<string, string> = {
  GOALKEEPER: 'Torwart',
  DEFENDER: 'Verteidiger',
  MIDFIELD: 'Mittelfeld',
  STRIKER: 'Stürmer'
}

export const positionColors: Record<string, string> = {
  GOALKEEPER: 'pos-goalkeeper',
  DEFENDER: 'pos-defender',
  MIDFIELD: 'pos-midfield',
  STRIKER: 'pos-striker'
}

const positionSapIcon: Record<string, string> = {
  GOALKEEPER: 'sap-icon-shield',
  DEFENDER: 'sap-icon-shield',
  MIDFIELD: 'sap-icon-circle-task',
  STRIKER: 'sap-icon-goal',
}

const positionChipActiveColors: Record<string, string> = {
  GOALKEEPER: 'bg-goalkeeper-bg text-goalkeeper-text border-goalkeeper',
  DEFENDER: 'bg-defender-bg text-defender-text border-defender',
  MIDFIELD: 'bg-midfield-bg text-midfield-text border-midfield',
  STRIKER: 'bg-striker-bg text-striker-text border-striker',
}

const chipInactive = 'bg-elevated text-muted border-border'

type SortKey = 'positionTotal' | 'positionChange' | 'nameKicker' | 'points' | 'pointsLastRound' | 'managerCount' | 'prize' | 'position'
type SortOrder = 'asc' | 'desc'

function FilterBar({ selectedPositions, setSelectedPositions, hasFilter }: {
  selectedPositions: Set<string>
  setSelectedPositions: (s: Set<string>) => void
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
  }

  return (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as const).map(pos => {
          const active = selectedPositions.has(pos)
          return (
            <button
              key={pos}
              onClick={() => togglePosition(pos)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-badge text-xs font-medium border transition-colors ${active ? positionChipActiveColors[pos] : chipInactive}`}
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
          className="p-1 rounded-control text-subtle hover:text-danger transition-colors"
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

function fullName(player: Player): string {
  const first = player.firstName?.trim()
  const last = player.lastName?.trim()
  if (first && last) return `${first} ${last}`
  return player.nameKicker
}

function PlayerCard({ player }: { player: Player }) {
  return (
    <div className="card relative overflow-hidden p-4 pl-5 bg-surface border border-border rounded-card">
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${positionBarColor[player.position]}`} />
      <div className="flex gap-4 items-center">
        {player.pictureUrl ? (
          <img 
            src={player.pictureUrl} 
            alt={fullName(player)}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-elevated flex items-center justify-center flex-shrink-0">
            <span className="text-xl text-subtle">👤</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate">{fullName(player)}</div>
          <div className="mt-1">
            <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded-badge`}>
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
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const updateTeam = useUpdateTeam()

  const [editData, setEditData] = useState({ shortName: '', slogan: '', logoSUrl: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [stammdatenOpen, setStammdatenOpen] = useState(false)

  useEffect(() => {
    if (team) {
      setEditData({ shortName: team.shortName || '', slogan: team.slogan || '', logoSUrl: team.logoSUrl || '' })
    }
  }, [team])

  const hasChanges = team && (editData.shortName !== (team.shortName || '') || editData.slogan !== (team.slogan || '') || editData.logoSUrl !== (team.logoSUrl || ''))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateTeam.mutateAsync({ id: Number(id), data: editData })
      setStammdatenOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (team) {
      setEditData({ shortName: team.shortName || '', slogan: team.slogan || '', logoSUrl: team.logoSUrl || '' })
    }
  }

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
    <div className="md:h-full md:flex md:flex-col md:min-h-0">
      <BackButton to="/teams" className="mb-4 md:shrink-0" />

      <div className="w-fit max-w-full md:flex-1 md:min-h-0 md:flex md:flex-col">
      {team && (
        <div className="p-4 bg-elevated border border-border rounded-card mb-6 md:shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 shrink-0">
              {team.logoSUrl ? (
                <img src={team.logoSUrl} alt={team.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent-muted text-accent flex items-center justify-center">
                  <i className="sap-icon sap-icon-shield text-xl" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {!stammdatenOpen && (
                <div>
                  <h2 className="text-3xl font-bold text-foreground truncate">{team.name}</h2>
                  <p className="text-xs uppercase tracking-wide text-subtle mt-2">
                    {team.slogan || '-'}
                  </p>
                </div>
              )}

              {stammdatenOpen && (
                <div id="stammdaten-form">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <span className="text-xs text-muted">Name</span>
                      <input
                        type="text"
                        value={team.name}
                        readOnly
                        className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-muted">Kurzname</span>
                      <input
                        type="text"
                        value={editData.shortName}
                        onChange={(e) => setEditData({ ...editData, shortName: e.target.value })}
                        required
                        className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-muted">Slogan</span>
                      <input
                        type="text"
                        value={editData.slogan}
                        onChange={(e) => setEditData({ ...editData, slogan: e.target.value })}
                        maxLength={22}
                        className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div className="mt-4 min-w-0">
                    <span className="text-xs text-muted">Logo URL</span>
                    <input
                      type="text"
                      value={editData.logoSUrl}
                      onChange={(e) => setEditData({ ...editData, logoSUrl: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                  {hasChanges && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="emphasized"
                        size={isMobile ? 'sm' : 'input'}
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Wird gespeichert...' : 'Speichern'}
                      </Button>
                      <Button
                        variant="ghost"
                        size={isMobile ? 'sm' : 'input'}
                        onClick={handleReset}
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
                size={isMobile ? 'sm' : 'input'}
                onClick={() => setStammdatenOpen(o => !o)}
                aria-expanded={stammdatenOpen}
                aria-controls="stammdaten-form"
                className="shrink-0 self-start"
              >
                <i className={`sap-icon sap-icon-slim-arrow-${stammdatenOpen ? 'up' : 'down'} text-xs mr-1`} />
                {stammdatenOpen ? 'Schließen' : 'Bearbeiten'}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6 md:mb-0 w-full md:w-fit max-w-full md:flex-1 md:min-h-0 md:flex md:flex-col">
        <div className="flex items-center justify-between mb-4 md:shrink-0">
          <h2 className="text-xl font-semibold text-foreground">Spieler ({filteredPlayers.length})</h2>
          <div className="relative w-64">
            <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Spieler suchen..."
              className="input-field control pl-8 pr-3 py-2 rounded-control text-sm w-full"
            />
          </div>
        </div>

        <div className="md:shrink-0">
        <FilterBar
          selectedPositions={selectedPositions}
          setSelectedPositions={setSelectedPositions}
          hasFilter={hasActiveFilter}
        />
        </div>

        {!isMobile && (
          <>
            <div className="flex-1 min-h-0 overflow-auto rounded-card border border-border w-fit max-w-full">
              <table>
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
                    <ThSortable align="left" onClick={() => handleSort('position')}>
                      Position<SortIcon column="position" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                  </tr>
                </TableHead>
                <TableBody>
                  {filteredPlayers && filteredPlayers.length > 0 ? (
                    filteredPlayers.map((player, index) => (
                      <tr key={player.id} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
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
                          <RouterLink to={`/players/${player.id}`} className="flex items-center link">
                            {player.pictureUrl && (
                              <img src={player.pictureUrl} alt={fullName(player)} className="w-10 h-10 rounded-full object-cover mr-3" />
                            )}
                            <div className="font-medium text-link">{fullName(player)}</div>
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
                              className={`${player.managerCount && player.managerCount > 0 ? 'chip-accent' : ''} text-xs font-medium px-2 py-0.5 rounded-badge cursor-pointer hover:opacity-80`}
                            >
                              {player.managerCount ?? 0}
                            </span>
                          </RouterLink>
                        </td>
                        <td className="px-3 py-2 text-right text-foreground">
                          {player.prize ? player.prize.toLocaleString() : '-'} €
                        </td>
                        <td className="px-3 py-2">
                          <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded-badge`}>
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
            </div>
          </>
        )}

        {isMobile && (
          <div>
            <div className="grid gap-4">
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
          </div>
        )}
      </div>
      </div>

      <div className="h-10 md:hidden" />
    </div>
  )
}
