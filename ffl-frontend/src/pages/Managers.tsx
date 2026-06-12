import { useState, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useManagers } from '../hooks/useManagers'
import { useAuth } from '../context/AuthContext'
import { trackEvent } from '../hooks/useMatomo'

const paymentStateLabels = {
  PAID: 'Bezahlt',
  NOT_PAID: 'Nicht bezahlt'
}

type SortKey = 'shortName' | 'firstName' | 'lastName' | 'teamValue' | 'positionTotal' | 'positionChange' | 'pointsTotal' | 'pointsLastRound'
type SortOrder = 'asc' | 'desc'

export default function Managers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const { data: managers, isLoading, error } = useManagers()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const filteredManagers = useMemo(() => {
    if (!managers) return []
    
    const filtered = managers.filter(manager => {
      return manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.shortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    })

    return filtered.sort((a, b) => {
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
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [managers, searchTerm, sortKey, sortOrder])

  const exportToExcel = () => {
    if (!filteredManagers || filteredManagers.length === 0) return

    const data = filteredManagers.map(manager => {
      const row: Record<string, string | number> = {
        'Pos.': manager.positionTotal ?? '-',
        '+-': manager.positionChange != null && manager.positionChange !== 0
          ? (manager.positionChange > 0 ? `↑${manager.positionChange}` : `↓${Math.abs(manager.positionChange)}`)
          : '-',
        'Manager': manager.shortName || '-',
        'Pkt.': manager.pointsTotal ?? '-',
        'Spieltag': manager.pointsLastRound ?? '-',
        'Vorname': manager.firstName || '-',
        'Nachname': manager.lastName || '-',
      }
      if (isAdmin) {
        row['Status'] = paymentStateLabels[manager.paymentState as keyof typeof paymentStateLabels] || manager.paymentState || '-'
      }
      row['Teamwert (Mio.)'] = manager.teamValue ? (manager.teamValue / 1000000).toFixed(2) : '0.00'
      return row
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Manager')
    XLSX.writeFile(wb, 'manager-export.xlsx')
    trackEvent('manager', 'export_excel')
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Manager</h1>

      <div className="p-4 bg-surface border border-border">
        <div className="mb-4 flex gap-4 items-center">
          <input
            type="text"
            placeholder="Manager suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full max-w-md px-3 py-2 rounded focus:outline-none bg-elevated border border-border-hover text-foreground"
          />
          <button
            onClick={exportToExcel}
            disabled={!filteredManagers || filteredManagers.length === 0}
            className="button-secondary px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Excel Export
          </button>
        </div>

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
              </tr>
            </thead>
            <tbody className="bg-surface">
              {filteredManagers && filteredManagers.length > 0 ? (
                filteredManagers.map((manager) => (
                  <tr key={manager.id} className="hover:bg-elevated border-b border-border">
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
                        {manager.shortName || '-'}
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
                          {paymentStateLabels[manager.paymentState as keyof typeof paymentStateLabels] || manager.paymentState}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2 text-right font-medium text-foreground">
                      {manager.teamValue ? (manager.teamValue / 1000000).toFixed(2) : '0.00'} Mio.
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center text-subtle py-8">
                    Keine Manager gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredManagers && (
          <div className="mt-4 text-sm text-subtle">
            {filteredManagers.length} von {managers?.length || 0} Managern
          </div>
        )}
      </div>
    </div>
  )
}
