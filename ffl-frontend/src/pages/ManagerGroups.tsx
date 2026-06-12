import { useState, useMemo } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { UsersRound } from 'lucide-react'
import { useManagerGroups, useDeleteManagerGroup } from '../hooks/useManagerGroups'

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

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UsersRound size={28} className="text-accent" />
          <h1 className="text-sm font-medium text-accent">Gruppen</h1>
        </div>
        <button
          onClick={() => navigate('/manager-groups/create')}
          className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded hover:bg-button-primary-hover transition-colors"
        >
          + Neue Gruppe
        </button>
      </div>

      <div className="p-4 bg-surface border border-border">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Gruppe suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full max-w-md px-3 py-2 rounded focus:outline-none bg-elevated border border-border-hover text-foreground"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th 
                  className="px-3 py-2 text-left text-muted font-medium cursor-pointer hover:text-accent border-b border-border"
                  onClick={() => handleSort('name')}
                >
                  Name<SortIcon column="name" />
                </th>
                <th className="px-3 py-2 text-left text-muted font-medium border-b border-border">
                  Beschreibung
                </th>
                <th 
                  className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border"
                  onClick={() => handleSort('managerCount')}
                >
                  Manager<SortIcon column="managerCount" />
                </th>
                <th 
                  className="px-3 py-2 text-left text-muted font-medium cursor-pointer hover:text-accent border-b border-border"
                  onClick={() => handleSort('createdByLogin')}
                >
                  Erstellt von<SortIcon column="createdByLogin" />
                </th>
                <th className="px-3 py-2 text-right text-muted font-medium border-b border-border">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface">
              {filteredGroups.length > 0 ? (
                filteredGroups.map(group => (
                  <tr key={group.id} className="hover:bg-elevated border-b border-border">
                    <td className="px-3 py-2">
                      <RouterLink
                        to={`/manager-groups/${group.id}`}
                        className="text-accent hover:text-foreground link font-medium"
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
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-danger text-sm px-2 py-1 rounded hover:bg-elevated transition-colors"
                      >
                        Löschen
                      </button>
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
