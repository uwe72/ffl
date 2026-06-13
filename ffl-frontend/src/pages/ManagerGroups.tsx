import { useState, useMemo } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useManagerGroups, useDeleteManagerGroup } from '../hooks/useManagerGroups'
import Button from '../components/Button'

type SortKey = 'name' | 'managerCount' | 'createdByLogin'
type SortOrder = 'asc' | 'desc'

export default function ManagerGroups() {
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
    return <span className="text-primary ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <i className="sap-icon sap-icon-group-2 text-[28px] text-primary" />
          <h1 className="text-sm font-medium text-primary">Gruppen</h1>
        </div>
        <Button
          onClick={() => navigate('/manager-groups/create')}
          size="compact"
        >
          + Neue Gruppe
        </Button>
      </div>

      <div className="p-4 bg-surface border border-border rounded-lg">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Gruppe suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full max-w-md px-3 py-2 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th 
                  className="px-3 py-2.5 text-left text-muted text-sm font-medium cursor-pointer hover:text-primary border-b border-border"
                  onClick={() => handleSort('name')}
                >
                  Name<SortIcon column="name" />
                </th>
                <th className="px-3 py-2.5 text-left text-muted text-sm font-medium border-b border-border">
                  Beschreibung
                </th>
                <th 
                  className="px-3 py-2.5 text-center text-muted text-sm font-medium cursor-pointer hover:text-primary border-b border-border"
                  onClick={() => handleSort('managerCount')}
                >
                  Manager<SortIcon column="managerCount" />
                </th>
                <th 
                  className="px-3 py-2.5 text-left text-muted text-sm font-medium cursor-pointer hover:text-primary border-b border-border"
                  onClick={() => handleSort('createdByLogin')}
                >
                  Erstellt von<SortIcon column="createdByLogin" />
                </th>
                <th className="px-3 py-2.5 text-right text-muted text-sm font-medium border-b border-border">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group, index) => (
                  <tr key={group.id} className={`hover:bg-card-hover border-b border-border-subtle ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                    <td className="px-3 py-2.5">
                      <RouterLink
                        to={`/manager-groups/${group.id}`}
                        className="text-primary hover:text-accent-hover link font-medium"
                      >
                        {group.name}
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2.5 text-muted">
                      {group.description || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-foreground">
                      {group.managerCount}
                    </td>
                    <td className="px-3 py-2.5 text-muted">
                      {group.createdByFirstName && group.createdByLastName 
                        ? `${group.createdByFirstName} ${group.createdByLastName} (${group.createdByLogin})`
                        : group.createdByLogin || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
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

        {filteredGroups.length > 0 && (
          <div className="mt-4 text-sm text-subtle">
            {filteredGroups.length} von {groups?.length || 0} Gruppen
          </div>
        )}
      </div>
    </div>
  )
}
