import { useState, useMemo, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { usePlayer, useUpdatePlayer, usePlayerRanks } from '../hooks/usePlayers'
import { useAuth } from '../context/AuthContext'
import { positionLabels, positionColors } from './Players'
import Button from '../components/Button'
import type { Position } from '../types'

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

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: player, isLoading, error } = usePlayer(Number(id))
  const { data: playerRanks } = usePlayerRanks(Number(id))
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const isMobile = useIsMobile()
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [editData, setEditData] = useState({ prize: 0, pictureUrl: '', position: '' as Position })
  const [isSaving, setIsSaving] = useState(false)
  const updatePlayer = useUpdatePlayer()

  useEffect(() => {
    if (player) {
      setEditData({ prize: player.prize, pictureUrl: player.pictureUrl || '', position: player.position })
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
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
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

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const sortedManagers = useMemo(() => {
    if (!player?.managers) return []
    
    return [...player.managers].sort((a, b) => {
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
  }, [player?.managers, sortKey, sortOrder])

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>
  if (!player) return <div className="text-center py-8 text-subtle">Spieler nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/players" className="inline-flex items-center gap-1 text-sm text-[#c9a66b] hover:text-[#d4b77a] hover:underline mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Übersicht
      </RouterLink>
      <div className="bg-surface border border-border rounded-lg shadow-2xl flex flex-col">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] md:grid-rows-[auto_auto] gap-3 md:gap-x-6 md:gap-y-3">
            {player.pictureUrl ? (
              <img src={player.pictureUrl} alt={player.nameKicker} className="w-24 h-24 rounded-full object-cover flex-shrink-0 row-span-1 md:row-span-2 justify-self-center md:justify-self-start" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-elevated flex items-center justify-center flex-shrink-0 row-span-1 md:row-span-2 justify-self-center md:justify-self-start">
                <span className="text-3xl text-subtle">👤</span>
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{player.nameKicker}</h1>
              {player.firstName && player.lastName && (
                <span className="text-sm text-muted">({player.firstName} {player.lastName})</span>
              )}
              {player.teams.map((team) => (
                <RouterLink
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className="text-xs font-medium px-2 py-0.5 rounded bg-elevated text-foreground hover:bg-default flex items-center gap-1"
                >
                  {team.logoSUrl && (
                    <img src={team.logoSUrl} alt={team.name} className="w-4 h-4 object-contain" />
                  )}
                  {team.name}
                </RouterLink>
              ))}
              <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded`}>
                {positionLabels[player.position]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex md:items-start md:gap-2">
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-badge text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Position</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{player.positionTotal ? `${player.positionTotal}.` : '-'}</p>
                </div>
              </div>
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-horizontal-bar-chart text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Pkt. Saison</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{player.points ?? '-'}</p>
                </div>
              </div>
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-calendar text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Pkt. Spieltag</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{player.pointsLastRound ?? '-'}</p>
                </div>
              </div>
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-money-bills text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Preis</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{formatPrice(player.prize)}</p>
                </div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-4 p-4 bg-elevated border border-border rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-3">Administration</h3>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-xs text-subtle block mb-1">Position</label>
                  <select
                    value={editData.position}
                    onChange={(e) => setEditData({ ...editData, position: e.target.value as Position })}
                    className="input-field rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
                  >
                    <option value="GOALKEEPER">Torwart</option>
                    <option value="DEFENDER">Abwehr</option>
                    <option value="MIDFIELD">Mittelfeld</option>
                    <option value="STRIKER">Sturm</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-subtle block mb-1">Marktwert</label>
                  <input
                    type="text"
                    value={formatCurrency(editData.prize)}
                    onChange={(e) => setEditData({ ...editData, prize: parseCurrency(e.target.value) })}
                    className="input-field w-36 px-3 py-2 rounded focus:outline-none"
                    placeholder="0 €"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-subtle block mb-1">Bild-URL</label>
                  <input
                    type="text"
                    value={editData.pictureUrl}
                    onChange={(e) => setEditData({ ...editData, pictureUrl: e.target.value })}
                    className="input-field w-full px-3 py-2 rounded focus:outline-none"
                  />
                </div>
                {hasChanges && (
                  <Button
                    variant="emphasized"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Speichern...' : 'Speichern'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {chartData.length > 0 && (
          <div className="px-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">Punkte pro Spieltag</h2>
            <div className="bg-surface p-4 rounded-lg border border-border">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
                  <XAxis dataKey="name" stroke="#c5c5c5" />
                  <YAxis stroke="#c5c5c5" />
                  <Tooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                  <Bar dataKey="punkte" fill="#0a6ed1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {player.managers && player.managers.length > 0 && (
          <div className="px-6 pb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Manager mit diesem Spieler ({player.managers.length})
            </h2>

            {!isMobile && (
            <div className="rounded-lg border border-border">
              <table className="w-full">
                <thead className="bg-elevated sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border" onClick={() => handleSort('positionTotal')}>
                      Pos<SortIcon column="positionTotal" />
                    </th>
                    <th className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border" onClick={() => handleSort('positionChange')}>
                      +-<SortIcon column="positionChange" />
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border" onClick={() => handleSort('shortName')}>
                      Manager<SortIcon column="shortName" />
                    </th>
                    <th className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border" onClick={() => handleSort('pointsTotal')}>
                      Pkt<SortIcon column="pointsTotal" />
                    </th>
                    <th className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border" onClick={() => handleSort('pointsLastRound')}>
                      Spieltag<SortIcon column="pointsLastRound" />
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border" onClick={() => handleSort('firstName')}>
                      Vorname<SortIcon column="firstName" />
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border" onClick={() => handleSort('lastName')}>
                      Nachname<SortIcon column="lastName" />
                    </th>
                    {isAdmin && <th className="px-3 py-2 text-left text-xs text-muted font-bold border-b border-border">Status</th>}
                    <th className="px-3 py-2 text-right text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border" onClick={() => handleSort('teamValue')}>
                      Teamwert<SortIcon column="teamValue" />
                    </th>
                    <th className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border" onClick={() => handleSort('hinrunde')}>
                      Hinrunde<SortIcon column="hinrunde" />
                    </th>
                    <th className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border" onClick={() => handleSort('rueckrunde')}>
                      Rückrunde<SortIcon column="rueckrunde" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface text-sm">
                  {sortedManagers.map((manager) => (
                    <tr key={manager.id} className="border-b border-border hover:bg-card-hover">
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
                        <RouterLink to={`/managers/${manager.id}`} className="hover:text-accent-hover link text-primary">
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
                            className={`text-xs font-medium px-2 py-0.5 rounded ${manager.paymentState === 'PAID' ? 'chip-success' : 'chip-danger'}`}
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
                          <span className="text-xs font-medium px-2 py-0.5 rounded chip-accent">Hin</span>
                        ) : (
                          <span className="text-subtle">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {manager.rueckrunde ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded chip-success">Rück</span>
                        ) : (
                          <span className="text-subtle">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {isMobile && (
            <div className="grid gap-4">
              {sortedManagers.map((manager) => (
                <div key={manager.id} className="card p-4 bg-surface border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <RouterLink to={`/managers/${manager.id}`} className="hover:text-accent-hover link text-primary font-semibold">
                      {manager.shortName || manager.name || '-'}
                    </RouterLink>
                    {isAdmin && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${manager.paymentState === 'PAID' ? 'chip-success' : 'chip-danger'}`}>
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
                        <span className="text-xs font-medium px-2 py-0.5 rounded chip-accent">Hin</span>
                      ) : (
                        <span className="text-subtle text-xs">Hin: -</span>
                      )}
                    </div>
                    <div>
                      {manager.rueckrunde ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded chip-success">Rück</span>
                      ) : (
                        <span className="text-subtle text-xs">Rück: -</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}