import { useState, useMemo, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { usePlayer, useUpdatePlayer, usePlayerRanks } from '../hooks/usePlayers'
import { useAuth } from '../context/AuthContext'
import { positionLabels } from './Players'
import Button from '../components/Button'
import SortIcon from '../components/SortIcon'
import StatTile from '../components/StatTile'
import { TableContent, TableHead, ThSortable, Th, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'
import { getChartColors } from '../utils/chartColors'
import type { Position } from '../types'

const chartColors = getChartColors()

type SortKey = 'positionTotal' | 'positionChange' | 'shortName' | 'pointsTotal' | 'pointsLastRound' | 'firstName' | 'lastName' | 'teamValue' | 'hinrunde' | 'rueckrunde'
type SortOrder = 'asc' | 'desc'

const paymentStateLabels = {
  PAID: 'Bezahlt',
  NOT_PAID: 'Nicht bezahlt'
}

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

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: player, isLoading, error } = usePlayer(Number(id))
  const { data: playerRanks } = usePlayerRanks(Number(id))
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const isMobile = useIsMobile()
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [editData, setEditData] = useState({
    nameKicker: '',
    nameKickerAlt1: '',
    nameKickerAlt2: '',
    nameKickerAlt3: '',
    firstName: '',
    lastName: '',
    prize: 0,
    pictureUrl: '',
    position: '' as Position
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
        position: player.position
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
    editData.position !== player.position
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
        case 'teamValue':
          comparison = (a.teamValue || 0) - (b.teamValue || 0)
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
        <RouterLink to="/players" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline mb-4">
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück zur Übersicht
        </RouterLink>
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
        <div className="p-6 bg-surface border border-border rounded-card mb-6">
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
        <RouterLink to="/players" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline mb-4">
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück zur Übersicht
        </RouterLink>
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
        <RouterLink to="/players" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline mb-4">
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück zur Übersicht
        </RouterLink>
        <div className="flex items-center gap-3 p-3 bg-elevated border border-border rounded-card">
          <i className="sap-icon sap-icon-information text-[18px] text-muted shrink-0" />
          <p className="text-sm text-muted">Spieler nicht gefunden.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <RouterLink to="/players" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Übersicht
      </RouterLink>

      <div className="p-4 bg-elevated border border-border rounded-card mb-6">
        <div className="flex items-start gap-4">
          {player.pictureUrl ? (
            <img src={player.pictureUrl} alt={player.nameKicker} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold">{POSITION_LABELS[player.position]}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {!stammdatenOpen && (
              <div>
                <h2 className="text-3xl font-bold text-foreground truncate">
                  {player.firstName || player.lastName
                    ? `${player.firstName} ${player.lastName}`.trim()
                    : player.nameKicker}
                </h2>
                <p className="text-xs uppercase tracking-wide text-subtle mt-2">
                  {positionLabels[player.position]}
                  {player.prize ? ` · ${formatPrice(player.prize)}` : ''}
                </p>
                {player.teams.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                    {player.teams.map((team) => (
                      <RouterLink
                        key={team.id}
                        to={`/teams/${team.id}`}
                        className="text-xs font-medium px-2 py-0.5 rounded-badge bg-card border border-border text-foreground hover:bg-default flex items-center gap-1"
                      >
                        {team.logoSUrl && (
                          <img src={team.logoSUrl} alt={team.name} className="w-4 h-4 object-contain" />
                        )}
                        {team.name}
                      </RouterLink>
                    ))}
                  </div>
                )}
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
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Wird gespeichert...' : 'Speichern'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
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
                          position: player.position
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

          {isAdmin && (
            <Button
              variant={stammdatenOpen ? 'ghost' : 'emphasized'}
              size="sm"
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

      <div className="p-6 bg-surface border border-border rounded-card mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-4">Spielerstatistik</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <StatTile
            label="Position (Saison)"
            value={player.positionTotal ? `${player.positionTotal}.` : undefined}
            state={player.positionTotal ? 'default' : 'empty'}
          />
          <StatTile
            label="Punkte (Saison)"
            value={player.points != null ? String(player.points) : undefined}
            state={player.points != null ? 'default' : 'empty'}
          />
          <StatTile
            label="Punkte (Spieltag)"
            value={player.pointsLastRound != null ? String(player.pointsLastRound) : undefined}
            state={player.pointsLastRound != null ? 'default' : 'empty'}
          />
          <StatTile
            label="Marktwert"
            value={player.prize ? formatPrice(player.prize) : undefined}
            state={player.prize ? 'default' : 'empty'}
          />
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="p-6 bg-surface border border-border rounded-card mb-6">
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

      {player.managers && player.managers.length > 0 && (
        <div className="p-6 bg-surface border border-border rounded-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Manager mit diesem Spieler ({player.managers.length})</h3>
            <input
              type="text"
              placeholder="Manager suchen..."
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="input-field control w-64 px-3 py-2 rounded-control text-sm focus:outline-none"
            />
          </div>

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
                      <ThSortable align="center" onClick={() => handleSort('pointsTotal')}>
                        Pkt<SortIcon column="pointsTotal" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="center" onClick={() => handleSort('pointsLastRound')}>
                        Spieltag<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="left" onClick={() => handleSort('firstName')}>
                        Vorname<SortIcon column="firstName" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      <ThSortable align="left" onClick={() => handleSort('lastName')}>
                        Nachname<SortIcon column="lastName" activeKey={sortKey} order={sortOrder} />
                      </ThSortable>
                      {isAdmin && <Th align="left">Status</Th>}
                      <ThSortable align="right" onClick={() => handleSort('teamValue')}>
                        Teamwert<SortIcon column="teamValue" activeKey={sortKey} order={sortOrder} />
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
                          <td className="px-3 py-2 text-center text-foreground">
                            {manager.pointsTotal ?? '-'}
                          </td>
                          <td className="px-3 py-2 text-center text-muted">
                            {manager.pointsLastRound ?? '-'}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {manager.firstName || '-'}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {manager.lastName || '-'}
                          </td>
                          {isAdmin && (
                            <td className="px-3 py-2">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-badge ${manager.paymentState === 'PAID' ? 'chip-success' : 'chip-danger'}`}
                              >
                                {paymentStateLabels[manager.paymentState as keyof typeof paymentStateLabels] || manager.paymentState || '-'}
                              </span>
                            </td>
                          )}
                          <td className="px-3 py-2 text-right text-foreground">
                            {manager.teamValue ? (manager.teamValue / 1000000).toFixed(2) : '0.00'} Mio.
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
                        <td colSpan={isAdmin ? 11 : 10} className="text-center text-subtle py-8">
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
            <div className="grid gap-4">
              {filteredAndSortedManagers.length > 0 ? (
                filteredAndSortedManagers.map((manager) => (
                  <div key={manager.id} className="card p-4 bg-card border border-border rounded-card">
                    <div className="flex items-center gap-3 mb-3">
                      <RouterLink to={`/managers/${manager.id}`} className="link font-semibold">
                        {manager.shortName || manager.name || '-'}
                      </RouterLink>
                      {isAdmin && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-badge ${manager.paymentState === 'PAID' ? 'chip-success' : 'chip-danger'}`}>
                          {paymentStateLabels[manager.paymentState as keyof typeof paymentStateLabels] || manager.paymentState || '-'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-subtle">Pos: </span>
                        <span className="font-medium text-foreground">{manager.positionTotal ? `${manager.positionTotal}.` : '-'}</span>
                      </div>
                      <div>
                        <span className="text-subtle">Pkt: </span>
                        <span className="font-medium text-foreground">{manager.pointsTotal ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-subtle">Spieltag: </span>
                        <span className="font-medium text-foreground">{manager.pointsLastRound ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-subtle">Teamwert: </span>
                        <span className="font-medium text-foreground">{manager.teamValue ? (manager.teamValue / 1000000).toFixed(2) : '0.00'} Mio.</span>
                      </div>
                      <div>
                        {manager.hinrunde ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-badge chip-accent">Hin</span>
                        ) : (
                          <span className="text-subtle text-xs">Hin: -</span>
                        )}
                      </div>
                      <div>
                        {manager.rueckrunde ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-badge chip-success">Rück</span>
                        ) : (
                          <span className="text-subtle text-xs">Rück: -</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-subtle py-8">Keine Manager gefunden</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
