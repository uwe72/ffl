import { useState, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Card, Input, Button } from '@heroui/react'
import { useManagerGroups, useCreateManagerGroup, useDeleteManagerGroup } from '../hooks/useManagerGroups'
import { useCurrentSeason } from '../hooks/useSeasons'

type SortKey = 'name' | 'managerCount' | 'createdByLogin'
type SortOrder = 'asc' | 'desc'

export default function ManagerGroups() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')

  const { data: groups, isLoading, error } = useManagerGroups()
  const { data: currentSeason } = useCurrentSeason()
  const createMutation = useCreateManagerGroup()
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
    if (sortKey !== column) return <span className="text-[#6b7280] ml-1">⇅</span>
    return <span className="text-[#c9a66b] ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
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

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupDescription.trim() || !currentSeason) return
    
    await createMutation.mutateAsync({
      name: newGroupName.trim(),
      description: newGroupDescription.trim(),
      seasonId: currentSeason.id
    })
    
    setNewGroupName('')
    setNewGroupDescription('')
    setIsCreateModalOpen(false)
  }

  const handleDeleteGroup = async (id: number) => {
    if (window.confirm('Möchten Sie diese Gruppe wirklich löschen?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#f5f5f5]">Gruppen</h1>
        <Button
          onPress={() => setIsCreateModalOpen(true)}
          className="bg-[#c9a66b] text-[#0f1419]"
        >
          Neue Gruppe
        </Button>
      </div>

      <Card className="p-4 bg-[#1a2028] border border-[#2d3748]">
        <div className="mb-4">
          <Input
            placeholder="Gruppe suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1a2028]">
              <tr>
                <th 
                  className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                  onClick={() => handleSort('name')}
                >
                  Name<SortIcon column="name" />
                </th>
                <th className="px-3 py-2 text-left text-[#a0aec0] font-medium border-b border-[#2d3748]">
                  Beschreibung
                </th>
                <th 
                  className="px-3 py-2 text-center text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                  onClick={() => handleSort('managerCount')}
                >
                  Manager<SortIcon column="managerCount" />
                </th>
                <th 
                  className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                  onClick={() => handleSort('createdByLogin')}
                >
                  Erstellt von<SortIcon column="createdByLogin" />
                </th>
                <th className="px-3 py-2 text-right text-[#a0aec0] font-medium border-b border-[#2d3748]">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#1a2028]">
              {filteredGroups.length > 0 ? (
                filteredGroups.map(group => (
                  <tr key={group.id} className="hover:bg-[#242d38] border-b border-[#2d3748]">
                    <td className="px-3 py-2">
                      <RouterLink
                        to={`/manager-groups/${group.id}`}
                        className="text-[#c9a66b] hover:text-[#f5f5f5] link font-medium"
                      >
                        {group.name}
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2 text-[#a0aec0]">
                      {group.description || '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-[#f5f5f5]">
                      {group.managerCount}
                    </td>
                    <td className="px-3 py-2 text-[#a0aec0]">
                      {group.createdByFirstName && group.createdByLastName 
                        ? `${group.createdByFirstName} ${group.createdByLastName} (${group.createdByLogin})`
                        : group.createdByLogin || '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => handleDeleteGroup(group.id)}
                        className="text-[#e05252]"
                      >
                        Löschen
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-[#6b7280] py-8">
                    Keine Gruppen gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredGroups.length > 0 && (
          <div className="mt-4 text-sm text-[#6b7280]">
            {filteredGroups.length} von {groups?.length || 0} Gruppen
          </div>
        )}
      </Card>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 bg-[#1a2028] border border-[#2d3748] w-full max-w-md">
            <h2 className="text-xl font-bold text-[#f5f5f5] mb-4">Neue Gruppe erstellen</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[#a0aec0] mb-1">Name <span className="text-[#e05252]">*</span></label>
                <Input
                  placeholder="Gruppenname"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                />
              </div>
              <div>
                <label className="block text-[#a0aec0] mb-1">Beschreibung <span className="text-[#e05252]">*</span></label>
                <Input
                  placeholder="Beschreibung"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onPress={() => setIsCreateModalOpen(false)}
                className="text-[#a0aec0]"
              >
                Abbrechen
              </Button>
              <Button
                onPress={handleCreateGroup}
                isDisabled={!newGroupName.trim() || !newGroupDescription.trim()}
                className="bg-[#c9a66b] text-[#0f1419]"
              >
                Erstellen
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
