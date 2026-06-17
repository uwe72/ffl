import { useState, useMemo } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useManagerGroups, useDeleteManagerGroup } from '../hooks/useManagerGroups'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import CardContainer from '../components/CardContainer'
import SortIcon from '../components/SortIcon'
import { TableContent, TableHead, ThSortable, Th, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'

type SortKey = 'name' | 'managerCount' | 'createdByLogin'
type SortOrder = 'asc' | 'desc'

function ManagerGroupCard({ group, onDelete }: { group: any; onDelete: (id: number) => void }) {
  return (
    <div className="card p-4 bg-surface border border-border">
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <RouterLink
            to={`/manager-groups/${group.id}`}
            className="font-semibold text-primary hover:text-accent-hover link truncate block"
          >
            {group.name}
          </RouterLink>
          {group.description && (
            <p className="text-sm text-muted mt-1 truncate">{group.description}</p>
          )}
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
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

function FilterBar({ searchTerm, setSearchTerm, onCreateNew, hasFilter, onClearFilter }: {
  searchTerm: string
  setSearchTerm: (s: string) => void
  onCreateNew: () => void
  hasFilter: boolean
  onClearFilter: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-elevated/50 border-b border-border flex-wrap">
      <div className="relative flex-1 min-w-[180px] max-w-[280px]">
        <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Gruppe suchen..."
          className="input-field pl-8 pr-3 py-1.5 text-xs w-full"
        />
      </div>

      <Button
        onClick={onCreateNew}
        size="compact"
      >
        + Neue Gruppe
      </Button>

      {hasFilter && (
        <button
          onClick={onClearFilter}
          className="p-1 rounded text-subtle hover:text-danger transition-colors"
          title="Filter zurücksetzen"
        >
          <i className="sap-icon sap-icon-decline text-[14px]" />
        </button>
      )}
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

  const clearFilter = () => {
    setSearchTerm('')
  }

  const hasActiveFilter = searchTerm !== ''

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <PageHeader icon="sap-icon-group-2" title="Gruppen" />

      <CardContainer>
        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onCreateNew={() => navigate('/manager-groups/create')}
          hasFilter={hasActiveFilter}
          onClearFilter={clearFilter}
        />

        {!isMobile && (
        <TableContent
          count={filteredGroups.length > 0 ? filteredGroups.length : undefined}
          total={filteredGroups.length > 0 ? groups?.length : undefined}
          countLabel={filteredGroups.length > 0 ? "Gruppen" : undefined}
        >
          <table className="w-full">
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
                filteredGroups.map((group) => (
                  <tr key={group.id} className="border-b border-border hover:bg-card-hover">
                    <td className="px-3 py-2">
                      <RouterLink
                        to={`/manager-groups/${group.id}`}
                        className="hover:text-accent-hover link text-primary"
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
        </TableContent>
        )}

        {isMobile && (
          <div className="flex-1 px-6 pb-6 overflow-x-auto">
            <div className="grid gap-4 mt-4">
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

            {filteredGroups.length > 0 && (
              <div className="mt-4 text-sm text-subtle">
                {filteredGroups.length} von {groups?.length || 0} Gruppen
              </div>
            )}
          </div>
        )}
      </CardContainer>
    </div>
  )
}
