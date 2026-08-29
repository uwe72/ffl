import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useSeasonHistory, useCreateSeasonHistory, useUpdateSeasonHistory, useDeleteSeasonHistory } from '../hooks/useSeasonHistory'
import Button from '../components/Button'
import SortIcon from '../components/SortIcon'
import { TableHead, ThSortable, Th, TableBody } from '../components/Table'
import { getChartColors } from '../utils/chartColors'
import type { SeasonHistory } from '../types'

const chartColors = getChartColors()

type SortKey = 'saison' | 'budget' | 'anzahlManager'
type SortOrder = 'asc' | 'desc'

function formatBudget(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

function parseBudgetInput(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0
}

function shortSaison(saison: string): string {
  const parts = saison.split('-')
  if (parts.length !== 2) return saison
  const short = (p: string) => p.slice(-2)
  return `${short(parts[0])}/${short(parts[1])}`
}

export default function History() {
  const { data: history, isLoading, error } = useSeasonHistory()
  const create = useCreateSeasonHistory()
  const update = useUpdateSeasonHistory()
  const remove = useDeleteSeasonHistory()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [sortKey, setSortKey] = useState<SortKey>('saison')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const [showAdd, setShowAdd] = useState(false)
  const [addDraft, setAddDraft] = useState({ saison: '', budget: '', anzahlManager: '' })

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState({ saison: '', budget: '', anzahlManager: '' })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const sortedHistory = useMemo(() => {
    if (!history) return []
    return [...history].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'saison':
          comparison = a.saison.localeCompare(b.saison)
          break
        case 'budget':
          comparison = a.budget - b.budget
          break
        case 'anzahlManager':
          comparison = a.anzahlManager - b.anzahlManager
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [history, sortKey, sortOrder])

  const chartData = useMemo(() => {
    if (!history) return []
    return [...history]
      .sort((a, b) => a.saison.localeCompare(b.saison))
      .map(h => ({ saison: h.saison, label: shortSaison(h.saison), anzahlManager: h.anzahlManager }))
  }, [history])

  const startEdit = (entry: SeasonHistory) => {
    setEditingId(entry.id)
    setEditDraft({
      saison: entry.saison,
      budget: String(entry.budget).replace('.', ','),
      anzahlManager: String(entry.anzahlManager),
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft({ saison: '', budget: '', anzahlManager: '' })
  }

  const saveEdit = async (id: number) => {
    if (!editDraft.saison.trim()) return
    await update.mutateAsync({
      id,
      data: {
        saison: editDraft.saison.trim(),
        budget: parseBudgetInput(editDraft.budget),
        anzahlManager: parseInt(editDraft.anzahlManager, 10) || 0,
      },
    })
    cancelEdit()
  }

  const startAdd = () => {
    setAddDraft({ saison: '', budget: '', anzahlManager: '' })
    setShowAdd(true)
  }

  const saveAdd = async () => {
    if (!addDraft.saison.trim()) return
    await create.mutateAsync({
      saison: addDraft.saison.trim(),
      budget: parseBudgetInput(addDraft.budget),
      anzahlManager: parseInt(addDraft.anzahlManager, 10) || 0,
    })
    setShowAdd(false)
    setAddDraft({ saison: '', budget: '', anzahlManager: '' })
  }

  const handleDelete = async (id: number, saison: string) => {
    if (!window.confirm(`Eintrag "${saison}" wirklich löschen?`)) return
    await remove.mutateAsync(id)
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Historie</h1>

      <div className="p-6 bg-surface border border-border rounded-card mb-6 w-fit max-w-full">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-xl font-semibold text-foreground">
            Saisons ({sortedHistory.length})
          </h2>
          {isAdmin && !showAdd && (
            <Button variant="secondary" size="input" onClick={startAdd}>
              + Zeile hinzufügen
            </Button>
          )}
        </div>

        {isAdmin && showAdd && (
          <div className="mb-4 p-4 bg-elevated border border-border rounded-card">
            <div className="grid gap-3 md:grid-cols-3 mb-3">
              <div>
                <label className="block text-sm text-muted mb-1">Saison</label>
                <input
                  value={addDraft.saison}
                  onChange={e => setAddDraft(d => ({ ...d, saison: e.target.value }))}
                  placeholder="z.B. 2026-2027"
                  className="input-field control w-full px-3 py-2 rounded-control text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Budget (€)</label>
                <input
                  value={addDraft.budget}
                  onChange={e => setAddDraft(d => ({ ...d, budget: e.target.value }))}
                  placeholder="z.B. 30"
                  className="input-field control w-full px-3 py-2 rounded-control text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Anzahl Manager</label>
                <input
                  value={addDraft.anzahlManager}
                  onChange={e => setAddDraft(d => ({ ...d, anzahlManager: e.target.value }))}
                  placeholder="z.B. 250"
                  className="input-field control w-full px-3 py-2 rounded-control text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="emphasized" onClick={saveAdd} disabled={create.isPending}>
                {create.isPending ? 'Wird gespeichert...' : 'Hinzufügen'}
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Abbrechen</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full">
            <TableHead>
              <tr>
                <ThSortable onClick={() => handleSort('saison')}>
                  Saison<SortIcon column="saison" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable numeric align="right" onClick={() => handleSort('budget')}>
                  Budget (€)<SortIcon column="budget" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable numeric align="right" onClick={() => handleSort('anzahlManager')}>
                  Anzahl Manager<SortIcon column="anzahlManager" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                {isAdmin && <Th> </Th>}
              </tr>
            </TableHead>
            <TableBody>
              {sortedHistory.length > 0 ? (
                sortedHistory.map(entry => (
                  <tr key={entry.id} className="border-b border-border hover:bg-card-hover">
                    {editingId === entry.id ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            value={editDraft.saison}
                            onChange={e => setEditDraft(d => ({ ...d, saison: e.target.value }))}
                            className="input-field control w-full px-2 py-1 rounded-control text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editDraft.budget}
                            onChange={e => setEditDraft(d => ({ ...d, budget: e.target.value }))}
                            className="input-field control w-full px-2 py-1 rounded-control text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editDraft.anzahlManager}
                            onChange={e => setEditDraft(d => ({ ...d, anzahlManager: e.target.value }))}
                            className="input-field control w-full px-2 py-1 rounded-control text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2 justify-end">
                            <Button variant="emphasized" size="sm" onClick={() => saveEdit(entry.id)} disabled={update.isPending}>
                              Speichern
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>Abbrechen</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 font-medium text-foreground">{entry.saison}</td>
                        <td className="px-3 py-2 text-right text-foreground tabular-nums">{formatBudget(entry.budget)} €</td>
                        <td className="px-3 py-2 text-right text-foreground tabular-nums">{entry.anzahlManager}</td>
                        {isAdmin && (
                          <td className="px-3 py-2">
                            <div className="flex gap-2 justify-end">
                              <Button variant="secondary" size="sm" onClick={() => startEdit(entry)}>Bearbeiten</Button>
                              <Button variant="negative" size="sm" onClick={() => handleDelete(entry.id, entry.saison)}>Löschen</Button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="text-center text-subtle py-8">
                    Keine Einträge vorhanden
                  </td>
                </tr>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="p-6 bg-surface border border-border rounded-card mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-3">Entwicklung der Anzahl Mitspieler</h3>
          <div className="bg-card p-4 rounded-card border border-border">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="label" stroke={chartColors.axis} tick={{ fontSize: 11, fill: chartColors.axis }} label={{ value: 'Saison', position: 'bottom', fill: chartColors.axis }} />
                <YAxis stroke={chartColors.axis} domain={[0, 'auto']} tickCount={10} />
                <Tooltip
                  cursor={false}
                  wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-surface border border-border rounded-card p-3 shadow-lg">
                          <p className="text-foreground font-semibold">Saison {label}</p>
                          <p className="text-primary">Manager: {payload[0].value}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line type="monotone" dataKey="anzahlManager" stroke={chartColors.accent} strokeWidth={2} dot={{ fill: chartColors.accent, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
