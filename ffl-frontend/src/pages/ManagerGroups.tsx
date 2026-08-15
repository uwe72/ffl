import { useState, useMemo } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useManagerGroups, useDeleteManagerGroup } from '../hooks/useManagerGroups'
import Button from '../components/Button'
import SortIcon from '../components/SortIcon'
import { TableHead, ThSortable, Th, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'

type SortKey = 'name' | 'managerCount' | 'createdByLogin'
type SortOrder = 'asc' | 'desc'

function ManagerGroupCard({ group, onDelete }: { group: any; onDelete: (id: number) => void }) {
  return (
    <div className="p-4 bg-surface border border-border rounded-card">
      <div className="flex gap-4 items-center">
        <div className="flex-1 min-w-0">
          <RouterLink
            to={`/manager-groups/${group.id}`}
            className="font-semibold link truncate block"
          >
            {group.name}
          </RouterLink>
          {group.description && (
            <p className="text-sm text-muted mt-1 truncate">{group.description}</p>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
            <div>
              <span className="text-subtle">Manager: </span>
              <span className="font-medium text-foreground">{group.managerCount}</span>
            </div>
            <div>
              <span className="text-subtle">Erstellt von: </span>
              <span className="text-muted">
                {group.createdByFirstName && group.createdByLastName
                  ? `${group.createdByFirstName} ${group.createdByLastName}`
                  : group.createdByLogin || '-'}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="negative"
          size="sm"
          onClick={() => onDelete(group.id)}
        >
          Löschen
        </Button>
      </div>
    </div>
  )
}

export default function ManagerGroups() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const { data: groups, isLoading, error } = useManagerGroups()
  const deleteMutation = useDeleteManagerGroup()

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const filteredGroups = useMemo(() => {
    if (!groups) return []

    const filtered = groups.filter(group => {
      return group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.createdByLogin?.toLowerCase().includes(searchTerm.toLowerCase())
    })

    return filtered.sort((a, b) => {
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
  }, [groups, searchTerm, sortKey, sortOrder])

  const handleDeleteGroup = async (id: number) => {
    if (window.confirm('Möchten Sie diese Gruppe wirklich löschen?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <div className="p-6 bg-surface border border-border rounded-card mb-6 w-fit max-w-full">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="hidden sm:block text-xl font-semibold text-foreground">Manager-Gruppen ({filteredGroups.length})</h2>
          <div className="relative w-full sm:w-64">
            <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Gruppe suchen..."
              className="input-field control pl-8 pr-3 py-2 rounded-control text-sm w-full"
            />
          </div>
          <Button
            onClick={() => navigate('/manager-groups/create')}
            size="compact"
            className="hidden sm:inline-flex"
          >
            + Neue Gruppe
          </Button>
        </div>

        <Button
          onClick={() => navigate('/manager-groups/create')}
          size="compact"
          className="w-full sm:hidden mb-4"
        >
          + Neue Gruppe
        </Button>

        {searchTerm !== '' && (
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
                    <Th align="right">
                      Aktionen
                    </Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {filteredGroups.length > 0 ? (
                    filteredGroups.map((group, index) => (
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
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="negative"
                            size="sm"
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            Löschen
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center text-subtle py-8">
                        Keine Gruppen gefunden
                      </td>
                    </tr>
                  )}
                </TableBody>
              </table>
            </div>
            <div className="mt-4 text-sm text-subtle">
              {filteredGroups.length} von {groups?.length || 0} Gruppen
            </div>
          </>
        )}

        {isMobile && (
          <div>
            <div className="grid gap-4">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <ManagerGroupCard key={group.id} group={group} onDelete={handleDeleteGroup} />
                ))
              ) : (
                <div className="text-center text-subtle py-8">
                  Keine Gruppen gefunden
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-subtle">
              {filteredGroups.length} von {groups?.length || 0} Gruppen
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
