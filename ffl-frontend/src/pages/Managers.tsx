import { useState, useMemo, useRef, useEffect, forwardRef } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useManagers, useCurrentManager } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useAuth } from '../context/AuthContext'
import { trackEvent } from '../hooks/useMatomo'
import Button from '../components/Button'
import SortIcon from '../components/SortIcon'
import { TableHead, ThSortable, TableBody, TableRow } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'

type SortKey = 'shortName' | 'firstName' | 'lastName' | 'teamValue' | 'positionTotal' | 'positionChange' | 'pointsTotal' | 'pointsLastRound'

const ManagerCard = forwardRef<HTMLDivElement, { manager: any; beforeSeason: boolean; beforeSeasonNonAdmin: boolean; active?: boolean }>(
  function ManagerCard({ manager, beforeSeason, beforeSeasonNonAdmin, active = false }, ref) {
  const fullName = [manager.firstName, manager.lastName].filter(Boolean).join(' ') || manager.shortName || manager.name || '-'
  return (
    <div ref={ref} className={`group relative overflow-hidden bg-surface border rounded-none p-3 pl-4 transition-colors hover:border-border-hover ${active ? 'border-accent bg-accent-muted' : 'border-border'}`}>
      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />
      <div className="flex-1 min-w-0">
        {beforeSeasonNonAdmin ? (
          <p className="text-base font-semibold text-foreground leading-6 truncate">
            {fullName}
          </p>
        ) : (
          <RouterLink to={`/managers/${manager.id}`} className="link text-base font-semibold leading-6 truncate block">
            {fullName}
          </RouterLink>
        )}
        {manager.login && (
          <p className="text-sm text-muted leading-5 truncate">{manager.login}</p>
        )}
        {!beforeSeason && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 bg-stat-card border border-border rounded-card px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Platz</span>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Gesamt</span>
                <span className="font-bold tabular-nums text-foreground">{manager.positionTotal ? `${manager.positionTotal}.` : '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Spieltag</span>
                <span className="font-bold tabular-nums text-foreground">{manager.positionLastRound ? `${manager.positionLastRound}.` : '-'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 bg-stat-card border border-border rounded-card px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Punkte</span>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Gesamt</span>
                <span className="font-bold tabular-nums text-foreground">{manager.pointsTotal ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Spieltag</span>
                <span className="font-bold tabular-nums text-foreground">{manager.pointsLastRound ?? '-'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default function Managers() {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const { data: currentSeason } = useCurrentSeason()
  const beforeSeason = currentSeason?.seasonState === 'BEFORE_SEASON'
  const beforeSeasonNonAdmin = beforeSeason && user?.role !== 'ADMIN'
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState(false)

  const { data: managers, isLoading, error } = useManagers()
  const { data: currentManager } = useCurrentManager()

  const isAdmin = user?.role === 'ADMIN'
  const uwe72 = useMemo(() => managers?.find(m => m.shortName === 'uwe72'), [managers])
  const myManagerId = isAdmin ? uwe72?.id : currentManager?.id

  const rowRef = useRef<HTMLTableRowElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

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
        'Manager': manager.shortName || '-',
        'Vorname': manager.firstName || '-',
        'Nachname': manager.lastName || '-',
      }
      if (!beforeSeason) {
        row['Pos.'] = manager.positionTotal ?? '-'
        row['+-'] = manager.positionChange != null && manager.positionChange !== 0
          ? (manager.positionChange > 0 ? `↑${manager.positionChange}` : `↓${Math.abs(manager.positionChange)}`)
          : '-'
        row['Pkt.'] = manager.pointsTotal ?? '-'
        row['Spieltag'] = manager.pointsLastRound ?? '-'
        row['Teamwert (Mio.)'] = manager.teamValue ? (manager.teamValue / 1000000).toFixed(2) : '0.00'
      }
      return row
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Manager')
    XLSX.writeFile(wb, 'manager-export.xlsx')
    trackEvent('manager', 'export_excel')
  }

  const hasActiveFilter = searchTerm !== ''

  const handleSelectMe = () => {
    if (selected) {
      setSelected(false)
      return
    }
    if (searchTerm !== '') setSearchTerm('')
    setSelected(true)
    trackEvent('manager', 'select_me')
  }

  useEffect(() => {
    if (!selected || myManagerId == null) return
    const el = isMobile ? cardRef.current : rowRef.current
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [selected, myManagerId, isMobile, searchTerm, filteredManagers])

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <div className="p-6 bg-surface border border-border rounded-card mb-6 w-fit max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-foreground">Manager ({filteredManagers.length})</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Manager suchen..."
                className="input-field control pl-8 pr-3 py-2 rounded-control text-sm w-full"
              />
            </div>
            {myManagerId != null && (
            <Button
              onClick={handleSelectMe}
              size="input"
              variant={selected ? 'emphasized' : 'secondary'}
            >
              <i className="sap-icon sap-icon-account text-[14px]" />
              Selektiere mich
            </Button>
            )}
            {!isMobile && (
            <Button
              onClick={exportToExcel}
              size="compact"
            >
              Excel Export
            </Button>
            )}
          </div>
        </div>

        {hasActiveFilter && (
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-control text-subtle hover:text-danger transition-colors"
              title="Filter zurücksetzen"
            >
              <i className="sap-icon sap-icon-decline text-[14px]" />
            </button>
          </div>
        )}

        {!isMobile && (
          <>
            <div className="overflow-x-auto rounded-card border border-border w-fit max-w-full">
              <table>
                <TableHead>
                  <tr>
                    {!beforeSeason && (
                    <ThSortable align="center" onClick={() => handleSort('positionTotal')}>
                      Pos<SortIcon column="positionTotal" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    )}
                    {!beforeSeason && (
                    <ThSortable align="center" onClick={() => handleSort('positionChange')}>
                      +-<SortIcon column="positionChange" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    )}
                    <ThSortable align="left" onClick={() => handleSort('shortName')}>
                      Manager<SortIcon column="shortName" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    {!beforeSeason && (
                    <ThSortable align="center" onClick={() => handleSort('pointsTotal')}>
                      Pkt<SortIcon column="pointsTotal" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    )}
                    {!beforeSeason && (
                    <ThSortable align="center" onClick={() => handleSort('pointsLastRound')}>
                      Spieltag<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    )}
                    <ThSortable align="left" onClick={() => handleSort('firstName')}>
                      Vorname<SortIcon column="firstName" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable align="left" onClick={() => handleSort('lastName')}>
                      Nachname<SortIcon column="lastName" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    {!beforeSeason && (
                    <ThSortable align="right" onClick={() => handleSort('teamValue')}>
                      Teamwert<SortIcon column="teamValue" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    )}
                  </tr>
                </TableHead>
                <TableBody>
                  {filteredManagers && filteredManagers.length > 0 ? (
                    filteredManagers.map((manager, index) => {
                      const isMe = selected && manager.id === myManagerId
                      return (
                      <TableRow
                        key={manager.id}
                        ref={isMe ? rowRef : undefined}
                        active={isMe}
                        className={index % 2 === 1 ? 'bg-zebra' : ''}
                      >
                        {!beforeSeason && (
                        <td className="px-3 py-2 text-center text-foreground">
                          {manager.positionTotal ? `${manager.positionTotal}.` : '-'}
                        </td>
                        )}
                        {!beforeSeason && (
                        <td className="px-3 py-2 text-center">
                          {manager.positionChange != null && manager.positionChange !== 0 ? (
                            <span className={`${manager.positionChange > 0 ? 'text-success' : 'text-danger'}`}>
                              {manager.positionChange > 0 ? `↑${manager.positionChange}` : `↓${Math.abs(manager.positionChange)}`}
                            </span>
                          ) : (
                            <span className="text-subtle">-</span>
                          )}
                        </td>
                        )}
                        <td className="px-3 py-2">
                          {beforeSeasonNonAdmin ? (
                            <span className="font-medium text-foreground">{manager.shortName || '-'}</span>
                          ) : (
                            <RouterLink to={`/managers/${manager.id}`} className="link font-medium">
                              {manager.shortName || '-'}
                            </RouterLink>
                          )}
                        </td>
                        {!beforeSeason && (
                        <td className="px-3 py-2 text-center text-foreground">
                          {manager.pointsTotal ?? '-'}
                        </td>
                        )}
                        {!beforeSeason && (
                        <td className="px-3 py-2 text-center text-muted">
                          {manager.pointsLastRound ?? '-'}
                        </td>
                        )}
                        <td className="px-3 py-2 text-muted">
                          {manager.firstName || '-'}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {manager.lastName || '-'}
                        </td>
                        {!beforeSeason && (
                        <td className="px-3 py-2 text-right text-foreground">
                          {manager.teamValue ? (manager.teamValue / 1000000).toFixed(2) : '0.00'} Mio.
                        </td>
                        )}
                      </TableRow>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={beforeSeason ? 3 : 8} className="text-center text-subtle py-8">
                        Keine Manager gefunden
                      </td>
                    </tr>
                  )}
                </TableBody>
              </table>
            </div>
            <div className="mt-4 text-sm text-subtle">
              {filteredManagers.length} von {managers?.length || 0} Managern
            </div>
          </>
        )}

        {isMobile && (
          <div>
            <div className="grid gap-4">
              {filteredManagers && filteredManagers.length > 0 ? (
                filteredManagers.map((manager) => {
                  const isMe = selected && manager.id === myManagerId
                  return (
                    <ManagerCard key={manager.id} ref={isMe ? cardRef : undefined} active={isMe} manager={manager} beforeSeason={beforeSeason} beforeSeasonNonAdmin={beforeSeasonNonAdmin} />
                  )
                })
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
      </div>
    </div>
  )
}
