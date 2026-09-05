import { useParams, Link as RouterLink } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useManager, useManagerRoundDetails, useUpdateManagerDetails } from '../hooks/useManagers'
import { useDashboardAufstellung } from '../hooks/useDashboard'
import { useCurrentSeason } from '../hooks/useSeasons'
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
import { buildManagerGamePointsRows } from '../utils/managerGamePoints'
import { shortRuleLabel } from '../utils/gamePoints'
import type { Player } from '../types'

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

type SortKey = 'positionTotal' | 'positionChange' | 'nameKicker' | 'points' | 'pointsLastRound' | 'managerCount' | 'einsatzquote' | 'prize' | 'position' | 'team'
type SortOrder = 'asc' | 'desc'
type GameSortKey = 'roundNumber' | 'gameName' | 'playerName' | 'ruleLabel' | 'points'

function PlayerRow({ player, compact }: { player: Player; compact: boolean }) {
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
            <div className={player.aktiv === false ? 'font-medium text-danger line-through whitespace-nowrap' : 'font-medium text-link whitespace-nowrap'}>{player.nameKicker}</div>
            {!isMobile && player.firstName && player.lastName && (
              <div className="text-sm text-subtle whitespace-nowrap">
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
      {!compact && (
      <td className="px-3 py-2 text-center">
        <RouterLink to={`/players/${player.id}`}>
          <span 
            className={`text-xs font-medium px-2 py-0.5 rounded-badge cursor-pointer hover:opacity-80 ${player.managerCount && player.managerCount > 0 ? 'chip-accent' : 'bg-elevated text-muted'}`}
          >
            {player.managerCount ?? 0}
          </span>
        </RouterLink>
      </td>
      )}
      {!compact && (
      <td className="px-3 py-2 text-center text-foreground tabular-nums">
        {player.einsatzquote != null ? `${player.einsatzquote} %` : '-'}
      </td>
      )}
      {!compact && (
      <td className="px-3 py-2 text-right font-medium text-foreground whitespace-nowrap tabular-nums">
        {player.prize.toLocaleString()} €
      </td>
      )}
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
            <span className="font-semibold text-foreground whitespace-nowrap">{currentTeam.name}</span>
          </span>
        ) : '-'}
      </td>
      {!compact && (
      <td className="px-3 py-2 text-center">
        {player.aktiv === false ? (
          <span className="text-xs font-medium text-danger">Nein</span>
        ) : (
          <span className="text-xs font-medium text-success">Ja</span>
        )}
      </td>
      )}
    </tr>
  )
}

