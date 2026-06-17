import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useManagerGroup, useAddManagerToGroup, useRemoveManagerFromGroup, useUpdateManagerGroup, useChangeCreator, useCreateManagerGroup, useGroupLogo, useUploadGroupLogo, useDeleteGroupLogo } from '../hooks/useManagerGroups'
import { useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useUsers } from '../hooks/useUsers'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Badge from '../components/Badge'
import CardContainer from '../components/CardContainer'
import SortIcon from '../components/SortIcon'
import { TableHead, ThSortable, Th, TableBody } from '../components/Table'
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
  const [isEditing, setIsEditing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadGroupLogo = useUploadGroupLogo(isNewMode ? 0 : groupId)
  const deleteGroupLogo = useDeleteGroupLogo(isNewMode ? 0 : groupId)
  const { data: groupLogoUrl } = useGroupLogo(group?.hasLogo ? groupId : null)

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
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    if (group) {
      setEditName(group.name)
      setEditDescription(group.description || '')
      setEditEmailTo(group.emailTo || 'ALL_MANAGERS')
      setHasChanges(false)
    }
    setIsEditing(false)
  }

  const handleLogoClick = () => {
    if (!canEdit) return
    fileInputRef.current?.click()
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !groupId) return
    try {
      await uploadGroupLogo.mutateAsync(file)
      setErrorMessage('')
    } catch (err: any) {
      console.error('Logo upload failed:', err)
      const msg = err?.response?.data || err?.message || 'Fehler beim Hochladen des Logos.'
      setErrorMessage(typeof msg === 'string' ? msg : 'Fehler beim Hochladen des Logos.')
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleLogoDelete = async () => {
    if (!groupId) return
    try {
      await deleteGroupLogo.mutateAsync()
      setErrorMessage('')
    } catch (err: any) {
      console.error('Logo delete failed:', err)
      const msg = err?.response?.data || err?.message || 'Fehler beim Löschen des Logos.'
      setErrorMessage(typeof msg === 'string' ? msg : 'Fehler beim Löschen des Logos.')
    }
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
  const managerCount = isNewMode ? selectedManagerIds.length : (group?.managers?.length ?? 0)
  const emailToLabel = emailToOptions.find(o => o.value === editEmailTo)?.label || '-'

  return (
    <div>
      <RouterLink to="/manager-groups" className="inline-flex items-center gap-1 text-sm text-[#c9a66b] hover:text-[#d4b77a] hover:underline mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Übersicht
      </RouterLink>

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

      <CardContainer>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] md:grid-rows-[auto_auto] gap-3 md:gap-x-6 md:gap-y-3">
            <div className="relative group w-24 h-24 shrink-0 justify-self-center md:justify-self-start row-span-1 md:row-span-2">
              <button
                onClick={handleLogoClick}
                className={`w-24 h-24 p-0 rounded-full overflow-hidden ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                disabled={!canEdit || uploadGroupLogo.isPending || deleteGroupLogo.isPending}
                title={canEdit ? 'Logo ändern' : undefined}
              >
                {groupLogoUrl ? (
                  <img
                    src={groupLogoUrl}
                    alt={pageTitle}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-elevated flex items-center justify-center">
                    <i className="sap-icon sap-icon-group-2 text-[36px] text-primary" />
                  </div>
                )}
              </button>
              {canEdit && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                  <i className="sap-icon sap-icon-camera text-white text-xl" />
                </div>
              )}
              {canEdit && groupLogoUrl && (
                <button
                  type="button"
                  onClick={handleLogoDelete}
                  disabled={deleteGroupLogo.isPending || uploadGroupLogo.isPending}
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto shadow-md"
                  title="Logo löschen"
                >
                  <i className="sap-icon sap-icon-delete text-sm" />
                </button>
              )}
              {(uploadGroupLogo.isPending || deleteGroupLogo.isPending) && (
                <div className="absolute inset-0 bg-surface/80 flex items-center justify-center rounded-full">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
              <Badge variant="muted">Gruppe</Badge>
              {isNewMode && <Badge variant="accent">Neu</Badge>}
              {canEdit && !isNewMode && !isEditing && (
                <Button variant="transparent" size="compact" onClick={() => setIsEditing(true)}>
                  Bearbeiten
                </Button>
              )}
              {canEdit && !isNewMode && isEditing && (
                <Button variant="transparent" size="compact" onClick={handleCancelEdit}>
                  Abbrechen
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 md:flex md:items-start md:gap-2">
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-group-2 text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Manager</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{managerCount}</p>
                </div>
              </div>
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-employee text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Ersteller</p>
                  <p className="text-sm font-bold text-foreground leading-tight truncate max-w-[120px]">{getCreatorDisplayName()}</p>
                </div>
              </div>
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-email text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Email an</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{emailToLabel}</p>
                </div>
              </div>
              <div className="p-2 bg-elevated border border-border-hover rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="sap-icon sap-icon-document-text text-base text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted leading-tight">Beschreibung</p>
                  <p className="text-sm font-bold text-foreground leading-tight truncate max-w-[120px]">{editDescription || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          {(isEditing || isNewMode) && canEdit && (
            <div className="mt-6 p-4 bg-elevated border border-border rounded-lg">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-muted block mb-2 text-sm">Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="input-field w-full px-3 py-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-2 text-sm">Beschreibung <span className="text-danger">*</span></label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="input-field w-full px-3 py-2 rounded resize-y focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-2 text-sm">Email an</label>
                  <div className="flex gap-4">
                    {emailToOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                          editEmailTo === option.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-surface text-muted hover:bg-border-hover'
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
                </div>
                <div>
                  <label className="text-muted block mb-2 text-sm">Ersteller</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={getCreatorDisplayName()}
                      readOnly
                      className="input-field w-full px-3 py-2 rounded focus:outline-none opacity-70"
                    />
                    {isAdmin && !isNewMode && (
                      <Button
                        variant="transparent"
                        size="compact"
                        onClick={() => setIsCreatorModalOpen(true)}
                      >
                        Ändern
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(isNewMode || (canEdit && isEditing)) && (
            <div className="mt-4 flex gap-4">
              {isNewMode ? (
                <>
                  <Button
                    variant="emphasized"
                    onClick={handleCreate}
                    disabled={!editName.trim() || !editDescription.trim() || !currentSeason || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Wird erstellt...' : 'Erstellen'}
                  </Button>
                  <Button
                    variant="transparent"
                    onClick={() => navigate('/manager-groups')}
                  >
                    Abbrechen
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="emphasized"
                    onClick={handleSaveChanges}
                    disabled={updateMutation.isPending || !hasChanges || !editDescription.trim()}
                  >
                    {updateMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleCancelEdit}
                  >
                    Abbrechen
                  </Button>
                </>
              )}
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Manager ({filteredAndSortedManagers.length})</h2>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="Manager suchen..."
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="input-field w-64 px-3 py-2 rounded focus:outline-none"
                />
                {canEdit && (
                  <Button
                    variant="emphasized"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    Manager hinzufügen
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full">
                <TableHead>
                  <tr>
                    <ThSortable align="center" onClick={() => handleSort('positionTotal')}>
                      Pos<SortIcon column="positionTotal" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable onClick={() => handleSort('shortName')}>
                      Manager<SortIcon column="shortName" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable onClick={() => handleSort('firstName')}>
                      Vorname<SortIcon column="firstName" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable onClick={() => handleSort('lastName')}>
                      Nachname<SortIcon column="lastName" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable align="center" onClick={() => handleSort('pointsTotal')}>
                      Pkt<SortIcon column="pointsTotal" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable align="center" onClick={() => handleSort('pointsLastRound')}>
                      Letzter Spieltag<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    {canEdit && (
                      <Th align="right">
                        Aktionen
                      </Th>
                    )}
                  </tr>
                </TableHead>
                <TableBody>
                  {filteredAndSortedManagers.length > 0 ? (
                    filteredAndSortedManagers.map((manager, index) => (
                      <tr key={manager.id} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                        <td className="px-3 py-2 text-center font-medium text-foreground">
                          {manager.positionTotal ? `${manager.positionTotal}.` : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <RouterLink
                            to={`/managers/${manager.id}`}
                            className="text-primary hover:text-foreground link font-medium"
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
                            <Button
                              variant="negative"
                              size="compact"
                              onClick={() => handleRemoveManager(manager.id)}
                            >
                              Entfernen
                            </Button>
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
                </TableBody>
              </table>
            </div>
          </div>
        </div>
      </CardContainer>

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
                className="input-field w-full px-3 py-2 rounded focus:outline-none mb-4"
                autoFocus
              />
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                {availableManagers.length > 0 ? (
                  <div className="divide-y divide-border">
                    {availableManagers.map(manager => (
                      <div
                        key={manager.id}
                        onClick={() => handleAddManager(manager.id)}
                        className="p-4 hover:bg-elevated cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-foreground font-medium group-hover:text-primary">
                            {manager.shortName || manager.name}
                          </div>
                          <div className="text-subtle text-sm">
                            {manager.firstName} {manager.lastName}
                          </div>
                        </div>
                        <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
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
              <Button
                variant="transparent"
                onClick={() => {
                  setIsAddModalOpen(false)
                  setSearchTerm('')
                }}
              >
                Abbrechen
              </Button>
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
                className="input-field w-full px-3 py-2 rounded focus:outline-none mb-4"
                autoFocus
              />
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                {filteredUsers.length > 0 ? (
                  <div className="divide-y divide-border">
                    {filteredUsers.map(u => (
                      <div
                        key={u.id}
                        onClick={() => handleChangeCreator(u.id)}
                        className="p-4 hover:bg-elevated cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-foreground font-medium group-hover:text-primary">
                            {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.login}
                          </div>
                          <div className="text-subtle text-sm">
                            {u.login}
                          </div>
                        </div>
                        <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
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
              <Button
                variant="transparent"
                onClick={() => {
                  setIsCreatorModalOpen(false)
                  setCreatorSearch('')
                }}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
