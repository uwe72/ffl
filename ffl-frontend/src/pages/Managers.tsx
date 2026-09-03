import { useState, useMemo, useRef, useEffect } from 'react'
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

type SortKey = 'shortName' | 'firstName' | 'lastName' | 'teamValue' | 'positionTotal' | 'positionChange' | 'pointsTotal' | 'pointsLastRound' | 'einsatzquote'

export default function Managers({ fill = false, showEinsatzquote = false }: { fill?: boolean; showEinsatzquote?: boolean } = {}) {
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
        case 'einsatzquote':
          comparison = (a.einsatzquote ?? 0) - (b.einsatzquote ?? 0)
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
    const el = rowRef.current
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [selected, myManagerId, isMobile, searchTerm, filteredManagers])

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div className={fill ? 'flex-1 min-h-0 flex flex-col' : 'md:h-full md:flex md:flex-col md:min-h-0'}>
      <div className={`p-6 bg-surface border border-border rounded-card w-full md:w-fit max-w-full ${isMobile ? 'px-3 py-4' : ''}${fill ? ' flex-1 min-h-0 flex flex-col' : ' mb-6 md:mb-0 md:flex-1 md:min-h-0 md:flex md:flex-col'}`}>
        <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4${fill ? ' shrink-0' : ' md:shrink-0'}`}>
          <h2 className="text-xl font-semibold text-foreground">Manager ({filteredManagers.length})</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
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
              variant={selected ? 'secondary' : 'emphasized'}
            >
              <i className="sap-icon sap-icon-account text-[14px]" />
              Selektiere mich
            </Button>
            )}
            {!isMobile && (
            <Button
              onClick={exportToExcel}
              size="input"
              variant="secondary"
            >
              Excel Export
            </Button>
            )}
          </div>
        </div>

        {hasActiveFilter && (
          <div className={`flex items-center gap-3 flex-wrap mb-4${fill ? ' shrink-0' : ' md:shrink-0'}`}>
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
            <div className={`overflow-x-auto rounded-card border border-border w-fit max-w-full${fill ? ' flex-1 min-h-0 overflow-y-auto' : ' md:flex-1 md:min-h-0 md:overflow-auto'}`}>
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
                    <ThSortable align="left" onClick={() => handleSort('firstName')}>
                      Vorname<SortIcon column="firstName" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable align="left" onClick={() => handleSort('lastName')}>
                      Nachname<SortIcon column="lastName" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    {!beforeSeason && (
                    <ThSortable align="center" onClick={() => handleSort('pointsTotal')}>
                      Punkte<SortIcon column="pointsTotal" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    )}
                    {!beforeSeason && (
                    <ThSortable align="center" onClick={() => handleSort('pointsLastRound')}>
                      {currentSeason?.currentMatchday ? `${currentSeason.currentMatchday}. Spieltag` : 'Spieltag'}<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    )}
                    {!beforeSeason && showEinsatzquote && (
                    <ThSortable align="center" onClick={() => handleSort('einsatzquote')}>
                      Einsatzquote<SortIcon column="einsatzquote" activeKey={sortKey} order={sortOrder} />
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
                        <td className="px-3 py-2 text-muted">
                          {manager.firstName || '-'}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {manager.lastName || '-'}
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
                        {!beforeSeason && showEinsatzquote && (
                        <td className="px-3 py-2 text-center text-foreground tabular-nums">
                          {manager.einsatzquote != null ? `${manager.einsatzquote} %` : '-'}
                        </td>
                        )}
                      </TableRow>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={beforeSeason ? 3 : (showEinsatzquote ? 8 : 7)} className="text-center text-subtle py-8">
                        Keine Manager gefunden
                      </td>
                    </tr>
                  )}
                </TableBody>
              </table>
            </div>
          </>
        )}

        {isMobile && (
          <>
            <div className="rounded-card border border-border w-full overflow-hidden">
              <table className="w-full table-fixed">
                <colgroup>
                  {!beforeSeason && <col className="w-9" />}
                  {!beforeSeason && <col className="w-9" />}
                  <col className="w-auto" />
                  {!beforeSeason && <col className="w-8" />}
                  {!beforeSeason && <col className="w-9" />}
                </colgroup>
                <TableHead>
                  {!beforeSeason && (
                  <tr>
                    <th colSpan={3} align="left" className="px-2 py-2 h-[30px] text-[11px] font-semibold uppercase tracking-wide text-muted border-b border-border select-none">
                      {currentSeason?.currentMatchday ? `${currentSeason.currentMatchday}. Spieltag` : ''}
                    </th>
                    <th colSpan={2} align="center" className="px-2 py-2 h-[30px] text-[11px] font-semibold uppercase tracking-wide text-muted border-b border-border select-none">
                      Punkte
                    </th>
                  </tr>
                  )}
                  <tr>
                    {!beforeSeason && (
                    <th align="center" onClick={() => handleSort('positionTotal')} className="px-2 py-2 h-[30px] text-[11px] font-semibold uppercase tracking-wide text-muted border-b border-border select-none cursor-pointer hover:text-accent">
                      Pos<SortIcon column="positionTotal" activeKey={sortKey} order={sortOrder} />
                    </th>
                    )}
                    {!beforeSeason && (
                    <th align="center" onClick={() => handleSort('positionChange')} className="px-2 py-2 h-[30px] text-[11px] font-semibold uppercase tracking-wide text-muted border-b border-border select-none cursor-pointer hover:text-accent">
                      +/-<SortIcon column="positionChange" activeKey={sortKey} order={sortOrder} />
                    </th>
                    )}
                    <th align="left" onClick={() => handleSort('shortName')} className="px-2 py-2 h-[30px] text-[11px] font-semibold uppercase tracking-wide text-muted border-b border-border select-none cursor-pointer hover:text-accent">
                      Manager<SortIcon column="shortName" activeKey={sortKey} order={sortOrder} />
                    </th>
                    {!beforeSeason && (
                    <th align="center" onClick={() => handleSort('pointsLastRound')} className="px-2 py-2 h-[30px] text-[11px] font-semibold uppercase tracking-wide text-muted border-b border-border select-none cursor-pointer hover:text-accent">
                      Sp.<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
                    </th>
                    )}
                    {!beforeSeason && (
                    <th align="center" onClick={() => handleSort('pointsTotal')} className="px-2 py-2 h-[30px] text-[11px] font-semibold uppercase tracking-wide text-muted border-b border-border select-none cursor-pointer hover:text-accent">
                      Ges.<SortIcon column="pointsTotal" activeKey={sortKey} order={sortOrder} />
                    </th>
                    )}
                  </tr>
                </TableHead>
                <TableBody>
                  {filteredManagers && filteredManagers.length > 0 ? (
                    filteredManagers.map((manager, index) => {
                      const isMe = selected && manager.id === myManagerId
                      return (
                      <tr
                        key={manager.id}
                        ref={isMe ? rowRef : undefined}
                        className={`border-b border-border ${isMe ? 'border-l-2 border-l-on-dark row-selected font-semibold' : ''} ${index % 2 === 1 ? 'bg-zebra' : ''}`}
                      >
                        {!beforeSeason && (
                        <td className="px-2 py-2 text-center text-foreground overflow-hidden">
                          {manager.positionTotal ? `${manager.positionTotal}.` : '-'}
                        </td>
                        )}
                        {!beforeSeason && (
                        <td className="px-2 py-2 text-center overflow-hidden">
                          {manager.positionChange != null && manager.positionChange !== 0 ? (
                            <span className={`${manager.positionChange > 0 ? 'text-success' : 'text-danger'}`}>
                              {manager.positionChange > 0 ? `↑${manager.positionChange}` : `↓${Math.abs(manager.positionChange)}`}
                            </span>
                          ) : (
                            <span className="text-subtle">-</span>
                          )}
                        </td>
                        )}
                        <td className="px-2 py-2 min-w-0 overflow-hidden">
                          {beforeSeasonNonAdmin ? (
                            <span className="font-medium text-foreground">{manager.shortName || '-'}</span>
                          ) : (
                            <RouterLink to={`/managers/${manager.id}`} className="link font-medium truncate block">
                              {manager.shortName || '-'}
                            </RouterLink>
                          )}
                          {manager.login && (
                            <div className="text-xs text-muted truncate">{manager.login}</div>
                          )}
                        </td>
                        {!beforeSeason && (
                        <td className="px-2 py-2 text-center text-muted overflow-hidden">
                          {manager.pointsLastRound ?? '-'}
                        </td>
                        )}
                        {!beforeSeason && (
                        <td className="px-2 py-2 text-center text-foreground font-medium overflow-hidden">
                          {manager.pointsTotal ?? '-'}
                        </td>
                        )}
                      </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={beforeSeason ? 1 : 5} className="text-center text-subtle py-8">
                        Keine Manager gefunden
                      </td>
                    </tr>
                  )}
                </TableBody>
              </table>
            </div>
          </>
        )}
      </div>

      {!fill && <div className="h-10 md:hidden" />}
    </div>
  )
}
