import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { useManagerGroup, useAddManagerToGroup, useRemoveManagerFromGroup, useUpdateManagerGroup, useChangeCreator, useCreateManagerGroup } from '../hooks/useManagerGroups'
import { useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useUsers } from '../hooks/useUsers'
import { useAuth } from '../context/AuthContext'
import type { ManagerInGroup } from '../types'

type SortKey = 'positionTotal' | 'shortName' | 'firstName' | 'lastName' | 'pointsTotal' | 'pointsLastRound'
type SortOrder = 'asc' | 'desc'

const emailToOptions = [
  { value: 'ALL_MANAGERS', label: 'Alle Manager' },
  { value: 'CREATOR_ONLY', label: 'Nur Ersteller' }
]

export default function ManagerGroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const isNewMode = id === 'create'
  const groupId = isNewMode ? 0 : Number(id)
  
  const { data: group, isLoading, error } = useManagerGroup(groupId)
  const { data: currentSeason } = useCurrentSeason()
  const { data: allManagers } = useManagersBySeason(currentSeason?.id || 0)
  const { data: allUsers } = useUsers()
  
  const createMutation = useCreateManagerGroup()
  const addManagerMutation = useAddManagerToGroup(groupId)
  const removeManagerMutation = useRemoveManagerFromGroup(groupId)
  const updateMutation = useUpdateManagerGroup(groupId)
  const changeCreatorMutation = useChangeCreator(groupId)
  
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
  const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    if (isNewMode) {
      setEditName('')
      setEditDescription('')
      setEditEmailTo('ALL_MANAGERS')
      setSelectedManagerIds([])
      setHasChanges(false)
    } else if (group) {
      setEditName(group.name)
      setEditDescription(group.description || '')
      setEditEmailTo(group.emailTo || 'ALL_MANAGERS')
      setHasChanges(false)
    }
  }, [group, isNewMode])

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

  const selectedManagers = useMemo(() => {
    if (!isNewMode || !allManagers) return []
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
        positionTotal: m.positionTotal,
        positionLastRound: m.positionLastRound
      })) as ManagerInGroup[]
  }, [isNewMode, allManagers, selectedManagerIds])

  const filteredAndSortedManagers = useMemo(() => {
    const managerList = isNewMode ? selectedManagers : (group?.managers || [])
    
    if (managerFilter.trim()) {
      const filter = managerFilter.toLowerCase()
      return managerList.filter(m => 
        (m.shortName || m.name).toLowerCase().includes(filter) ||
        (m.firstName || '').toLowerCase().includes(filter) ||
        (m.lastName || '').toLowerCase().includes(filter)
      )
    }
    
    return managerList.sort((a, b) => {
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
  }, [isNewMode, selectedManagers, group?.managers, sortKey, sortOrder, managerFilter])

  const availableManagers = useMemo(() => {
    if (!allManagers) return []
    
    if (isNewMode) {
      return allManagers.filter(m => 
        !selectedManagerIds.includes(m.id) &&
        (m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         m.shortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         m.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         m.lastName?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    if (!group) return []
    const groupManagerIds = new Set(group.managers.map(m => m.id))
    return allManagers.filter(m => 
      !groupManagerIds.has(m.id) &&
      (m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       m.shortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       m.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       m.lastName?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [allManagers, isNewMode, selectedManagerIds, group, searchTerm])

  const filteredUsers = useMemo(() => {
    if (!allUsers) return []
    return allUsers.filter(u => 
      u.login.toLowerCase().includes(creatorSearch.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(creatorSearch.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(creatorSearch.toLowerCase())
    )
  }, [allUsers, creatorSearch])

  const handleAddManager = async (managerId: number) => {
    if (isNewMode) {
      setSelectedManagerIds(prev => [...prev, managerId])
    } else {
      await addManagerMutation.mutateAsync(managerId)
    }
    setIsAddModalOpen(false)
    setSearchTerm('')
  }

  const handleRemoveManager = async (managerId: number) => {
    if (isNewMode) {
      setSelectedManagerIds(prev => prev.filter(id => id !== managerId))
    } else {
      if (window.confirm('Möchten Sie diesen Manager wirklich aus der Gruppe entfernen?')) {
        await removeManagerMutation.mutateAsync(managerId)
      }
    }
  }

  const handleChangeCreator = async (newCreatorId: number) => {
    await changeCreatorMutation.mutateAsync(newCreatorId)
    setIsCreatorModalOpen(false)
    setCreatorSearch('')
  }

  const handleCreate = async () => {
    if (!editName.trim() || !editDescription.trim() || !currentSeason) {
      setErrorMessage('Bitte füllen Sie alle Pflichtfelder aus.')
      return
    }

    setErrorMessage('')
    try {
      const created = await createMutation.mutateAsync({
        name: editName.trim(),
        description: editDescription.trim(),
        seasonId: currentSeason.id,
        emailTo: editEmailTo as 'ALL_MANAGERS' | 'CREATOR_ONLY',
        managerIds: selectedManagerIds
      })
      navigate(`/manager-groups/${created.id}`, { replace: true })
    } catch {
      setErrorMessage('Fehler beim Erstellen der Gruppe.')
    }
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
    if (isNewMode) {
      return user?.login || 'Unbekannt'
    }
    if (!group) return 'Unbekannt'
    const firstName = group.createdByFirstName
    const lastName = group.createdByLastName
    const login = group.createdByLogin
    if (firstName && lastName) {
      return `${firstName} ${lastName} (${login})`
    }
    return login || 'Unbekannt'
  }

  if (!isNewMode && isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (!isNewMode && error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>
  if (!isNewMode && !group) return <div className="text-center py-8 text-subtle">Gruppe nicht gefunden</div>

  const pageTitle = isNewMode ? 'Neue Gruppe erstellen' : (group?.name || 'Gruppe')
  const canEdit = isNewMode || group?.editable

  return (
    <div>
      <RouterLink to="/manager-groups" className="text-accent hover:text-accent-hover mb-6 inline-block link">
        &larr; Zurück zur Übersicht
      </RouterLink>
      
      <h1 className="text-3xl font-bold text-foreground mb-6">{pageTitle}</h1>

      {!currentSeason && isNewMode && (
        <div className="p-4 mb-6 bg-danger-bg border border-danger">
          <p className="text-danger">
            Keine aktuelle Saison ausgewählt. Bitte erstellen Sie zuerst eine Saison.
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 mb-6 bg-danger-bg border border-danger">
          <p className="text-danger">{errorMessage}</p>
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <div className="p-6 bg-surface border border-border">
          <label className="text-muted block mb-2">Name <span className="text-danger">*</span></label>
          <input
            type="text"
            value={editName}
            onChange={(e) => handleChange('name', e.target.value)}
            readOnly={!canEdit}
            className={`input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border border-border-hover text-foreground ${!canEdit ? 'opacity-70' : ''}`}
          />
        </div>

        <div className="p-6 bg-surface border border-border">
          <label className="text-muted block mb-2">Beschreibung <span className="text-danger">*</span></label>
          <textarea
            value={editDescription}
            onChange={(e) => handleChange('description', e.target.value)}
            readOnly={!canEdit}
            className={`input-field w-full px-3 py-2 rounded resize-y focus:outline-none bg-elevated border border-border-hover text-foreground ${!canEdit ? 'opacity-70' : ''}`}
          />
        </div>

        <div className="p-6 bg-surface border border-border">
          <label className="text-muted block mb-3">Email an</label>
          <div className="flex gap-4">
            {emailToOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                  editEmailTo === option.value
                    ? 'bg-primary text-background'
                    : 'bg-elevated text-muted hover:bg-border-hover'
                } ${!canEdit ? 'pointer-events-none opacity-70' : ''}`}
              >
                <input
                  type="radio"
                  name="emailTo"
                  value={option.value}
                  checked={editEmailTo === option.value}
                  onChange={(e) => handleChange('emailTo', e.target.value)}
                  disabled={!canEdit}
                  className="hidden"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="p-6 bg-surface border border-border">
          <div className="flex items-center justify-between mb-1">
            <label className="text-muted">Ersteller</label>
            {isAdmin && !isNewMode && (
              <button
                onClick={() => setIsCreatorModalOpen(true)}
                className="text-accent text-sm px-2 py-1 rounded hover:bg-elevated transition-colors"
              >
                Ändern
              </button>
            )}
          </div>
          <input
            type="text"
            value={getCreatorDisplayName()}
            readOnly
            className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border border-border-hover text-foreground opacity-70"
          />
        </div>
      </div>

      <div className="p-6 bg-surface border border-border mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Manager ({filteredAndSortedManagers.length})</h2>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Manager suchen..."
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="input-field w-64 px-3 py-2 rounded focus:outline-none bg-elevated border border-border-hover text-foreground"
            />
            {canEdit && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary text-background px-4 py-2 rounded font-medium hover:bg-button-primary-hover transition-colors"
              >
                Manager hinzufügen
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th 
                  className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border"
                  onClick={() => handleSort('positionTotal')}
                >
                  Pos<SortIcon column="positionTotal" />
                </th>
                <th 
                  className="px-3 py-2 text-left text-muted font-medium cursor-pointer hover:text-accent border-b border-border"
                  onClick={() => handleSort('shortName')}
                >
                  Manager<SortIcon column="shortName" />
                </th>
                <th 
                  className="px-3 py-2 text-left text-muted font-medium cursor-pointer hover:text-accent border-b border-border"
                  onClick={() => handleSort('firstName')}
                >
                  Vorname<SortIcon column="firstName" />
                </th>
                <th 
                  className="px-3 py-2 text-left text-muted font-medium cursor-pointer hover:text-accent border-b border-border"
                  onClick={() => handleSort('lastName')}
                >
                  Nachname<SortIcon column="lastName" />
                </th>
                <th 
                  className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border"
                  onClick={() => handleSort('pointsTotal')}
                >
                  Pkt<SortIcon column="pointsTotal" />
                </th>
                <th 
                  className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border"
                  onClick={() => handleSort('pointsLastRound')}
                >
                  Letzter Spieltag<SortIcon column="pointsLastRound" />
                </th>
                {canEdit && (
                  <th className="px-3 py-2 text-right text-muted font-medium border-b border-border">
                    Aktionen
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-surface">
              {filteredAndSortedManagers.length > 0 ? (
                filteredAndSortedManagers.map(manager => (
                  <tr key={manager.id} className="hover:bg-elevated border-b border-border">
                    <td className="px-3 py-2 text-center font-medium text-foreground">
                      {manager.positionTotal ? `${manager.positionTotal}.` : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <RouterLink
                        to={`/managers/${manager.id}`}
                        className="text-accent hover:text-foreground link font-medium"
                      >
                        {manager.shortName || manager.name}
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {manager.firstName || '-'}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {manager.lastName || '-'}
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-foreground">
                      {manager.pointsTotal ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-muted">
                      {manager.pointsLastRound ?? '-'}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleRemoveManager(manager.id)}
                          className="text-danger text-sm px-2 py-1 rounded hover:bg-elevated transition-colors"
                        >
                          Entfernen
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="text-center text-subtle py-8">
                    Keine Manager in dieser Gruppe
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isNewMode ? (
        <div className="flex gap-4">
          <button
            onClick={handleCreate}
            disabled={!editName.trim() || !editDescription.trim() || !currentSeason || createMutation.isPending}
            className="bg-primary text-background px-4 py-2 rounded font-medium hover:bg-button-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Wird erstellt...' : 'Erstellen'}
          </button>
          <button
            onClick={() => navigate('/manager-groups')}
            className="text-muted px-4 py-2 rounded hover:bg-elevated transition-colors"
          >
            Abbrechen
          </button>
        </div>
      ) : canEdit && hasChanges && (
        <div className="mt-6 flex gap-4">
          <button
            onClick={handleSaveChanges}
            disabled={updateMutation.isPending || !editDescription.trim()}
            className="bg-primary text-background px-4 py-2 rounded font-medium hover:bg-button-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
          </button>
          <button
            onClick={() => {
              if (group) {
                setEditName(group.name)
                setEditDescription(group.description || '')
                setEditEmailTo(group.emailTo || 'ALL_MANAGERS')
                setHasChanges(false)
              }
            }}
            className="button-secondary px-4 py-2 rounded transition-colors"
          >
            Abbrechen
          </button>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="p-0 bg-surface border border-border w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-elevated px-6 py-4 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Manager hinzufügen</h2>
            </div>
            <div className="p-6">
              <input
                type="text"
                placeholder="Manager suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border border-border-hover text-foreground mb-4"
                autoFocus
              />
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                {availableManagers.length > 0 ? (
                  <div className="divide-y divide-[#2a3a4e]">
                    {availableManagers.map(manager => (
                      <div
                        key={manager.id}
                        onClick={() => handleAddManager(manager.id)}
                        className="p-4 hover:bg-elevated cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-foreground font-medium group-hover:text-accent">
                            {manager.shortName || manager.name}
                          </div>
                          <div className="text-subtle text-sm">
                            {manager.firstName} {manager.lastName}
                          </div>
                        </div>
                        <div className="text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          + Hinzufügen
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-subtle py-8">
                    Keine Manager gefunden
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-elevated border-t border-border flex justify-end">
              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setSearchTerm('')
                }}
                className="text-muted px-4 py-2 rounded hover:bg-elevated transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreatorModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="p-0 bg-surface border border-border w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-elevated px-6 py-4 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Ersteller ändern</h2>
            </div>
            <div className="p-6">
              <input
                type="text"
                placeholder="User suchen..."
                value={creatorSearch}
                onChange={(e) => setCreatorSearch(e.target.value)}
                className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border border-border-hover text-foreground mb-4"
                autoFocus
              />
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                {filteredUsers.length > 0 ? (
                  <div className="divide-y divide-[#2a3a4e]">
                    {filteredUsers.map(u => (
                      <div
                        key={u.id}
                        onClick={() => handleChangeCreator(u.id)}
                        className="p-4 hover:bg-elevated cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-foreground font-medium group-hover:text-accent">
                            {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.login}
                          </div>
                          <div className="text-subtle text-sm">
                            {u.login}
                          </div>
                        </div>
                        <div className="text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          Auswählen
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-subtle py-8">
                    Keine User gefunden
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-elevated border-t border-border flex justify-end">
              <button
                onClick={() => {
                  setIsCreatorModalOpen(false)
                  setCreatorSearch('')
                }}
                className="text-muted px-4 py-2 rounded hover:bg-elevated transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
