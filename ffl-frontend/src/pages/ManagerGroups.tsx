import { useState, useMemo, useRef, useLayoutEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useManagerGroups, useGroupLogo } from '../hooks/useManagerGroups'
import BackButton from '../components/BackButton'
import Button from '../components/Button'
import SortIcon from '../components/SortIcon'
import { TableHead, ThSortable, Th, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'

type SortKey = 'name' | 'managerCount' | 'createdByLogin'
type SortOrder = 'asc' | 'desc'

function ManagerGroupCard({ group }: { group: any }) {
  const { data: logoUrl } = useGroupLogo(group.hasLogo ? group.id : null)
  return (
    <div className="relative overflow-hidden p-4 pl-5 bg-surface border border-border rounded-card">
      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />
      <div className="flex gap-4 items-center">
        {logoUrl ? (
          <img src={logoUrl} alt={group.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center flex-shrink-0">
            <i className="sap-icon sap-icon-group-2 text-xl text-accent" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <RouterLink
            to={`/manager-groups/${group.id}`}
            className="font-semibold link truncate block"
          >
            {group.name}
          </RouterLink>
        </div>
      </div>
      <div className="flex flex-col gap-1 mt-4 text-sm">
        <div>
          <span className="text-subtle">Manager: </span>
          <span className="font-medium text-foreground">{group.managerCount}</span>
        </div>
        <div>
          <span className="text-subtle">Erstellt von: </span>
          <span className="font-medium text-foreground">
            {group.createdByFirstName && group.createdByLastName
              ? `${group.createdByFirstName} ${group.createdByLastName} (${group.createdByLogin})`
              : group.createdByLogin || '-'}
          </span>
        </div>
        <div>
          <span className="text-subtle">E-Mail an: </span>
          <span className="font-medium text-foreground">
            {group.emailTo === 'CREATOR_ONLY' ? 'Nur Ersteller' : 'Alle Manager'}
          </span>
        </div>
      </div>
      {group.description && (
        <p className="text-sm text-muted mt-3 truncate">{group.description}</p>
      )}
    </div>
  )
}

export default function ManagerGroups() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const { data: groups, isLoading, error } = useManagerGroups()

  const tableWrapRef = useRef<HTMLDivElement>(null)
  const [tableWidth, setTableWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = tableWrapRef.current
    if (!el) return
    const update = () => setTableWidth(el.getBoundingClientRect().width)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isMobile])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const sortedGroups = useMemo(() => {
    if (!groups) return []

    return [...groups].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'managerCount':
          comparison = (a.managerCount || 0) - (b.managerCount || 0)
          break
        case 'createdByLogin':
          comparison = (a.createdByLogin || '').localeCompare(b.createdByLogin || '')
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [groups, sortKey, sortOrder])

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div className="md:h-full md:flex md:flex-col md:min-h-0">
      <BackButton to="/" className="mb-4" />
      <div className="md:w-fit max-w-full md:flex-1 md:min-h-0 md:flex md:flex-col">
        <div
          className="flex items-start gap-3 p-3 w-full max-w-full bg-info-bg border border-info/30 rounded-card mb-1 md:mb-6 md:shrink-0"
          style={tableWidth ? { maxWidth: tableWidth } : undefined}
        >
          <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0 mt-0.5" />
          <div className="text-sm text-foreground min-w-0">
            <p>
              Hier kannst du eigene Gruppen erstellen und verwalten. In der Tabelle werden nur Gruppen
              angezeigt, deren Ersteller du bist. Die vollständige Übersicht aller deiner Gruppen findest
              du im <RouterLink to="/?tab=gruppen" className="link">Dashboard</RouterLink>.
            </p>
            <p className="mt-2">
              Mit einer Manager-Gruppe vergleichst du dich mit einem eigenen, kleinen Kreis statt mit der
              ganzen Liga, zum Beispiel mit Freunden oder Kollegen. Eure Rangliste taucht auch in der
              Spieltagsmail auf.
            </p>
            {sortedGroups.length === 0 && (
              <p className="mt-2">Hier kannst du deine erste Gruppe anlegen.</p>
            )}
          </div>
        </div>
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-1 md:mb-0 w-full max-w-full md:flex-1 md:min-h-0 md:flex md:flex-col">
        <div className="flex items-center justify-between gap-4 mb-4 md:shrink-0">
          <h2 className="hidden md:block text-xl font-semibold text-foreground">Manager-Gruppen ({sortedGroups.length})</h2>
          <Button
            onClick={() => navigate('/manager-groups/create')}
            size="input"
            className="w-fit md:w-auto md:inline-flex"
          >
            + Neue Gruppe
          </Button>
        </div>

        {!isMobile && (
          <>
            <div ref={tableWrapRef} className="flex-1 min-h-0 overflow-auto rounded-card border border-border w-fit max-w-full">
              <table>
                <TableHead>
                  <tr>
                    <ThSortable
                      onClick={() => handleSort('name')}
                    >
                      Name<SortIcon column="name" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <Th>
                      Beschreibung
                    </Th>
                    <ThSortable
                      align="center"
                      onClick={() => handleSort('managerCount')}
                    >
                      Manager<SortIcon column="managerCount" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable
                      onClick={() => handleSort('createdByLogin')}
                    >
                      Erstellt von<SortIcon column="createdByLogin" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                  </tr>
                </TableHead>
                <TableBody>
                  {sortedGroups.length > 0 ? (
                    sortedGroups.map((group, index) => (
                      <tr key={group.id} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                        <td className="px-3 py-2">
                          <RouterLink
                            to={`/manager-groups/${group.id}`}
                            className="link font-medium"
                          >
                            {group.name}
                          </RouterLink>
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {group.description || '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-foreground">
                          {group.managerCount}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {group.createdByFirstName && group.createdByLastName
                            ? `${group.createdByFirstName} ${group.createdByLastName} (${group.createdByLogin})`
                            : group.createdByLogin || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted">
                        Keine Gruppen vorhanden
                      </td>
                    </tr>
                  )}
                </TableBody>
              </table>
            </div>
          </>
        )}

        {isMobile && (
          <div>
            <div className="grid gap-2">
              {sortedGroups.length > 0 ? (
                sortedGroups.map((group) => (
                  <ManagerGroupCard key={group.id} group={group} />
                ))
              ) : (
                <p className="text-center text-muted text-sm py-4">Keine Gruppen vorhanden</p>
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      <div className="h-10 md:hidden" />
    </div>
  )
}
