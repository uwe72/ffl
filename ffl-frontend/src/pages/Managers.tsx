import { useState, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useManagers } from '../hooks/useManagers'
import { useAuth } from '../context/AuthContext'
import { trackEvent } from '../hooks/useMatomo'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import CardContainer from '../components/CardContainer'
import SortIcon from '../components/SortIcon'
import { TableContent, TableHead, ThSortable, Th, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'

const paymentStateLabels = {
  PAID: 'Bezahlt',
  NOT_PAID: 'Nicht bezahlt'
}

type SortKey = 'shortName' | 'firstName' | 'lastName' | 'teamValue' | 'positionTotal' | 'positionChange' | 'pointsTotal' | 'pointsLastRound'

function ManagerCard({ manager }: { manager: any }) {
  return (
    <div className="card p-4 bg-surface border border-border">
      <div className="flex gap-4 items-center">
        <div className="flex-1 min-w-0">
          <RouterLink to={`/managers/${manager.id}`} className="font-semibold text-primary hover:text-accent-hover link truncate block">
            {manager.shortName || '-'}
          </RouterLink>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-subtle">Pos: </span>
              <span className="font-medium text-foreground">
                {manager.positionTotal ? `${manager.positionTotal}.` : '-'}
              </span>
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
              <span className="font-medium text-foreground">
                {manager.teamValue ? (manager.teamValue / 1000000).toFixed(2) : '0.00'} Mio.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterBar({ searchTerm, setSearchTerm, onExport, hasFilter }: {
  searchTerm: string
  setSearchTerm: (s: string) => void
  onExport: () => void
  hasFilter: boolean
}) {
  const clearFilter = () => {
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
          placeholder="Manager suchen..."
          className="input-field pl-8 pr-3 py-1.5 text-xs w-full"
        />
      </div>

      <Button
        onClick={onExport}
        size="compact"
      >
        Excel Export
      </Button>

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

export default function Managers() {
  const isMobile = useIsMobile()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

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

  const hasActiveFilter = searchTerm !== ''

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <PageHeader icon="sap-icon-employee" title="Manager" />

      <CardContainer>
        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onExport={exportToExcel}
          hasFilter={hasActiveFilter}
        />

        {!isMobile && (
          <TableContent count={filteredManagers.length} total={managers?.length || 0} countLabel="Managern">
            <table className="w-full">
              <TableHead>
                <tr>
                  <ThSortable align="center" onClick={() => handleSort('positionTotal')}>
                    Pos<SortIcon column="positionTotal" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  <ThSortable align="center" onClick={() => handleSort('positionChange')}>
                    +-<SortIcon column="positionChange" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  <ThSortable onClick={() => handleSort('shortName')}>
                    Manager<SortIcon column="shortName" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  <ThSortable align="center" onClick={() => handleSort('pointsTotal')}>
                    Pkt<SortIcon column="pointsTotal" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  <ThSortable align="center" onClick={() => handleSort('pointsLastRound')}>
                    Spieltag<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  <ThSortable onClick={() => handleSort('firstName')}>
                    Vorname<SortIcon column="firstName" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  <ThSortable onClick={() => handleSort('lastName')}>
                    Nachname<SortIcon column="lastName" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                  {isAdmin && <Th>Status</Th>}
                  <ThSortable align="right" onClick={() => handleSort('teamValue')}>
                    Teamwert<SortIcon column="teamValue" activeKey={sortKey} order={sortOrder} />
                  </ThSortable>
                </tr>
              </TableHead>
              <TableBody>
                {filteredManagers && filteredManagers.length > 0 ? (
                  filteredManagers.map((manager) => (
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
                          {manager.shortName || '-'}
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
                            {paymentStateLabels[manager.paymentState as keyof typeof paymentStateLabels] || manager.paymentState}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-2 text-right text-foreground">
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
              </TableBody>
            </table>
          </TableContent>
        )}

        {isMobile && (
          <div className="flex-1 px-6 pb-6 overflow-x-auto">
            <div className="grid gap-4 mt-4">
              {filteredManagers && filteredManagers.length > 0 ? (
                filteredManagers.map((manager) => (
                  <ManagerCard key={manager.id} manager={manager} />
                ))
              ) : (
                <div className="text-center text-subtle py-8">
                  Keine Manager gefunden
                </div>
              )}
            </div>

            {filteredManagers && (
              <div className="mt-4 text-sm text-subtle">
                {filteredManagers.length} von {managers?.length || 0} Managern
              </div>
            )}
          </div>
        )}
      </CardContainer>
    </div>
  )
}
