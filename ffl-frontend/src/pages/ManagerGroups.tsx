import { useState, useMemo } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Card, Input, TextArea, Button } from '@heroui/react'
import { useManagerGroups, useCreateManagerGroup, useDeleteManagerGroup } from '../hooks/useManagerGroups'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useManagersBySeason } from '../hooks/useManagers'
import { useAuth } from '../context/AuthContext'
import type { ManagerInGroup } from '../types'

type SortKey = 'name' | 'managerCount' | 'createdByLogin'
type SortOrder = 'asc' | 'desc'

const emailToOptions = [
  { value: 'ALL_MANAGERS', label: 'Alle Manager' },
  { value: 'CREATOR_ONLY', label: 'Nur Ersteller' }
]

export default function ManagerGroups() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [newEmailTo, setNewEmailTo] = useState<'ALL_MANAGERS' | 'CREATOR_ONLY'>('ALL_MANAGERS')
  const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>([])
  const [isAddManagerModalOpen, setIsAddManagerModalOpen] = useState(false)
  const [managerSearchTerm, setManagerSearchTerm] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const { data: groups, isLoading, error } = useManagerGroups()
  const { data: currentSeason } = useCurrentSeason()
  const { data: allManagers } = useManagersBySeason(currentSeason?.id || 0)
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

  const selectedManagers = useMemo(() => {
    if (!allManagers) return []
    return allManagers
      .filter(m => selectedManagerIds.includes(m.id))
      .map(m => ({
        id: m.id,
        name: m.name,
        shortName: m.shortName,
        firstName: m.firstName,
        lastName: m.lastName,
        pointsTotal: m.pointsTotal,
        pointsLastRound: m.pointsLastRound,
        positionTotal: m.positionTotal
      })) as ManagerInGroup[]
  }, [allManagers, selectedManagerIds])

  const availableManagers = useMemo(() => {
    if (!allManagers) return []
    return allManagers.filter(m => 
      !selectedManagerIds.includes(m.id) &&
      (m.name.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
       m.shortName?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
       m.firstName?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
       m.lastName?.toLowerCase().includes(managerSearchTerm.toLowerCase()))
    )
  }, [allManagers, selectedManagerIds, managerSearchTerm])

  const handleAddManager = (managerId: number) => {
    setSelectedManagerIds(prev => [...prev, managerId])
    setManagerSearchTerm('')
  }

  const handleRemoveManager = (managerId: number) => {
    setSelectedManagerIds(prev => prev.filter(id => id !== managerId))
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupDescription.trim() || !currentSeason) return
    
    setErrorMessage('')
    try {
      const createdGroup = await createMutation.mutateAsync({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        seasonId: currentSeason.id,
        emailTo: newEmailTo,
        managerIds: selectedManagerIds
      })
      
      navigate(`/manager-groups/${createdGroup.id}`)
    } catch (error) {
      setErrorMessage('Fehler beim Erstellen der Gruppe. Bitte versuchen Sie es erneut.')
    }
  }

  const handleDeleteGroup = async (id: number) => {
    if (window.confirm('Möchten Sie diese Gruppe wirklich löschen?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const openCreateModal = () => {
    setNewGroupName('')
    setNewGroupDescription('')
    setNewEmailTo('ALL_MANAGERS')
    setSelectedManagerIds([])
    setManagerSearchTerm('')
    setErrorMessage('')
    setIsCreateModalOpen(true)
  }

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#f5f5f5]">Gruppen</h1>
        <Button
          onPress={openCreateModal}
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="p-6 bg-[#1a2028] border border-[#2d3748] w-full max-w-4xl my-8">
            <h2 className="text-xl font-bold text-[#f5f5f5] mb-6">Neue Gruppe erstellen</h2>
            
            {!currentSeason && (
              <p className="text-[#e05252] text-sm mb-4">
                Keine aktuelle Saison ausgewählt. Bitte erstellen Sie zuerst eine Saison.
              </p>
            )}
            
            {errorMessage && (
              <p className="text-[#e05252] text-sm mb-4">{errorMessage}</p>
            )}

            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
                <label className="block text-[#a0aec0] mb-2 text-sm">Name <span className="text-[#e05252]">*</span></label>
                <Input
                  placeholder="Gruppenname"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="bg-[#1a2028] border-[#3d4a5c] text-[#f5f5f5]"
                />
              </Card>

              <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
                <label className="block text-[#a0aec0] mb-2 text-sm">Beschreibung <span className="text-[#e05252]">*</span></label>
                <TextArea
                  placeholder="Beschreibung"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className="bg-[#1a2028] border-[#3d4a5c] text-[#f5f5f5]"
                />
              </Card>

              <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
                <label className="block text-[#a0aec0] mb-3 text-sm">Email an</label>
                <div className="flex gap-4">
                  {emailToOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                        newEmailTo === option.value
                          ? 'bg-[#c9a66b] text-[#0f1419]'
                          : 'bg-[#1a2028] text-[#a0aec0] hover:bg-[#3d4a5c]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="emailTo"
                        value={option.value}
                        checked={newEmailTo === option.value}
                        onChange={(e) => setNewEmailTo(e.target.value as 'ALL_MANAGERS' | 'CREATOR_ONLY')}
                        className="hidden"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="p-4 bg-[#242d38] border border-[#3d4a5c]">
                <label className="block text-[#a0aec0] mb-2 text-sm">Ersteller</label>
                <Input
                  value={user?.login || 'Unbekannt'}
                  readOnly
                  className="bg-[#1a2028] border-[#3d4a5c] text-[#f5f5f5] opacity-70"
                />
              </Card>
            </div>

            <Card className="p-4 bg-[#242d38] border border-[#3d4a5c] mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#f5f5f5]">Manager ({selectedManagerIds.length})</h3>
                <Button
                  onPress={() => setIsAddManagerModalOpen(true)}
                  className="bg-[#c9a66b] text-[#0f1419]"
                  size="sm"
                >
                  Manager hinzufügen
                </Button>
              </div>

              {selectedManagers.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-[#3d4a5c]">
                  <table className="w-full">
                    <thead className="bg-[#1a2028]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[#a0aec0] font-medium border-b border-[#3d4a5c]">
                          Manager
                        </th>
                        <th className="px-3 py-2 text-left text-[#a0aec0] font-medium border-b border-[#3d4a5c]">
                          Vorname
                        </th>
                        <th className="px-3 py-2 text-left text-[#a0aec0] font-medium border-b border-[#3d4a5c]">
                          Nachname
                        </th>
                        <th className="px-3 py-2 text-right text-[#a0aec0] font-medium border-b border-[#3d4a5c]">
                          Aktionen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-[#1a2028]">
                      {selectedManagers.map(manager => (
                        <tr key={manager.id} className="hover:bg-[#242d38] border-b border-[#3d4a5c]">
                          <td className="px-3 py-2 text-[#f5f5f5] font-medium">
                            {manager.shortName || manager.name}
                          </td>
                          <td className="px-3 py-2 text-[#a0aec0]">
                            {manager.firstName || '-'}
                          </td>
                          <td className="px-3 py-2 text-[#a0aec0]">
                            {manager.lastName || '-'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onPress={() => handleRemoveManager(manager.id)}
                              className="text-[#e05252]"
                            >
                              Entfernen
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[#6b7280] text-center py-4">Keine Manager ausgewählt</p>
              )}
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onPress={() => setIsCreateModalOpen(false)}
                className="text-[#a0aec0]"
              >
                Abbrechen
              </Button>
              <Button
                onPress={handleCreateGroup}
                isDisabled={!newGroupName.trim() || !newGroupDescription.trim() || !currentSeason || createMutation.isPending}
                className="bg-[#c9a66b] text-[#0f1419]"
              >
                {createMutation.isPending ? 'Wird erstellt...' : 'Erstellen'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {isAddManagerModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <Card className="p-0 bg-[#1a2028] border border-[#2d3748] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#242d38] px-6 py-4 border-b border-[#2d3748]">
              <h2 className="text-xl font-bold text-[#f5f5f5]">Manager hinzufügen</h2>
            </div>
            <div className="p-6">
              <Input
                placeholder="Manager suchen..."
                value={managerSearchTerm}
                onChange={(e) => setManagerSearchTerm(e.target.value)}
                className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] mb-4"
                autoFocus
              />
              <div className="max-h-80 overflow-y-auto rounded-lg border border-[#2d3748]">
                {availableManagers.length > 0 ? (
                  <div className="divide-y divide-[#2d3748]">
                    {availableManagers.map(manager => (
                      <div
                        key={manager.id}
                        onClick={() => handleAddManager(manager.id)}
                        className="p-4 hover:bg-[#242d38] cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-[#f5f5f5] font-medium group-hover:text-[#c9a66b]">
                            {manager.shortName || manager.name}
                          </div>
                          <div className="text-[#6b7280] text-sm">
                            {manager.firstName} {manager.lastName}
                          </div>
                        </div>
                        <div className="text-[#c9a66b] opacity-0 group-hover:opacity-100 transition-opacity">
                          + Hinzufügen
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-[#6b7280] py-8">
                    Keine Manager gefunden
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-[#242d38] border-t border-[#2d3748] flex justify-end">
              <Button
                variant="ghost"
                onPress={() => {
                  setIsAddManagerModalOpen(false)
                  setManagerSearchTerm('')
                }}
                className="text-[#a0aec0]"
              >
                Schließen
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
