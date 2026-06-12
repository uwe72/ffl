import { useState, useMemo, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users } from 'lucide-react'
import { usePlayer, useUpdatePlayer, usePlayerRanks } from '../hooks/usePlayers'
import { useAuth } from '../context/AuthContext'
import { positionLabels } from './Players'
import Badge from '../components/Badge'
import type { Position } from '../types'

type SortKey = 'positionTotal' | 'positionChange' | 'shortName' | 'pointsTotal' | 'pointsLastRound' | 'firstName' | 'lastName' | 'teamValue' | 'hinrunde' | 'rueckrunde'
type SortOrder = 'asc' | 'desc'

const paymentStateLabels = {
  PAID: 'Bezahlt',
  NOT_PAID: 'Nicht bezahlt'
}

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: player, isLoading, error } = usePlayer(Number(id))
  const { data: playerRanks } = usePlayerRanks(Number(id))
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
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
          <p className="text-accent">{data.punkte} Punkte</p>
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
      <RouterLink to="/players" className="text-accent hover:text-accent-hover mb-4 inline-block link">
        &larr; Zurück zur Übersicht
      </RouterLink>
      
      <div className="p-6 mt-4 bg-surface border border-border">
        <div className="flex items-start gap-6">
          <img src={player.pictureUrl || ''} alt={player.nameKicker} className="w-32 h-32 rounded-full object-cover" />
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <Users size={28} className="text-accent mt-1" />
              <div>
                <h1 className="text-sm font-medium text-accent">{player.nameKicker}</h1>
                {player.firstName && player.lastName && (
                  <p className="text-lg text-muted mt-1">
                    {player.firstName} {player.lastName}
                  </p>
                )}
                <div className="mt-1.5">
                  <Badge>{positionLabels[player.position]}</Badge>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
                {player.teams.map((team) => (
                  <RouterLink 
                    key={team.id}
                    to={`/teams/${team.id}`}
                  >
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded cursor-pointer bg-elevated text-foreground hover:bg-default"
                    >
                      <span className="flex items-center gap-1">
                        {team.logoSUrl && (
                          <img 
                            src={team.logoSUrl} 
                            alt={team.name}
                            className="w-5 h-5 object-contain"
                          />
                        )}
                        {team.name}
                      </span>
                    </span>
                  </RouterLink>
                ))}
              </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <div className="p-4 bg-elevated border border-border-hover">
            <p className="text-sm text-muted">Gesamtposition</p>
            <p className="text-2xl font-bold text-foreground min-h-[42px] flex items-center">{player.positionTotal ? `${player.positionTotal}.` : '-'}</p>
          </div>
          <div className="p-4 bg-elevated border border-border-hover">
            <p className="text-sm text-muted">Punkte (Saison)</p>
            <p className="text-2xl font-bold text-foreground min-h-[42px] flex items-center">{player.points ?? '-'}</p>
          </div>
          <div className="p-4 bg-elevated border border-border-hover">
            <p className="text-sm text-muted">Punkte (Spieltag)</p>
            <p className="text-2xl font-bold text-foreground min-h-[42px] flex items-center">{player.pointsLastRound ?? '-'}</p>
          </div>
          <div className="p-4 bg-elevated border border-border-hover">
            <p className="text-sm text-muted">Position</p>
            {isAdmin ? (
              <select
                value={editData.position}
                onChange={(e) => setEditData({ ...editData, position: e.target.value as Position })}
                className="w-36 bg-surface border border-border-hover text-foreground rounded-lg px-3 min-h-[42px] focus:outline-none focus:border-accent"
              >
                <option value="GOALKEEPER">Torwart</option>
                <option value="DEFENDER">Abwehr</option>
                <option value="MIDFIELD">Mittelfeld</option>
                <option value="STRIKER">Sturm</option>
              </select>
            ) : (
              <p className="text-2xl font-bold text-foreground min-h-[42px] flex items-center">{positionLabels[player.position]}</p>
            )}
          </div>
          {isAdmin && (
            <div className="p-4 bg-elevated border border-border-hover">
              <p className="text-sm text-muted">Marktwert</p>
              <input
                type="text"
                value={formatCurrency(editData.prize)}
                onChange={(e) => setEditData({ ...editData, prize: parseCurrency(e.target.value) })}
                className="input-field w-36 px-3 py-2 rounded focus:outline-none"
                placeholder="0 €"
              />
            </div>
          )}
          {isAdmin && (
            <div className="p-4 bg-elevated border border-border-hover flex-1 min-w-[300px]">
              <p className="text-sm text-muted">Bild-URL</p>
              <input
                type="text"
                value={editData.pictureUrl}
                onChange={(e) => setEditData({ ...editData, pictureUrl: e.target.value })}
                className="input-field w-full px-3 py-2 rounded focus:outline-none"
              />
            </div>
          )}
          {isAdmin && hasChanges && (
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-primary text-[#1b2838] hover:bg-button-primary-hover min-h-[42px] px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
          )}
        </div>

        {chartData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Punkte pro Spieltag</h2>
            <div className="bg-surface p-4 rounded-lg border border-border">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
                  <XAxis dataKey="name" stroke="#bfccd8" />
                  <YAxis stroke="#bfccd8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="punkte" fill="#4db5ff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {player.managers && player.managers.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Manager mit diesem Spieler ({player.managers.length})
            </h2>
            <div className="p-4 bg-elevated border border-border-hover">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface">
                    <tr>
                      <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('positionTotal')}>
                        Pos<SortIcon column="positionTotal" />
                      </th>
                      <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('positionChange')}>
                        +-<SortIcon column="positionChange" />
                      </th>
                      <th className="px-3 py-2 text-left text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('shortName')}>
                        Manager<SortIcon column="shortName" />
                      </th>
                      <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('pointsTotal')}>
                        Pkt<SortIcon column="pointsTotal" />
                      </th>
                      <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('pointsLastRound')}>
                        Spieltag<SortIcon column="pointsLastRound" />
                      </th>
                      <th className="px-3 py-2 text-left text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('firstName')}>
                        Vorname<SortIcon column="firstName" />
                      </th>
                      <th className="px-3 py-2 text-left text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('lastName')}>
                        Nachname<SortIcon column="lastName" />
                      </th>
                      {isAdmin && <th className="px-3 py-2 text-left text-muted font-medium border-b border-border">Status</th>}
                      <th className="px-3 py-2 text-right text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('teamValue')}>
                        Teamwert<SortIcon column="teamValue" />
                      </th>
                      <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('hinrunde')}>
                        Hinrunde<SortIcon column="hinrunde" />
                      </th>
                      <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('rueckrunde')}>
                        Rückrunde<SortIcon column="rueckrunde" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface">
                    {sortedManagers.map((manager) => (
                      <tr key={manager.id} className="hover:bg-surface border-b border-border">
                        <td className="px-3 py-2 text-center font-medium text-foreground">
                          {manager.positionTotal ? `${manager.positionTotal}.` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {manager.positionChange != null && manager.positionChange !== 0 ? (
                            <span className={`font-medium ${manager.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {manager.positionChange > 0 ? `↑${manager.positionChange}` : `↓${Math.abs(manager.positionChange)}`}
                            </span>
                          ) : (
                            <span className="text-subtle">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-accent">
                          <RouterLink to={`/managers/${manager.id}`} className="hover:text-foreground link font-medium">
                            {manager.shortName || manager.name || '-'}
                          </RouterLink>
                        </td>
                        <td className="px-3 py-2 text-center font-medium text-foreground">
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
                        <td className="px-3 py-2 text-right font-medium text-foreground">
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