function PlayerTable({ players, title }: { players: Player[]; title: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [compact, setCompact] = useState(() => {
    const stored = localStorage.getItem('ffl-player-compact')
    return stored === null ? true : stored === 'true'
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const handleSetCompact = (next: boolean) => {
    setCompact(next)
    localStorage.setItem('ffl-player-compact', String(next))
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
        case 'einsatzquote':
          comparison = (a.einsatzquote ?? 0) - (b.einsatzquote ?? 0)
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <button
          onClick={() => handleSetCompact(!compact)}
          title="Kompakte Ansicht (weniger Spalten) oder Detail-Ansicht"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-badge text-xs font-medium border transition-colors ${compact ? 'bg-info-bg text-info border-info' : 'bg-elevated text-muted border-border'} cursor-pointer`}
        >
          <i className="sap-icon sap-icon-filter text-[12px]" />
          {compact ? 'Kompakt' : 'Detail'}
        </button>
      </div>
      <div className="w-fit max-w-full overflow-x-auto rounded-card border border-border">
        <table>
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
                Spieltag<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              {!compact && (
              <ThSortable align="center" onClick={() => handleSort('managerCount')}>
                Manager<SortIcon column="managerCount" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              )}
              {!compact && (
              <ThSortable align="center" onClick={() => handleSort('einsatzquote')}>
                Einsatzquote<SortIcon column="einsatzquote" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              )}
              {!compact && (
              <ThSortable align="right" onClick={() => handleSort('prize')}>
                Preis<SortIcon column="prize" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              )}
              <ThSortable onClick={() => handleSort('position')}>
                Position<SortIcon column="position" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable onClick={() => handleSort('team')}>
                Verein<SortIcon column="team" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              {!compact && (
              <Th align="center">
                <span className="cursor-help" title="Aktiv: aktueller Bundesliga-Spieler · Inaktiv: Spieler hat die Bundesliga verlassen">
                  Aktiv
                </span>
              </Th>
              )}
            </tr>
          </TableHead>
          <TableBody>
            {sortedPlayers.map((player) => (
              <PlayerRow key={player.id} player={player} compact={compact} />
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
  const { data: aufstellung } = useDashboardAufstellung(Number(id))
  const { data: season } = useCurrentSeason()
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
  const isHinrunde = season?.seasonState === 'RUNNING_HINRUNDE'
  const isOwnManagerForWinter = isOwnManager ||
    (isAdmin && !!manager?.login && manager.login === season?.adminFallbackUser)
  const showWinterSections = !isHinrunde || isOwnManagerForWinter

  const [stammdatenOpen, setStammdatenOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    description: '',
    mailTheme: 'LIGHTMODE'
  })

  const [gameSortKey, setGameSortKey] = useState<GameSortKey>('roundNumber')
  const [gameSortOrder, setGameSortOrder] = useState<SortOrder>('desc')

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

  const handleGameSort = (key: GameSortKey) => {
    if (gameSortKey === key) {
      setGameSortOrder(gameSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setGameSortKey(key)
      setGameSortOrder('asc')
    }
  }

  const gamePointsRows = useMemo(() => {
    return buildManagerGamePointsRows(roundDetails).sort((a, b) => {
      let comparison = 0
      switch (gameSortKey) {
        case 'roundNumber':
          comparison = a.roundNumber - b.roundNumber
          break
        case 'gameName':
          comparison = (isMobile ? a.opponent : a.gameName).localeCompare(isMobile ? b.opponent : b.gameName)
          break
        case 'playerName':
          comparison = a.playerName.localeCompare(b.playerName)
          break
        case 'ruleLabel':
          comparison = a.ruleLabel.localeCompare(b.ruleLabel)
          break
        case 'points':
          comparison = a.points - b.points
          break
      }
      if (comparison === 0) {
        comparison = a.roundNumber - b.roundNumber
      }
      return gameSortOrder === 'asc' ? comparison : -comparison
    })
  }, [roundDetails, gameSortKey, gameSortOrder, isMobile])

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

  if (isLoading) {
    return (
      <div className="max-w-7xl" aria-busy="true">
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
      <div className="max-w-7xl">
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
      <div className="max-w-7xl">
        <BackButton to="/managers" className="mb-4" />
        <div className="flex items-center gap-3 p-3 bg-info-bg border border-info/30 rounded-card">
          <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0" />
          <p className="text-sm text-foreground">Manager nicht gefunden.</p>
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

  return (
    <div className="max-w-7xl">
      <BackButton to="/managers" className="mb-4" />

      <div className={`${isMobile ? 'p-2 bg-surface mb-1' : 'p-4 bg-elevated mb-6'} border border-border rounded-card`}>
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
                    position={aufstellung?.positionGesamt ?? null}
                    positionVorher={aufstellung?.positionGesamtVorher ?? null}
                    punkteGesamt={aufstellung?.punkteGesamt ?? null}
                    punkteSpieltag={aufstellung?.punkteSpieltag ?? null}
                    einsatzquote={manager.einsatzquote ?? null}
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
                  <div className="bg-card rounded-card border border-border px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle">Einsatzquote</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {manager.einsatzquote != null ? `${manager.einsatzquote} %` : '—'}
                      </span>
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
                      size={isMobile ? 'sm' : 'input'}
                      onClick={handleDetailsSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Wird gespeichert...' : 'Speichern'}
                    </Button>
                    <Button
                      variant="ghost"
                      size={isMobile ? 'sm' : 'input'}
                      onClick={handleDetailsCancel}
                    >
                      Abbrechen
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isAdmin && !isMobile && (
            <Button
              variant={stammdatenOpen ? 'ghost' : 'emphasized'}
              size={isMobile ? 'sm' : 'input'}
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
        <div className="p-2 bg-surface border border-border rounded-card mb-1">
          {aufstellung ? (
            <AufstellungVertikal aufstellung={aufstellung} modus={feldModus} />
          ) : (
            <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
          )}
        </div>
      )}

      {hinrundePlayers.length > 0 && !isMobile && (
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
          <PlayerTable players={hinrundePlayers} title="Hinrunde-Aufstellung" />
        </div>
      )}

      {showWinterSections && oldPlayers.length > 0 && !isMobile && (
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
          <PlayerTable players={oldPlayers} title="Winterwechsel – Raus" />
        </div>
      )}

      {showWinterSections && newPlayers.length > 0 && !isMobile && (
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
          <PlayerTable players={newPlayers} title="Winterwechsel – Rein" />
        </div>
      )}

      {showWinterSections && hasExchanges && rueckrundePlayers.length > 0 && !isMobile && (
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
          <PlayerTable players={rueckrundePlayers} title={`Rückrunde-Aufstellung (${rueckrundePlayers.length} Spieler)`} />
        </div>
      )}

      {gamePointsRows.length > 0 && (
        <div className={`p-2 md:p-6 bg-surface border border-border rounded-card ${isMobile ? 'mb-0' : 'mb-6'}`}>
          {!isMobile && (
            <h3 className="text-base md:text-xl font-semibold text-foreground mb-4">Punkte</h3>
          )}
          {!isMobile && (
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full">
                <TableHead>
                  <tr>
                    <ThSortable align="center" onClick={() => handleGameSort('roundNumber')}>
                      Spieltag<SortIcon column="roundNumber" activeKey={gameSortKey} order={gameSortOrder} />
                    </ThSortable>
                    <ThSortable align="left" onClick={() => handleGameSort('gameName')}>
                      Spiel<SortIcon column="gameName" activeKey={gameSortKey} order={gameSortOrder} />
                    </ThSortable>
                    <ThSortable align="left" onClick={() => handleGameSort('playerName')}>
                      Spieler<SortIcon column="playerName" activeKey={gameSortKey} order={gameSortOrder} />
                    </ThSortable>
                    <ThSortable align="left" onClick={() => handleGameSort('ruleLabel')}>
                      Regel<SortIcon column="ruleLabel" activeKey={gameSortKey} order={gameSortOrder} />
                    </ThSortable>
                    <ThSortable align="center" onClick={() => handleGameSort('points')}>
                      Punkte<SortIcon column="points" activeKey={gameSortKey} order={gameSortOrder} />
                    </ThSortable>
                  </tr>
                </TableHead>
                <TableBody>
                  {gamePointsRows.map((row, index) => (
                    <tr key={`${row.roundNumber}-${row.playerId}-${row.rule}-${index}`} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                      <td className="px-3 py-2 text-center text-muted tabular-nums">
                        {row.roundNumber}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        <span className="font-medium">{row.gameName}</span>
                        {row.goalHost != null && row.goalVisitor != null && (
                          <span className="text-subtle"> ({row.goalHost}:{row.goalVisitor})</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <RouterLink to={`/players/${row.playerId}`} className="link font-medium">
                          {row.playerName}
                        </RouterLink>
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {row.ruleLabel}{row.count > 1 ? ` (${row.count}x)` : ''}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-foreground tabular-nums">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </TableBody>
              </table>
            </div>
          )}

          {isMobile && (
            <div className="overflow-x-auto rounded-card w-full" style={{ touchAction: 'pan-y' }}>
              <table className="w-full border-collapse text-sm table-fixed">
                <colgroup>
                  <col className="w-9" />
                  <col className="w-auto" />
                  <col className="w-auto" />
                  <col className="w-9" />
                </colgroup>
                <thead className="bg-elevated sticky top-0">
                  <tr>
                    <th colSpan={4} align="left" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">Punkte</th>
                  </tr>
                  <tr>
                    <th align="center" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap overflow-hidden">SP.</th>
                    <th align="left" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap overflow-hidden">Spieler</th>
                    <th align="left" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap overflow-hidden">Regel</th>
                    <th align="center" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap overflow-hidden">PKT.</th>
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {gamePointsRows.map((row, index) => (
                    <tr key={`${row.roundNumber}-${row.playerId}-${row.rule}-${index}`} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                      <td className="px-2 py-2 border-b border-border overflow-hidden tabular-nums text-center font-medium text-foreground">
                        {row.roundNumber}
                      </td>
                      <td className="px-2 py-2 border-b border-border overflow-hidden tabular-nums min-w-0">
                        <RouterLink to={`/players/${row.playerId}`} className="font-medium truncate block min-w-0 text-link">
                          {row.playerName}
                        </RouterLink>
                      </td>
                      <td className="px-2 py-2 border-b border-border overflow-hidden tabular-nums min-w-0 text-muted">
                        <span className="truncate block min-w-0" title={`${shortRuleLabel(row.rule)}${row.count > 1 ? ` (${row.count}x)` : ''}`}>
                          {shortRuleLabel(row.rule)}{row.count > 1 ? ` (${row.count}x)` : ''}
                        </span>
                      </td>
                      <td className="px-2 py-2 border-b border-border overflow-hidden tabular-nums text-center font-bold text-foreground">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

