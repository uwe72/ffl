import { useState, useMemo, useEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useManagerGroups, useDeleteManagerGroup } from '../hooks/useManagerGroups'
import Button from '../components/Button'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  return isMobile
}

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

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
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
      <div className="flex items-center gap-3 mb-6">
        <i className="sap-icon sap-icon-group-2 text-xl text-primary" />
        <h1 className="text-xl font-bold text-foreground">Gruppen</h1>
      </div>

      <div className="bg-surface border border-border rounded-lg shadow-2xl flex flex-col">
        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onCreateNew={() => navigate('/manager-groups/create')}
          hasFilter={hasActiveFilter}
          onClearFilter={clearFilter}
        />

        <div className="flex-1 px-6 pb-6 overflow-x-auto">
        {!isMobile && (
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-elevated sticky top-0">
              <tr>
                <th
                  className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                  onClick={() => handleSort('name')}
                >
                  Name<SortIcon column="name" />
                </th>
                <th className="px-3 py-2 text-left text-xs text-muted font-bold border-b border-border">
                  Beschreibung
                </th>
                <th
                  className="px-3 py-2 text-center text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                  onClick={() => handleSort('managerCount')}
                >
                  Manager<SortIcon column="managerCount" />
                </th>
                <th
                  className="px-3 py-2 text-left text-xs text-muted font-bold cursor-pointer hover:text-primary border-b border-border"
                  onClick={() => handleSort('createdByLogin')}
                >
                  Erstellt von<SortIcon column="createdByLogin" />
                </th>
                <th className="px-3 py-2 text-right text-xs text-muted font-bold border-b border-border">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface text-sm">
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
            </tbody>
          </table>
        </div>
        )}

        {isMobile && (
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
        )}

        {filteredGroups.length > 0 && (
          <div className="mt-4 text-sm text-subtle">
            {filteredGroups.length} von {groups?.length || 0} Gruppen
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
