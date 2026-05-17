import { useParams, Link as RouterLink } from 'react-router-dom'
import { Card, Button, TextField, Label, Input, TextArea } from '@heroui/react'
import { useState, useMemo, useEffect } from 'react'
import { useManagerGroup, useAddManagerToGroup, useRemoveManagerFromGroup, useUpdateManagerGroup, useChangeCreator } from '../hooks/useManagerGroups'
import { useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useUsers } from '../hooks/useUsers'
import { useAuth } from '../context/AuthContext'

type SortKey = 'positionTotal' | 'shortName' | 'firstName' | 'lastName' | 'pointsTotal' | 'pointsLastRound'
type SortOrder = 'asc' | 'desc'

const emailToOptions = [
  { value: 'ALL_MANAGERS', label: 'Alle Manager' },
  { value: 'CREATOR_ONLY', label: 'Nur Ersteller' }
]

export default function ManagerGroupDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: group, isLoading, error } = useManagerGroup(Number(id))
  const { data: currentSeason } = useCurrentSeason()
  const { data: allManagers } = useManagersBySeason(currentSeason?.id || 0)
  const { data: allUsers } = useUsers()
  
  const addManagerMutation = useAddManagerToGroup(Number(id))
  const removeManagerMutation = useRemoveManagerFromGroup(Number(id))
  const updateMutation = useUpdateManagerGroup(Number(id))
  const changeCreatorMutation = useChangeCreator(Number(id))
  
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false)
  const [creatorSearch, setCreatorSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [managerFilter, setManagerFilter] = useState('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editEmailTo, setEditEmailTo] = useState<string>('ALL_MANAGERS')
  const [hasChanges, setHasChanges] = useState(false)

  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    if (group) {
      setEditName(group.name)
      setEditDescription(group.description || '')
      setEditEmailTo(group.emailTo || 'ALL_MANAGERS')
    }
  }, [group])

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

  const filteredAndSortedManagers = useMemo(() => {
    if (!group?.managers) return []
    
    let managers = [...group.managers]
    
    if (managerFilter.trim()) {
      const filter = managerFilter.toLowerCase()
      managers = managers.filter(m => 
        (m.shortName || m.name).toLowerCase().includes(filter) ||
        (m.firstName || '').toLowerCase().includes(filter) ||
        (m.lastName || '').toLowerCase().includes(filter)
      )
    }
    
    return managers.sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'shortName':
          comparison = (a.shortName || a.name).localeCompare(b.shortName || b.name)
          break
        case 'firstName':
          comparison = (a.firstName || '').localeCompare(b.firstName || '')
          break
        case 'lastName':
          comparison = (a.lastName || '').localeCompare(b.lastName || '')
          break
        case 'positionTotal':
          comparison = (a.positionTotal ?? 999) - (b.positionTotal ?? 999)
          break
        case 'pointsTotal':
          comparison = (b.pointsTotal ?? 0) - (a.pointsTotal ?? 0)
          break
        case 'pointsLastRound':
          comparison = (b.pointsLastRound ?? 0) - (a.pointsLastRound ?? 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [group?.managers, sortKey, sortOrder, managerFilter])

  const availableManagers = useMemo(() => {
    if (!allManagers || !group) return []
    
    const groupManagerIds = new Set(group.managers.map(m => m.id))
    return allManagers.filter(m => 
      !groupManagerIds.has(m.id) &&
      (m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       m.shortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       m.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       m.lastName?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [allManagers, group, searchTerm])

  const filteredUsers = useMemo(() => {
    if (!allUsers) return []
    return allUsers.filter(u => 
      u.login.toLowerCase().includes(creatorSearch.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(creatorSearch.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(creatorSearch.toLowerCase())
    )
  }, [allUsers, creatorSearch])

  const handleAddManager = async (managerId: number) => {
    await addManagerMutation.mutateAsync(managerId)
    setIsAddModalOpen(false)
    setSearchTerm('')
  }

  const handleRemoveManager = async (managerId: number) => {
    if (window.confirm('Möchten Sie diesen Manager wirklich aus der Gruppe entfernen?')) {
      await removeManagerMutation.mutateAsync(managerId)
    }
  }

  const handleChangeCreator = async (newCreatorId: number) => {
    await changeCreatorMutation.mutateAsync(newCreatorId)
    setIsCreatorModalOpen(false)
    setCreatorSearch('')
  }

  const handleSaveChanges = async () => {
    if (!group || !hasChanges || !editDescription.trim()) return
    await updateMutation.mutateAsync({
      name: editName,
      description: editDescription.trim(),
      emailTo: editEmailTo as 'ALL_MANAGERS' | 'CREATOR_ONLY'
    })
    setHasChanges(false)
  }

  const handleChange = (field: 'name' | 'description' | 'emailTo', value: string) => {
    if (field === 'name') setEditName(value)
    else if (field === 'description') setEditDescription(value)
    else if (field === 'emailTo') setEditEmailTo(value)
    setHasChanges(true)
  }

  const getCreatorDisplayName = () => {
    if (!group) return 'Unbekannt'
    const firstName = group.createdByFirstName
    const lastName = group.createdByLastName
    const login = group.createdByLogin
    if (firstName && lastName) {
      return `${firstName} ${lastName} (${login})`
    }
    return login || 'Unbekannt'
  }

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>
  if (!group) return <div className="text-center py-8 text-[#6b7280]">Gruppe nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/manager-groups" className="text-[#c9a66b] hover:text-[#d4b77a] mb-6 inline-block link">
        &larr; Zurück zur Übersicht
      </RouterLink>
      
      <div className="grid gap-6 md:grid-cols-2 mt-4">
        {group.editable ? (
          <>
            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <TextField name="name" isRequired>
                <Label className="text-[#a0aec0]">Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                />
              </TextField>
            </Card>

            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <TextField name="description" isRequired>
                <Label className="text-[#a0aec0]">Beschreibung</Label>
                <TextArea
                  value={editDescription}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                />
              </TextField>
            </Card>

            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <Label className="text-[#a0aec0] block mb-3">Email an</Label>
              <div className="flex gap-4">
                {emailToOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                      editEmailTo === option.value
                        ? 'bg-[#c9a66b] text-[#0f1419]'
                        : 'bg-[#242d38] text-[#a0aec0] hover:bg-[#3d4a5c]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailTo"
                      value={option.value}
                      checked={editEmailTo === option.value}
                      onChange={(e) => handleChange('emailTo', e.target.value)}
                      className="hidden"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[#a0aec0]">Ersteller</Label>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => setIsCreatorModalOpen(true)}
                    className="text-[#c9a66b] text-sm"
                  >
                    Ändern
                  </Button>
                )}
              </div>
              <Input
                value={getCreatorDisplayName()}
                readOnly
                className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] opacity-70"
              />
            </Card>
          </>
        ) : (
          <>
            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <TextField name="name" isReadOnly>
                <Label className="text-[#a0aec0]">Name</Label>
                <Input
                  value={group.name}
                  readOnly
                  className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] opacity-70"
                />
              </TextField>
            </Card>

            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <TextField name="description" isReadOnly>
                <Label className="text-[#a0aec0]">Beschreibung</Label>
                <TextArea
                  value={group.description || '-'}
                  readOnly
                  className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] opacity-70"
                />
              </TextField>
            </Card>

            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <TextField name="emailTo" isReadOnly>
                <Label className="text-[#a0aec0]">Email an</Label>
                <Input
                  value={group.emailTo === 'ALL_MANAGERS' ? 'Alle Manager' : 'Nur Ersteller'}
                  readOnly
                  className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] opacity-70"
                />
              </TextField>
            </Card>

            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <TextField name="creator" isReadOnly>
                <Label className="text-[#a0aec0]">Ersteller</Label>
                <Input
                  value={getCreatorDisplayName()}
                  readOnly
                  className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] opacity-70"
                />
              </TextField>
            </Card>
          </>
        )}
      </div>

      {group.editable && hasChanges && (
        <div className="mt-6 flex gap-4">
          <Button
            onPress={handleSaveChanges}
            isDisabled={updateMutation.isPending || !editDescription.trim()}
            className="bg-[#c9a66b] text-[#0f1419] font-medium"
          >
            {updateMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              setEditName(group.name)
              setEditDescription(group.description || '')
              setEditEmailTo(group.emailTo || 'ALL_MANAGERS')
              setHasChanges(false)
            }}
          >
            Abbrechen
          </Button>
        </div>
      )}

      <Card className="p-6 mt-6 bg-[#1a2028] border border-[#2d3748]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#f5f5f5]">Manager ({filteredAndSortedManagers.length})</h2>
          <div className="flex gap-3 items-center">
            <Input
              placeholder="Manager suchen..."
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="w-64 bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
            {group.editable && (
              <Button
                onPress={() => setIsAddModalOpen(true)}
                className="bg-[#c9a66b] text-[#0f1419]"
              >
                Manager hinzufügen
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#2d3748]">
          <table className="w-full">
            <thead className="bg-[#1a2028]">
              <tr>
                <th 
                  className="px-3 py-2 text-center text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                  onClick={() => handleSort('positionTotal')}
                >
                  Pos<SortIcon column="positionTotal" />
                </th>
                <th 
                  className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                  onClick={() => handleSort('shortName')}
                >
                  Manager<SortIcon column="shortName" />
                </th>
                <th 
                  className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                  onClick={() => handleSort('firstName')}
                >
                  Vorname<SortIcon column="firstName" />
                </th>
                <th 
                  className="px-3 py-2 text-left text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                  onClick={() => handleSort('lastName')}
                >
                  Nachname<SortIcon column="lastName" />
                </th>
                <th 
                  className="px-3 py-2 text-center text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                  onClick={() => handleSort('pointsTotal')}
                >
                  Pkt<SortIcon column="pointsTotal" />
                </th>
                <th 
                  className="px-3 py-2 text-center text-[#a0aec0] font-medium cursor-pointer hover:text-[#c9a66b] border-b border-[#2d3748]"
                  onClick={() => handleSort('pointsLastRound')}
                >
                  Letzter Spieltag<SortIcon column="pointsLastRound" />
                </th>
                {group.editable && (
                  <th className="px-3 py-2 text-right text-[#a0aec0] font-medium border-b border-[#2d3748]">
                    Aktionen
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-[#1a2028]">
              {filteredAndSortedManagers.length > 0 ? (
                filteredAndSortedManagers.map(manager => (
                  <tr key={manager.id} className="hover:bg-[#242d38] border-b border-[#2d3748]">
                    <td className="px-3 py-2 text-center font-medium text-[#f5f5f5]">
                      {manager.positionTotal ? `${manager.positionTotal}.` : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <RouterLink
                        to={`/managers/${manager.id}`}
                        className="text-[#c9a66b] hover:text-[#f5f5f5] link font-medium"
                      >
                        {manager.shortName || manager.name}
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2 text-[#a0aec0]">
                      {manager.firstName || '-'}
                    </td>
                    <td className="px-3 py-2 text-[#a0aec0]">
                      {manager.lastName || '-'}
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-[#f5f5f5]">
                      {manager.pointsTotal ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-[#a0aec0]">
                      {manager.pointsLastRound ?? '-'}
                    </td>
                    {group.editable && (
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
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={group.editable ? 7 : 6} className="text-center text-[#6b7280] py-8">
                    Keine Manager in dieser Gruppe
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="p-0 bg-[#1a2028] border border-[#2d3748] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#242d38] px-6 py-4 border-b border-[#2d3748]">
              <h2 className="text-xl font-bold text-[#f5f5f5]">Manager hinzufügen</h2>
            </div>
            <div className="p-6">
              <Input
                placeholder="Manager suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                onPress={() => setIsAddModalOpen(false)}
                className="text-[#a0aec0]"
              >
                Abbrechen
              </Button>
            </div>
          </Card>
        </div>
      )}

      {isCreatorModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="p-0 bg-[#1a2028] border border-[#2d3748] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#242d38] px-6 py-4 border-b border-[#2d3748]">
              <h2 className="text-xl font-bold text-[#f5f5f5]">Ersteller ändern</h2>
            </div>
            <div className="p-6">
              <Input
                placeholder="User suchen..."
                value={creatorSearch}
                onChange={(e) => setCreatorSearch(e.target.value)}
                className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] mb-4"
                autoFocus
              />
              <div className="max-h-80 overflow-y-auto rounded-lg border border-[#2d3748]">
                {filteredUsers.length > 0 ? (
                  <div className="divide-y divide-[#2d3748]">
                    {filteredUsers.map(u => (
                      <div
                        key={u.id}
                        onClick={() => handleChangeCreator(u.id)}
                        className="p-4 hover:bg-[#242d38] cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-[#f5f5f5] font-medium group-hover:text-[#c9a66b]">
                            {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.login}
                          </div>
                          <div className="text-[#6b7280] text-sm">
                            {u.login}
                          </div>
                        </div>
                        <div className="text-[#c9a66b] opacity-0 group-hover:opacity-100 transition-opacity">
                          Auswählen
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-[#6b7280] py-8">
                    Keine User gefunden
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-[#242d38] border-t border-[#2d3748] flex justify-end">
              <Button
                variant="ghost"
                onPress={() => {
                  setIsCreatorModalOpen(false)
                  setCreatorSearch('')
                }}
                className="text-[#a0aec0]"
              >
                Abbrechen
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
