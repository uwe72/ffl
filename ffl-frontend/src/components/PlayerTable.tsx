import { useState, useMemo, useRef, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useAuth } from '../context/AuthContext'
import { useCurrentSeason, usePublicCurrentSeason } from '../hooks/useSeasons'
import { trackEvent } from '../hooks/useMatomo'
import useIsMobile from '../hooks/useIsMobile'
import SortIcon from '../components/SortIcon'
import Button from '../components/Button'
import { TableHead, ThSortable, Th, TableBody } from '../components/Table'
import { positionBarColor } from '../utils/positions'
import type { Team, Player, Position } from '../types'

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

const positionShortLabels: Record<string, string> = {
  GOALKEEPER: 'TW',
  DEFENDER: 'VT',
  MIDFIELD: 'MF',
  STRIKER: 'ST'
}

const positionChipClass: Record<string, string> = {
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

function PlayerCard({ player, hideManager, hideStats, onSelect }: { player: Player; hideManager?: boolean; hideStats?: boolean; onSelect?: (player: Player) => void }) {
  return (
    <div className={`relative overflow-hidden p-4 pl-5 bg-surface border border-border rounded-card ${onSelect ? 'cursor-pointer hover:border-border-hover' : ''}`} onClick={onSelect ? () => onSelect(player) : undefined}>
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${positionBarColor[player.position]}`} />
      <div className="flex gap-4 items-center">
        {player.pictureUrl ? (
          <img
            src={player.pictureUrl}
            alt={player.nameKicker}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center flex-shrink-0">
            <span className="text-xl text-subtle">👤</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate">{player.nameKicker}</div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className={`${positionChipClass[player.position]} text-xs font-medium px-2 py-0.5`}>
              {positionShortLabels[player.position]}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 bg-elevated text-foreground">
              {formatPrice(player.prize)}
            </span>
          </div>
        </div>
        {player.teams.length > 0 && player.teams[0].logoSUrl && (
          <img
            src={player.teams[0].logoSUrl}
            alt={player.teams[0].name}
            className="w-10 h-10 object-contain flex-shrink-0"
          />
        )}
      </div>

      {!hideStats && (
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
        {!hideManager && (
        <div>
          <span className="text-subtle">Manager: </span>
          <span className="font-medium text-foreground">{player.managerCount ?? 0}</span>
        </div>
        )}
        <div>
          <span className="text-subtle">Preis: </span>
          <span className="font-medium text-foreground">{formatPrice(player.prize)}</span>
        </div>
      </div>
      )}
    </div>
  )
}

function PlayerFilterBar({ selectedPositions, setSelectedPositions, selectedTeamId, setSelectedTeamId, teams, priceMin, setPriceMin, priceMax, setPriceMax, hasFilter, fixedPosition, aktivFilter, setAktivFilter }: {
  selectedPositions: Set<string>
  setSelectedPositions: (s: Set<string>) => void
  selectedTeamId: number | 'ALL'
  setSelectedTeamId: (id: number | 'ALL') => void
  teams: Team[]
  priceMin: string
  setPriceMin: (s: string) => void
  priceMax: string
  setPriceMax: (s: string) => void
  hasFilter: boolean
  fixedPosition?: Position
  aktivFilter: 'aktiv' | 'inaktiv' | 'alle'
  setAktivFilter: (v: 'aktiv' | 'inaktiv' | 'alle') => void
}) {
  const togglePosition = (pos: string) => {
    if (fixedPosition) return
    const next = new Set(selectedPositions)
    if (next.has(pos)) next.delete(pos)
    else next.add(pos)
    setSelectedPositions(next)
  }

  const [minFocused, setMinFocused] = useState(false)
  const [maxFocused, setMaxFocused] = useState(false)

  const clearFilter = () => {
    setSelectedPositions(fixedPosition ? new Set([fixedPosition]) : new Set())
    setSelectedTeamId('ALL')
    setPriceMin('')
    setPriceMax('')
    setAktivFilter('alle')
  }

  const visiblePositions = fixedPosition ? [fixedPosition] : (['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as const)

  const aktivLabel = aktivFilter === 'aktiv' ? 'Aktiv' : aktivFilter === 'inaktiv' ? 'Inaktiv' : 'Alle'
  const aktivClass = aktivFilter === 'aktiv'
    ? 'bg-success-bg text-success border-success'
    : aktivFilter === 'inaktiv'
    ? 'bg-danger-bg text-danger border-danger'
    : chipInactive
  const cycleAktiv = () => setAktivFilter(aktivFilter === 'aktiv' ? 'inaktiv' : aktivFilter === 'inaktiv' ? 'alle' : 'aktiv')

  return (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {visiblePositions.map(pos => {
          const active = selectedPositions.has(pos)
          return (
            <button
              key={pos}
              onClick={() => togglePosition(pos)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-badge text-xs font-medium border transition-colors ${active ? positionChipActiveColors[pos] : chipInactive} ${fixedPosition ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <i className={`sap-icon ${positionSapIcon[pos]} text-[12px]`} />
              {positionLabels[pos]}
            </button>
          )
        })}
        <button
          onClick={cycleAktiv}
          title="Aktiv: aktueller Bundesliga-Spieler · Inaktiv: Spieler hat die Bundesliga verlassen (z.B. Transfer ins Ausland, Karriereende) · Alle: beide Gruppen anzeigen"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-badge text-xs font-medium border transition-colors ${aktivClass} cursor-pointer`}
        >
          <i className="sap-icon sap-icon-check-availability text-[12px]" />
          {aktivLabel}
        </button>
      </div>

      <select
        value={selectedTeamId}
        onChange={e => setSelectedTeamId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
        className="input-field control px-2 py-1.5 rounded-control text-xs cursor-pointer w-full sm:w-auto sm:min-w-40"
      >
        <option value="ALL">Alle Vereine</option>
        {teams.map(team => (
          <option key={team.id} value={team.id}>{team.name}</option>
        ))}
      </select>

      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <input
          type="text"
          inputMode="numeric"
          value={minFocused ? priceMin : (priceMin ? `${Number(priceMin).toLocaleString('de-DE')} €` : '')}
          onFocus={() => setMinFocused(true)}
          onBlur={() => setMinFocused(false)}
          onChange={e => setPriceMin(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="Min €"
          className="input-field control flex-1 min-w-0 sm:w-40 px-2 py-1.5 text-xs"
        />
        <span className="text-subtle text-xs">–</span>
        <input
          type="text"
          inputMode="numeric"
          value={maxFocused ? priceMax : (priceMax ? `${Number(priceMax).toLocaleString('de-DE')} €` : '')}
          onFocus={() => setMaxFocused(true)}
          onBlur={() => setMaxFocused(false)}
          onChange={e => setPriceMax(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="Max €"
          className="input-field control flex-1 min-w-0 sm:w-40 px-2 py-1.5 text-xs"
        />
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

export default function PlayerTable({
  players,
  fixedPosition,
  excludePlayerIds,
  onSelect,
  defaultSortKey = 'position',
  defaultSortOrder = 'asc',
  isPublic = false,
  defaultAktivFilter = 'alle',
  autoFocus = false,
  enableExport = false,
}: {
  players: Player[]
  fixedPosition?: Position
  excludePlayerIds?: Set<number>
  onSelect?: (player: Player) => void
  defaultSortKey?: SortKey
  defaultSortOrder?: 'asc' | 'desc'
  isPublic?: boolean
  defaultAktivFilter?: 'aktiv' | 'inaktiv' | 'alle'
  autoFocus?: boolean
  enableExport?: boolean
}) {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const { data: currentSeason } = useCurrentSeason({ enabled: !isPublic })
  const { data: publicSeason } = usePublicCurrentSeason()
  const effectiveSeason = currentSeason ?? publicSeason
  const isAdmin = user?.role === 'ADMIN'
  const isBeforeSeason = isPublic || effectiveSeason?.seasonState === 'BEFORE_SEASON'
  const isBeforeSeasonNonAdmin = (isBeforeSeason && !isAdmin) || isPublic
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(() => fixedPosition ? new Set([fixedPosition]) : new Set())
  const [selectedTeamId, setSelectedTeamId] = useState<number | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [aktivFilter, setAktivFilter] = useState<'aktiv' | 'inaktiv' | 'alle'>(defaultAktivFilter)
  const [sortKey, setSortKey] = useState<SortKey>(defaultSortKey)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [autoFocus])

  const teams = useMemo(() => {
    const teamMap = new Map<number, Team>()
    players.forEach(p => p.teams.forEach(t => teamMap.set(t.id, t)))
    return Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [players])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const hasActiveFilter = selectedPositions.size > 0 || selectedTeamId !== 'ALL' || searchTerm !== '' || priceMin !== '' || priceMax !== '' || aktivFilter !== 'alle'

  const filteredPlayers = useMemo(() => {
    const filtered = players.filter(player => {
      const matchesPosition = selectedPositions.size === 0 || selectedPositions.has(player.position)
      const matchesTeam = selectedTeamId === 'ALL' || player.teams.some(t => t.id === selectedTeamId)
      const matchesSearch =
        player.nameKicker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.teams.some(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
      const min = priceMin ? Number(priceMin) : 0
      const max = priceMax ? Number(priceMax) : Infinity
      const matchesPrice = player.prize >= min && player.prize <= max
      const matchesAktiv =
        aktivFilter === 'alle' ? true
        : aktivFilter === 'aktiv' ? player.aktiv !== false
        : player.aktiv === false
      const matchesExcluded = !excludePlayerIds || !excludePlayerIds.has(player.id)
      return matchesPosition && matchesTeam && matchesSearch && matchesPrice && matchesAktiv && matchesExcluded
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
  }, [players, selectedPositions, selectedTeamId, searchTerm, priceMin, priceMax, aktivFilter, sortKey, sortOrder, excludePlayerIds])

  const exportToExcel = () => {
    if (!filteredPlayers || filteredPlayers.length === 0) return

    const data = filteredPlayers.map(player => {
      const row: Record<string, string | number> = {
        'Name': fullName(player),
      }
      if (!isBeforeSeason) {
        row['Pos.'] = player.positionTotal ?? '-'
        row['+-'] = player.positionChange != null && player.positionChange !== 0
          ? (player.positionChange > 0 ? `↑${player.positionChange}` : `↓${Math.abs(player.positionChange)}`)
          : '-'
        row['Pkt.'] = player.points ?? '-'
        row['Spieltag'] = player.pointsLastRound ?? '-'
      }
      if (!isBeforeSeasonNonAdmin) {
        row['Manager'] = player.managerCount ?? 0
      }
      row['Preis (€)'] = player.prize ? player.prize : 0
      if (!fixedPosition) {
        row['Position'] = positionLabels[player.position]
      }
      row['Verein'] = player.teams.length > 0 ? player.teams[0].name : '-'
      row['Aktiv'] = player.aktiv === false ? 'Nein' : 'Ja'
      return row
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Spieler')
    XLSX.writeFile(wb, 'player-export.xlsx')
    trackEvent('player', 'export_excel')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="hidden sm:block text-xl font-semibold text-foreground">Spieler ({filteredPlayers.length})</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Spieler suchen..."
              className="input-field control pl-8 pr-3 py-2 rounded-control text-sm w-full"
            />
          </div>
          {enableExport && (
            <Button onClick={exportToExcel} size="input">
              Excel Export
            </Button>
          )}
        </div>
      </div>

      <PlayerFilterBar
        selectedPositions={selectedPositions}
        setSelectedPositions={setSelectedPositions}
        selectedTeamId={selectedTeamId}
        setSelectedTeamId={setSelectedTeamId}
        teams={teams}
        priceMin={priceMin}
        setPriceMin={setPriceMin}
        priceMax={priceMax}
        setPriceMax={setPriceMax}
        hasFilter={hasActiveFilter}
        fixedPosition={fixedPosition}
        aktivFilter={aktivFilter}
        setAktivFilter={setAktivFilter}
      />

      {!isMobile && (
        <>
          <div className="overflow-x-auto rounded-card border border-border w-fit max-w-full">
            <table>
              <TableHead>
                <tr>
                  {!isBeforeSeason && (
                  <ThSortable align="center" onClick={() => handleSort('positionTotal')}>
                    Pos<SortIcon column="positionTotal" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  )}
                  {!isBeforeSeason && (
                  <ThSortable align="center" onClick={() => handleSort('positionChange')}>
                    +-<SortIcon column="positionChange" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  )}
                  <ThSortable align="left" onClick={() => handleSort('nameKicker')}>
                    Name<SortIcon column="nameKicker" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  {!isBeforeSeason && (
                  <ThSortable align="center" onClick={() => handleSort('points')}>
                    Pkt<SortIcon column="points" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  )}
                  {!isBeforeSeason && (
                  <ThSortable align="center" onClick={() => handleSort('pointsLastRound')}>
                    Spieltag<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  )}
                  {!isBeforeSeasonNonAdmin && (
                  <ThSortable align="center" onClick={() => handleSort('managerCount')}>
                    Manager<SortIcon column="managerCount" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  )}
                  <ThSortable align="right" onClick={() => handleSort('prize')}>
                    Preis<SortIcon column="prize" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  {!fixedPosition && (
                  <ThSortable align="left" onClick={() => handleSort('position')}>
                    Position<SortIcon column="position" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  )}
                  <Th align="left">Verein</Th>
                  <Th align="center">
                    <span className="cursor-help" title="Aktiv: aktueller Bundesliga-Spieler · Inaktiv: Spieler hat die Bundesliga verlassen">
                      Aktiv
                    </span>
                  </Th>
                 </tr>
              </TableHead>
              <TableBody>
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player, index) => (
                    <tr
                      key={player.id}
                      onClick={onSelect ? () => onSelect(player) : undefined}
                      className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''} ${onSelect ? 'cursor-pointer' : ''}`}
                    >
                      {!isBeforeSeason && (
                      <td className="px-3 py-2 text-center text-foreground">
                        {player.positionTotal ? `${player.positionTotal}.` : '-'}
                      </td>
                      )}
                      {!isBeforeSeason && (
                      <td className="px-3 py-2 text-center">
                        {player.positionChange != null && player.positionChange !== 0 ? (
                          <span className={`${player.positionChange > 0 ? 'text-success' : 'text-danger'}`}>
                            {player.positionChange > 0 ? `↑${player.positionChange}` : `↓${Math.abs(player.positionChange)}`}
                          </span>
                        ) : (
                          <span className="text-subtle">-</span>
                        )}
                      </td>
                      )}
                      <td className="px-3 py-2">
                        {onSelect ? (
                          <div className="flex items-center">
                            {player.pictureUrl && (
                              <img src={player.pictureUrl} alt={fullName(player)} className="w-10 h-10 rounded-full object-cover mr-3" />
                            )}
                            <div className="font-medium text-foreground">{fullName(player)}</div>
                          </div>
                        ) : isBeforeSeasonNonAdmin ? (
                          <div className="flex items-center">
                            {player.pictureUrl && (
                              <img src={player.pictureUrl} alt={fullName(player)} className="w-10 h-10 rounded-full object-cover mr-3" />
                            )}
                            <div className="font-medium text-foreground">{fullName(player)}</div>
                          </div>
                        ) : (
                          <RouterLink to={`/players/${player.id}`} className="flex items-center link">
                            {player.pictureUrl && (
                              <img src={player.pictureUrl} alt={fullName(player)} className="w-10 h-10 rounded-full object-cover mr-3" />
                            )}
                            <div className="font-medium text-link">{fullName(player)}</div>
                          </RouterLink>
                        )}
                      </td>
                      {!isBeforeSeason && (
                      <td className="px-3 py-2 text-center text-foreground">
                        {player.points ?? '-'}
                      </td>
                      )}
                      {!isBeforeSeason && (
                      <td className="px-3 py-2 text-center text-muted">
                        {player.pointsLastRound ?? '-'}
                      </td>
                      )}
                      {!isBeforeSeasonNonAdmin && (
                      <td className="px-3 py-2 text-center">
                        {onSelect ? (
                          <span className={`${player.managerCount && player.managerCount > 0 ? 'chip-accent' : ''} text-xs font-medium px-2 py-0.5 rounded-badge`}>
                            {player.managerCount ?? 0}
                          </span>
                        ) : (
                          <RouterLink to={`/players/${player.id}`}>
                            <span
                              className={`${player.managerCount && player.managerCount > 0 ? 'chip-accent' : ''} text-xs font-medium px-2 py-0.5 rounded-badge cursor-pointer hover:opacity-80`}
                            >
                              {player.managerCount ?? 0}
                            </span>
                          </RouterLink>
                        )}
                      </td>
                      )}
                      <td className="px-3 py-2 text-right text-foreground">
                        {player.prize ? player.prize.toLocaleString() : '-'} €
                      </td>
                      {!fixedPosition && (
                      <td className="px-3 py-2">
                        <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded-badge`}>
                          {positionLabels[player.position]}
                        </span>
                      </td>
                      )}
                      <td className="px-3 py-2 text-muted">
                        {player.teams.length > 0 ? (
                          <span className="flex items-center gap-2">
                            {player.teams[0].logoSUrl && (
                              <img
                                src={player.teams[0].logoSUrl}
                                alt={player.teams[0].name}
                                className="w-5 h-5 object-contain flex-shrink-0"
                              />
                            )}
                            <span className="text-foreground">{player.teams[0].name}</span>
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {player.aktiv === false ? (
                          <span className="text-xs font-medium text-danger">Nein</span>
                        ) : (
                          <span className="text-xs font-medium text-success">Ja</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10 - (isBeforeSeason ? 4 : 0) - (isBeforeSeasonNonAdmin ? 1 : 0) - (fixedPosition ? 1 : 0)} className="text-center text-subtle py-8">
                      Keine Spieler gefunden
                    </td>
                  </tr>
                )}
              </TableBody>
            </table>
          </div>
          <div className="mt-4 text-sm text-subtle">
            {filteredPlayers.length} von {players?.length || 0} Spielern
          </div>
        </>
      )}

      {isMobile && (
        <div>
          <div className="grid gap-4">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} hideManager={isBeforeSeasonNonAdmin} hideStats={isBeforeSeason} onSelect={onSelect} />
              ))
            ) : (
              <div className="text-center text-subtle py-8">
                Keine Spieler gefunden
              </div>
            )}
          </div>
          <div className="mt-4 text-sm text-subtle">
            {filteredPlayers.length} von {players?.length || 0} Spielern
          </div>
        </div>
      )}
    </div>
  )
}
