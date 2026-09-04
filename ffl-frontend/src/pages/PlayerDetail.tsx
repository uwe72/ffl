import { useState, useMemo, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { usePlayer, useUpdatePlayer, usePlayerRanks } from '../hooks/usePlayers'
import { useAuth } from '../context/AuthContext'
import { positionLabels, positionColors } from './Players'
import ScoreLine from '../components/statistik/ScoreLine'
import Button from '../components/Button'
import BackButton from '../components/BackButton'
import SortIcon from '../components/SortIcon'
import Badge from '../components/Badge'
import { TableContent, TableHead, ThSortable, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'
import { getChartColors } from '../utils/chartColors'
import { buildGamePointsRows, shortRuleLabel } from '../utils/gamePoints'
import type { Position } from '../types'

const chartColors = getChartColors()

type SortKey = 'positionTotal' | 'positionChange' | 'shortName' | 'pointsTotal' | 'pointsLastRound' | 'firstName' | 'lastName' | 'hinrunde' | 'rueckrunde'
type GameSortKey = 'roundNumber' | 'gameName' | 'ruleLabel' | 'points'
type SortOrder = 'asc' | 'desc'

function formatPrice(price: number | undefined): string {
  if (!price) return '- €'
  if (price >= 1_000_000) {
    const millions = price / 1_000_000
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M €`
  }
  return `${Math.round(price / 1_000)}K €`
}

const POSITION_LABELS: Record<Position, string> = {
  GOALKEEPER: 'TW',
  DEFENDER: 'ABW',
  MIDFIELD: 'MF',
  STRIKER: 'ST',
}

const POSITION_SHORT_LABELS: Record<Position, string> = {
  GOALKEEPER: 'TW',
  DEFENDER: 'VT',
  MIDFIELD: 'MF',
  STRIKER: 'ST',
}

function managerLogin(m: { shortName?: string; name?: string }): string {
  return m.shortName ?? m.name ?? '-'
}

function managerFullName(m: { firstName?: string; lastName?: string; name?: string }): string {
  return [m.firstName, m.lastName].filter(Boolean).join(' ') || m.name || '-'
}

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: player, isLoading, error } = usePlayer(Number(id))
  const { data: playerRanks } = usePlayerRanks(Number(id))
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const isMobile = useIsMobile()
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [gameSortKey, setGameSortKey] = useState<GameSortKey>('roundNumber')
  const [gameSortOrder, setGameSortOrder] = useState<SortOrder>('asc')
  const [editData, setEditData] = useState({
    nameKicker: '',
    nameKickerAlt1: '',
    nameKickerAlt2: '',
    nameKickerAlt3: '',
    firstName: '',
    lastName: '',
    prize: 0,
    pictureUrl: '',
    position: '' as Position,
    aktiv: true
  })
  const [isSaving, setIsSaving] = useState(false)
  const updatePlayer = useUpdatePlayer()
  const [stammdatenOpen, setStammdatenOpen] = useState(false)
  const [managerFilter, setManagerFilter] = useState('')

  useEffect(() => {
    if (player) {
      setEditData({
        nameKicker: player.nameKicker,
        nameKickerAlt1: player.nameKickerAlt1 || '',
        nameKickerAlt2: player.nameKickerAlt2 || '',
        nameKickerAlt3: player.nameKickerAlt3 || '',
        firstName: player.firstName || '',
        lastName: player.lastName || '',
        prize: player.prize,
        pictureUrl: player.pictureUrl || '',
        position: player.position,
        aktiv: player.aktiv ?? true
      })
    }
  }, [player])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updatePlayer.mutateAsync({ id: Number(id), data: editData })
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (value: number): string => {
    if (value === 0) return ''
    return value.toLocaleString('de-DE') + ' €'
  }

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/\./g, '').replace('€', '').replace(/\s/g, '').trim()
    return parseInt(cleaned) || 0
  }

  const hasChanges = player && (
    editData.nameKicker !== player.nameKicker ||
    editData.nameKickerAlt1 !== (player.nameKickerAlt1 || '') ||
    editData.nameKickerAlt2 !== (player.nameKickerAlt2 || '') ||
    editData.nameKickerAlt3 !== (player.nameKickerAlt3 || '') ||
    editData.firstName !== (player.firstName || '') ||
    editData.lastName !== (player.lastName || '') ||
    editData.prize !== player.prize ||
    editData.pictureUrl !== (player.pictureUrl || '') ||
    editData.position !== player.position ||
    editData.aktiv !== (player.aktiv ?? true)
  )

  const chartData = useMemo(() => {
    if (!playerRanks || !player?.season?.currentMatchday) return []
    
    const maxMatchday = player.season.currentMatchday
    const ranksMap = new Map(playerRanks.map(r => [r.roundNumber, r]))
    
    return Array.from({ length: maxMatchday }, (_, i) => {
      const roundNumber = i + 1
      const rank = ranksMap.get(roundNumber)
      return {
        name: `${roundNumber}`,
        punkte: rank?.pointsRound ?? 0,
        roundNumber,
        gameName: rank?.gameName,
        goalHost: rank?.goalHost,
        goalVisitor: rank?.goalVisitor,
        rules: rank?.rules
      }
    })
  }, [playerRanks, player?.season?.currentMatchday])

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { punkte: number; gameName?: string; goalHost?: number; goalVisitor?: number; rules?: Array<{ ruleLabel: string; count: number; points: number }> } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const gameName = data.gameName
      const goalHost = data.goalHost
      const goalVisitor = data.goalVisitor
      const rules = data.rules
      
      return (
        <div className="bg-surface border border-border rounded-card p-3 shadow-lg min-w-[180px]">
          <p className="text-foreground font-semibold">Spieltag {label}</p>
          {gameName && (
            <p className="text-muted text-sm">
              {gameName}{goalHost != null && goalVisitor != null ? ` ${goalHost}:${goalVisitor}` : ''}
            </p>
          )}
          <p className="text-primary">{data.punkte} Punkte</p>
          {rules && rules.length > 0 && (
            <>
              <hr className="border-border my-2" />
              {rules.map((rule, idx) => (
                <p key={idx} className="text-muted text-sm">
                  {rule.count}x {rule.ruleLabel} ({rule.points})
                </p>
              ))}
            </>
          )}
        </div>
      )
    }
    return null
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const handleGameSort = (key: GameSortKey) => {
    if (gameSortKey === key) {
      setGameSortOrder(gameSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setGameSortKey(key)
      setGameSortOrder('asc')
    }
  }

  const gamePointsRows = useMemo(() => {
    return buildGamePointsRows(playerRanks).sort((a, b) => {
      let comparison = 0
      switch (gameSortKey) {
        case 'roundNumber':
          comparison = a.roundNumber - b.roundNumber
          break
        case 'gameName':
          comparison = (isMobile ? a.opponent : a.gameName).localeCompare(isMobile ? b.opponent : b.gameName)
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
  }, [playerRanks, gameSortKey, gameSortOrder, isMobile])

  const mobileManagers = useMemo(() => {
    if (!player?.managers) return []
    return [...player.managers].sort((a, b) => (a.positionTotal ?? 999) - (b.positionTotal ?? 999))
  }, [player?.managers])

  const filteredAndSortedManagers = useMemo(() => {
    if (!player?.managers) return []
    
    let list = [...player.managers]
    
    if (managerFilter.trim()) {
      const filter = managerFilter.toLowerCase()
      list = list.filter(m =>
        (m.shortName || m.name || '').toLowerCase().includes(filter) ||
        (m.firstName || '').toLowerCase().includes(filter) ||
        (m.lastName || '').toLowerCase().includes(filter)
      )
    }
    
    return list.sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'shortName':
          comparison = (a.shortName || '').localeCompare(b.shortName || '')
          break
        case 'firstName':
          comparison = (a.firstName || '').localeCompare(b.firstName || '')
          break
        case 'lastName':
          comparison = (a.lastName || '').localeCompare(b.lastName || '')
          break
        case 'positionTotal':
          comparison = (a.positionTotal || 999) - (b.positionTotal || 999)
          break
        case 'positionChange':
          comparison = (a.positionChange || 0) - (b.positionChange || 0)
          break
        case 'pointsTotal':
          comparison = (b.pointsTotal || 0) - (a.pointsTotal || 0)
          break
        case 'pointsLastRound':
          comparison = (b.pointsLastRound || 0) - (a.pointsLastRound || 0)
          break
        case 'hinrunde':
          comparison = (a.hinrunde ? 1 : 0) - (b.hinrunde ? 1 : 0)
          break
        case 'rueckrunde':
          comparison = (a.rueckrunde ? 1 : 0) - (b.rueckrunde ? 1 : 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [player?.managers, sortKey, sortOrder, managerFilter])

  if (isLoading) {
    return (
      <div className="max-w-6xl" aria-busy="true">
        <BackButton to="/players" className="mb-4" />
        <div className="p-4 bg-elevated border border-border rounded-card mb-6">
          <div className="flex gap-6">
            <div className="w-16 h-16 rounded-full bg-card-muted animate-pulse motion-reduce:animate-none shrink-0" />
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
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
          <div className="h-5 w-32 rounded-control bg-card-muted animate-pulse motion-reduce:animate-none mb-4" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-10 w-full rounded-control bg-card-muted animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-6xl">
        <BackButton to="/players" className="mb-4" />
        <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-card">
          <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
          <p className="text-danger text-sm">Fehler beim Laden des Spielers.</p>
        </div>
      </div>
    )
  }
  if (!player) {
    return (
      <div className="max-w-6xl">
        <BackButton to="/players" className="mb-4" />
        <div className="flex items-center gap-3 p-3 bg-info-bg border border-info/30 rounded-card">
          <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0" />
          <p className="text-sm text-foreground">Spieler nicht gefunden.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <BackButton to="/players" className="mb-4" />

      <div className={`${isMobile ? 'px-3 py-0.5 bg-surface mb-0' : 'p-4 bg-elevated mb-6'} border border-border rounded-card`}>
        <div className="flex items-center gap-4">
          {!isMobile && (
            player.pictureUrl ? (
              <img src={player.pictureUrl} alt={player.nameKicker} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold">{POSITION_LABELS[player.position]}</span>
              </div>
            )
          )}

          <div className="flex-1 min-w-0">
            {!stammdatenOpen && isMobile && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base font-semibold text-foreground truncate">{player.nameKicker}</span>
                  <span className="text-xs text-muted shrink-0">·</span>
                  <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded-badge shrink-0`}>{POSITION_SHORT_LABELS[player.position]}</span>
                  <span className="text-xs text-muted shrink-0">·</span>
                  <span className="text-xs text-muted shrink-0">{player.prize ? formatPrice(player.prize) : '—'}</span>
                  {player.teams.length > 0 && (
                    <span className="text-xs text-muted shrink-0">
                      {`· ${player.teams.map(t => t.shortName ?? t.name).join(', ')}`}
                      {player.aktiv === false && ' · Inaktiv'}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted leading-relaxed">
                  <ScoreLine
                    position={player.positionLastRound ?? null}
                    positionVorher={null}
                    punkte={player.pointsLastRound ?? null}
                    punkteVorher={null}
                    einsatzquote={player.einsatzquote ?? null}
                  />
                </div>
              </div>
            )}

            {!stammdatenOpen && !isMobile && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <div className="min-w-0">
                  <h2 className="text-3xl font-bold text-foreground truncate">
                    {player.firstName || player.lastName
                      ? `${player.firstName} ${player.lastName}`.trim()
                      : player.nameKicker}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded-badge`}>
                      {positionLabels[player.position]}
                    </span>
                    <p className="text-xs uppercase tracking-wide text-subtle">
                      {[player.prize ? formatPrice(player.prize) : null,
                        player.teams.length > 0 ? player.teams.map(t => t.name).join(', ') : null,
                        player.aktiv === false ? 'Inaktiv' : null
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                {player.teams.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    {player.teams.map((team) => (
                      <RouterLink key={team.id} to={`/teams/${team.id}`}>
                        <img
                          src={team.logoXxlUrl || team.logoSUrl}
                          alt={team.name}
                          className="w-12 h-12 object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </RouterLink>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-4">
                  <div className="bg-card rounded-card border border-border px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle">Punkte gesamt</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {player.points != null ? player.points : '—'}
                      </span>
                      {player.pointsLastRound != null && player.pointsLastRound > 0 && (
                        <Badge variant="success">+{player.pointsLastRound}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="bg-card rounded-card border border-border px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle">Position gesamt</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {player.positionTotal ? `${player.positionTotal}.` : '—'}
                      </span>
                      {player.positionChange != null && player.positionChange !== 0 && (
                        <Badge variant={player.positionChange > 0 ? 'success' : 'danger'}>
                          {player.positionChange > 0 ? `+${player.positionChange}` : `-${Math.abs(player.positionChange)}`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="bg-card rounded-card border border-border px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle">Einsatzquote</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {player.einsatzquote != null ? `${player.einsatzquote} %` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {stammdatenOpen && (
              <div id="stammdaten-form">
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
                    <span className="text-xs text-muted">Kicker-Name</span>
                    <input
                      type="text"
                      value={editData.nameKicker}
                      onChange={(e) => setEditData({ ...editData, nameKicker: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted">Kicker-ID</span>
                    <input
                      type="text"
                      value={player.kickerId || ''}
                      readOnly
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted">Position <span className="text-muted">*</span></span>
                    <select
                      value={editData.position}
                      onChange={(e) => setEditData({ ...editData, position: e.target.value as Position })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1 cursor-pointer"
                    >
                      <option value="GOALKEEPER">Torwart</option>
                      <option value="DEFENDER">Verteidiger</option>
                      <option value="MIDFIELD">Mittelfeld</option>
                      <option value="STRIKER">Stürmer</option>
                    </select>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted cursor-help" title="Aktiv: aktueller Bundesliga-Spieler · Inaktiv: Spieler hat die Bundesliga verlassen">Aktiv</span>
                    <select
                      value={editData.aktiv ? 'true' : 'false'}
                      onChange={(e) => setEditData({ ...editData, aktiv: e.target.value === 'true' })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1 cursor-pointer"
                    >
                      <option value="true">Ja</option>
                      <option value="false">Nein</option>
                    </select>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted">Marktwert</span>
                    <input
                      type="text"
                      value={formatCurrency(editData.prize)}
                      onChange={(e) => setEditData({ ...editData, prize: parseCurrency(e.target.value) })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                      placeholder="0 €"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted">Alternativname 1</span>
                    <input
                      type="text"
                      value={editData.nameKickerAlt1}
                      onChange={(e) => setEditData({ ...editData, nameKickerAlt1: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted">Alternativname 2</span>
                    <input
                      type="text"
                      value={editData.nameKickerAlt2}
                      onChange={(e) => setEditData({ ...editData, nameKickerAlt2: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted">Alternativname 3</span>
                    <input
                      type="text"
                      value={editData.nameKickerAlt3}
                      onChange={(e) => setEditData({ ...editData, nameKickerAlt3: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                  <div className="col-span-3 min-w-0">
                    <span className="text-xs text-muted">Bild-URL</span>
                    <input
                      type="text"
                      value={editData.pictureUrl}
                      onChange={(e) => setEditData({ ...editData, pictureUrl: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
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
                      onClick={() => {
                        setEditData({
                          nameKicker: player.nameKicker,
                          nameKickerAlt1: player.nameKickerAlt1 || '',
                          nameKickerAlt2: player.nameKickerAlt2 || '',
                          nameKickerAlt3: player.nameKickerAlt3 || '',
                          firstName: player.firstName || '',
                          lastName: player.lastName || '',
                          prize: player.prize,
                          pictureUrl: player.pictureUrl || '',
                          position: player.position,
                          aktiv: player.aktiv ?? true
                        })
                        setStammdatenOpen(false)
                      }}
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
              aria-controls="stammdaten-form"
              className="shrink-0 self-start"
            >
              <i className={`sap-icon sap-icon-slim-arrow-${stammdatenOpen ? 'up' : 'down'} text-xs mr-1`} />
              {stammdatenOpen ? 'Schließen' : 'Bearbeiten'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col">
      {chartData.length > 0 && (
        <div className={`hidden md:block order-3 md:order-3 px-3 py-4 md:p-6 bg-surface border border-border rounded-card ${isMobile ? 'mb-0' : 'mb-6'}`}>
          <h3 className="text-xl font-semibold text-foreground mb-3">Punkte pro Spieltag</h3>
          <div className="bg-card p-4 rounded-card border border-border">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="name" stroke={chartColors.axis} />
                <YAxis stroke={chartColors.axis} />
                <Tooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                <Bar dataKey="punkte" fill={chartColors.accent} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {gamePointsRows.length > 0 && (
        <div className={`order-1 md:order-1 px-3 py-4 md:p-6 bg-surface border border-border rounded-card ${isMobile ? 'mb-0' : 'mb-6'}`}>
          <h3 className="text-base md:text-xl font-semibold text-foreground mb-4">Punkte</h3>
          {!isMobile && (
            <div className="overflow-x-auto rounded-card border border-border">
              <TableContent>
                <table className="w-full">
                  <TableHead>
                    <tr>
                      <ThSortable align="center" onClick={() => handleGameSort('roundNumber')}>
                        Spieltag<SortIcon column="roundNumber" activeKey={gameSortKey} order={gameSortOrder} />
                      </ThSortable>
                      <ThSortable align="left" onClick={() => handleGameSort('gameName')}>
                        Spiel<SortIcon column="gameName" activeKey={gameSortKey} order={gameSortOrder} />
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
                      <tr key={`${row.roundNumber}-${row.ruleLabel}-${index}`} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                        <td className="px-3 py-2 text-center text-muted tabular-nums">
                          {row.roundNumber}
                        </td>
                        <td className="px-3 py-2 text-foreground">
                          <span className="font-medium">{row.gameName}</span>
                          {row.goalHost != null && row.goalVisitor != null && (
                            <span className="text-subtle"> ({row.goalHost}:{row.goalVisitor})</span>
                          )}
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
              </TableContent>
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
                    <th align="center" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">SP.</th>
                    <th align="left" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">Spiel</th>
                    <th align="left" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">Regel</th>
                    <th align="center" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">PKT.</th>
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {gamePointsRows.map((row, index) => (
                    <tr key={`${row.roundNumber}-${row.ruleLabel}-${index}`} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                      <td className="px-2 py-2 border-b border-border overflow-hidden tabular-nums text-center font-medium text-foreground">
                        {row.roundNumber}
                      </td>
                      <td className="px-2 py-2 border-b border-border overflow-hidden min-w-0">
                        <span className="font-medium truncate block min-w-0" title={row.opponent || row.gameName}>
                          {row.opponent || row.gameName}
                        </span>
                        {row.goalsOwn != null && row.goalsOpponent != null && (
                          <span className="text-subtle"> ({row.goalsOwn}:{row.goalsOpponent})</span>
                        )}
                        {row.homeAway && (
                          <span className="text-subtle"> {row.homeAway}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 border-b border-border overflow-hidden min-w-0 text-muted">
                        {shortRuleLabel(row.rule)}{row.count > 1 ? ` (${row.count}x)` : ''}
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

      {player.managers && player.managers.length > 0 && (
        <div className={`order-2 md:order-2 px-3 py-4 md:p-6 bg-surface border border-border rounded-card ${isMobile ? 'mb-0' : 'mb-6'}`}>
          {!isMobile && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-xl font-semibold text-foreground">Manager</h3>
              <input
                type="text"
                placeholder="Manager suchen..."
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="input-field control w-64 px-3 py-2 rounded-control text-sm focus:outline-none"
              />
            </div>
          )}

          {!isMobile && (
            <div className="overflow-x-auto rounded-card border border-border">
              <TableContent>
                <table className="w-full">
                  <TableHead>
                    <tr>
                      <ThSortable align="center" onClick={() => handleSort('positionTotal')}>
                        Pos<SortIcon column="positionTotal" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="center" onClick={() => handleSort('positionChange')}>
                        +-<SortIcon column="positionChange" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="left" onClick={() => handleSort('shortName')}>
                        Manager<SortIcon column="shortName" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="left" onClick={() => handleSort('firstName')}>
                        Vorname<SortIcon column="firstName" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="left" onClick={() => handleSort('lastName')}>
                        Nachname<SortIcon column="lastName" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="center" onClick={() => handleSort('pointsTotal')}>
                        Punkte<SortIcon column="pointsTotal" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="center" onClick={() => handleSort('pointsLastRound')}>
                        {player?.season?.currentMatchday ? `${player.season.currentMatchday}. Spieltag` : 'Spieltag'}<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="center" onClick={() => handleSort('hinrunde')}>
                        Hinrunde<SortIcon column="hinrunde" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="center" onClick={() => handleSort('rueckrunde')}>
                        Rückrunde<SortIcon column="rueckrunde" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {filteredAndSortedManagers.length > 0 ? (
                      filteredAndSortedManagers.map((manager, index) => (
                        <tr key={manager.id} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                          <td className="px-3 py-2 text-center text-foreground">
                            {manager.positionTotal ? `${manager.positionTotal}.` : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {manager.positionChange != null && manager.positionChange !== 0 ? (
                              <span className={`${manager.positionChange > 0 ? 'text-success' : 'text-danger'}`}>
                                {manager.positionChange > 0 ? `↑${manager.positionChange}` : `↓${Math.abs(manager.positionChange)}`}
                              </span>
                            ) : (
                              <span className="text-subtle">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <RouterLink to={`/managers/${manager.id}`} className="link font-medium">
                              {manager.shortName || manager.name || '-'}
                            </RouterLink>
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {manager.firstName || '-'}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {manager.lastName || '-'}
                          </td>
                          <td className="px-3 py-2 text-center text-foreground">
                            {manager.pointsTotal ?? '-'}
                          </td>
                          <td className="px-3 py-2 text-center text-muted">
                            {manager.pointsLastRound ?? '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {manager.hinrunde ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-badge chip-accent">Hin</span>
                            ) : (
                              <span className="text-subtle">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {manager.rueckrunde ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-badge chip-success">Rück</span>
                            ) : (
                              <span className="text-subtle">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="text-center text-subtle py-8">
                          Keine Manager gefunden
                        </td>
                      </tr>
                    )}
                  </TableBody>
                </table>
              </TableContent>
            </div>
          )}

          {isMobile && (
            <>
              <h3 className="text-base font-semibold text-foreground mb-4">Manager</h3>
              <div className="overflow-x-auto rounded-card w-full" style={{ touchAction: 'pan-y' }}>
              <table className="w-full border-collapse text-sm table-fixed">
                <colgroup>
                  <col className="w-9" />
                  <col className="w-auto" />
                  <col className="w-auto" />
                  <col className="w-9" />
                  <col className="w-9" />
                </colgroup>
                <thead className="bg-elevated sticky top-0">
                  <tr>
                    <th colSpan={3} align="left" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">
                      {player?.season?.currentMatchday ? `${player.season.currentMatchday}. Spieltag` : 'Spieltag'}
                    </th>
                    <th colSpan={2} align="center" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">
                      Punkte
                    </th>
                  </tr>
                  <tr>
                    <th align="center" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">POS</th>
                    <th align="left" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">Manager</th>
                    <th align="left" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">Name</th>
                    <th align="center" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">GES.</th>
                    <th align="center" className="px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap">Sp.</th>
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {mobileManagers.map((m, index) => (
                    <tr key={m.id} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                      <td className="px-2 py-2 border-b border-border overflow-hidden tabular-nums text-center font-medium text-foreground">
                        {m.positionTotal ? `${m.positionTotal}.` : '-'}
                      </td>
                      <td className="px-2 py-2 border-b border-border overflow-hidden tabular-nums min-w-0">
                        <RouterLink to={`/managers/${m.id}`} className="link font-medium truncate block min-w-0" title={m.shortName ?? m.name}>
                          {managerLogin(m)}
                        </RouterLink>
                      </td>
                      <td className="px-2 py-2 border-b border-border overflow-hidden tabular-nums min-w-0">
                        <span className="text-foreground truncate block min-w-0" title={managerFullName(m)}>
                          {managerFullName(m)}
                        </span>
                      </td>
                      <td className="px-2 py-2 border-b border-border overflow-hidden tabular-nums text-center font-bold text-foreground">
                        {m.pointsTotal ?? '-'}
                      </td>
                      <td className="px-2 py-2 border-b border-border overflow-hidden tabular-nums text-center text-muted">
                        {m.pointsLastRound ?? '-'}
                      </td>
                    </tr>
                  ))}
                  {mobileManagers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-subtle py-8">Keine Manager gefunden</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}
      </div>

      <div className="h-10" />
    </div>
  )
}
