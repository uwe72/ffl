import { useState, useMemo } from 'react'
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
    <div>
      <BackButton to="/" className="mb-4" />
      <div className="flex items-start gap-3 p-3 bg-accent-muted border border-accent/30 rounded-card mb-6">
        <i className="sap-icon sap-icon-information text-[18px] text-accent shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          Hier kannst du eigene Gruppen erstellen und verwalten. In der Tabelle werden nur Gruppen
          angezeigt, deren Ersteller du bist. Die vollständige Übersicht aller deiner Gruppen findest
          du im <RouterLink to="/?tab=gruppen" className="link">Dashboard</RouterLink>.
        </p>
      </div>
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6 w-full md:w-fit max-w-full">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="hidden sm:block text-xl font-semibold text-foreground">Manager-Gruppen ({sortedGroups.length})</h2>
          <Button
            onClick={() => navigate('/manager-groups/create')}
            size="compact"
            className="w-full sm:w-auto sm:inline-flex"
          >
            + Neue Gruppe
          </Button>
        </div>

        {!isMobile && (
          <>
            <div className="overflow-x-auto rounded-card border border-border w-fit max-w-full">
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
                      <td colSpan={4} className="text-center text-subtle py-8">
                        Keine Gruppen gefunden
                      </td>
                    </tr>
                  )}
                </TableBody>
              </table>
            </div>
            <div className="mt-4 text-sm text-subtle">
              {sortedGroups.length} von {groups?.length || 0} Gruppen
            </div>
          </>
        )}

        {isMobile && (
          <div>
            <div className="grid gap-4">
              {sortedGroups.length > 0 ? (
                sortedGroups.map((group) => (
                  <ManagerGroupCard key={group.id} group={group} />
                ))
              ) : (
                <div className="text-center text-subtle py-8">
                  Keine Gruppen gefunden
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-subtle">
              {sortedGroups.length} von {groups?.length || 0} Gruppen
            </div>
          </div>
        )}
      </div>

      <div className="h-10" />
    </div>
  )
}
