import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useManagerGroup, useAddManagerToGroup, useRemoveManagerFromGroup, useUpdateManagerGroup, useChangeCreator, useCreateManagerGroup, useGroupLogo, useUploadGroupLogo, useDeleteGroupLogo, useDeleteManagerGroup } from '../hooks/useManagerGroups'
import { useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useUsers } from '../hooks/useUsers'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import SortIcon from '../components/SortIcon'
import { TableHead, ThSortable, Th, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'
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
  
  const isMobile = useIsMobile()
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
  const deleteMutation = useDeleteManagerGroup()
  
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false)
  const [creatorSearch, setCreatorSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editEmailTo, setEditEmailTo] = useState<string>('ALL_MANAGERS')
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [stammdatenOpen, setStammdatenOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadGroupLogo = useUploadGroupLogo(isNewMode ? 0 : groupId)
  const deleteGroupLogo = useDeleteGroupLogo(isNewMode ? 0 : groupId)
  const { data: groupLogoUrl } = useGroupLogo(group?.hasLogo ? groupId : null)

  const isAdmin = user?.role === 'ADMIN'
  const canNavigateToManager = isAdmin || currentSeason?.seasonState !== 'BEFORE_SEASON'

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
  }, [isNewMode, selectedManagers, group?.managers, sortKey, sortOrder])

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

  const handleReset = () => {
    if (isNewMode) {
      setEditName('')
      setEditDescription('')
      setEditEmailTo('ALL_MANAGERS')
    } else if (group) {
      setEditName(group.name)
      setEditDescription(group.description || '')
      setEditEmailTo(group.emailTo || 'ALL_MANAGERS')
    }
    setHasChanges(false)
    setErrorMessage('')
  }

  const handleDeleteGroup = async () => {
    if (!group) return
    if (window.confirm('Möchten Sie diese Gruppe wirklich löschen?')) {
      try {
        await deleteMutation.mutateAsync(group.id)
        navigate('/manager-groups')
      } catch {
        setErrorMessage('Fehler beim Löschen der Gruppe.')
      }
    }
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

  if (!isNewMode && isLoading) {
    return (
      <div className="max-w-6xl" aria-busy="true">
        <RouterLink to="/manager-groups" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline font-semibold mb-4">
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück zur Übersicht
        </RouterLink>
        <div className="p-4 bg-elevated border border-border rounded-card mb-6">
          <div className="flex gap-6">
            <div className="w-16 h-16 rounded-full bg-card-muted animate-pulse motion-reduce:animate-none shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-3 w-24 rounded-control bg-card-muted animate-pulse motion-reduce:animate-none mb-3" />
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(i => (
                  <div key={i}>
                    <div className="h-3 w-16 rounded-control bg-card-muted animate-pulse motion-reduce:animate-none mb-2" />
                    <div className="h-8 w-full rounded-control bg-card-muted animate-pulse motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-surface border border-border rounded-card mb-6">
          <div className="h-5 w-32 rounded-control bg-card-muted animate-pulse motion-reduce:animate-none mb-4" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-10 w-full rounded-control bg-card-muted animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (!isNewMode && error) {
    return (
      <div className="max-w-6xl">
        <RouterLink to="/manager-groups" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline font-semibold mb-4">
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück zur Übersicht
        </RouterLink>
        <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-card">
          <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
          <p className="text-danger text-sm">Fehler beim Laden der Gruppe.</p>
        </div>
      </div>
    )
  }
  if (!isNewMode && !group) {
    return (
      <div className="max-w-6xl">
        <RouterLink to="/manager-groups" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline font-semibold mb-4">
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück zur Übersicht
        </RouterLink>
        <div className="flex items-center gap-3 p-3 bg-elevated border border-border rounded-card">
          <i className="sap-icon sap-icon-information text-[18px] text-muted shrink-0" />
          <p className="text-sm text-muted">Gruppe nicht gefunden.</p>
        </div>
      </div>
    )
  }

  const pageTitle = isNewMode ? 'Neue Gruppe erstellen' : (group?.name || 'Gruppe')
  const canEdit = isNewMode || group?.editable

  return (
    <div className="max-w-6xl">
      <RouterLink to="/manager-groups" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline font-semibold mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Übersicht
      </RouterLink>

      {!isNewMode && !canEdit && (
        <div className="flex items-center gap-3 p-3 bg-elevated border border-border rounded-card mb-6">
          <i className="sap-icon sap-icon-information text-[18px] text-muted shrink-0" />
          <p className="text-sm text-muted">
            Nur Lesezugriff – nur der Ersteller kann diese Gruppe bearbeiten.
          </p>
        </div>
      )}

      {!currentSeason && isNewMode && (
        <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-card mb-6">
          <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
          <p className="text-danger text-sm">
            Keine aktuelle Saison ausgewählt. Bitte erstellen Sie zuerst eine Saison.
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-card mb-6">
          <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
          <p className="text-danger text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="p-4 bg-elevated border border-border rounded-card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-center gap-4 sm:items-start">
            <div className="relative group w-12 h-12 shrink-0">
              <button
                onClick={handleLogoClick}
                className={`w-12 h-12 p-0 rounded-full overflow-hidden ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                disabled={!canEdit || isNewMode || uploadGroupLogo.isPending || deleteGroupLogo.isPending}
                title={canEdit && !isNewMode ? 'Logo ändern' : undefined}
              >
                {groupLogoUrl ? (
                  <img
                    src={groupLogoUrl}
                    alt={pageTitle}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-accent-muted text-accent flex items-center justify-center">
                    <i className="sap-icon sap-icon-group-2 text-xl" />
                  </div>
                )}
              </button>
              {canEdit && !isNewMode && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                  <i className="sap-icon sap-icon-camera text-white text-sm" />
                </div>
              )}
              {canEdit && !isNewMode && groupLogoUrl && (
                <button
                  type="button"
                  onClick={handleLogoDelete}
                  disabled={deleteGroupLogo.isPending || uploadGroupLogo.isPending}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger hover:bg-danger-hover text-danger-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto shadow-md"
                  title="Logo löschen"
                >
                  <i className="sap-icon sap-icon-delete text-[10px]" />
                </button>
              )}
              {(uploadGroupLogo.isPending || deleteGroupLogo.isPending) && (
                <div className="absolute inset-0 bg-surface/80 flex items-center justify-center rounded-full">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              {!stammdatenOpen && !isNewMode && (
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground truncate">{group?.name || '-'}</h2>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-subtle">Erstellt von:</p>
                      <p className="text-sm font-semibold text-foreground">{getCreatorDisplayName()}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-subtle">E-Mail:</p>
                      <p className="text-sm font-semibold text-foreground">
                        {group?.emailTo === 'CREATOR_ONLY' ? 'Nur an Ersteller' : 'An alle Manager'}
                      </p>
                    </div>
                  </div>
                  {group?.description && (
                    <>
                      <div className="mt-3 pt-3 border-t border-border" />
                      <p className="text-base italic text-muted whitespace-pre-wrap">{group.description}</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {canEdit && !isNewMode && (
              <button
                type="button"
                onClick={() => setStammdatenOpen(o => !o)}
                aria-expanded={stammdatenOpen}
                aria-controls="stammdaten-form"
                aria-label={stammdatenOpen ? 'Bearbeitung schließen' : 'Gruppe bearbeiten'}
                title={stammdatenOpen ? 'Schließen' : 'Bearbeiten'}
                className="sm:hidden shrink-0 ml-auto w-9 h-9 rounded-full bg-accent-muted text-accent hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors shadow-sm"
              >
                <i className={`sap-icon ${stammdatenOpen ? 'sap-icon-decline' : 'sap-icon-edit'} text-sm`} />
              </button>
            )}
          </div>

          {canEdit && !isNewMode && (
            <div className="hidden sm:flex gap-2 shrink-0 self-start sm:ml-auto">
              <Button
                variant={stammdatenOpen ? 'ghost' : 'emphasized'}
                size="sm"
                onClick={() => setStammdatenOpen(o => !o)}
                aria-expanded={stammdatenOpen}
                aria-controls="stammdaten-form"
              >
                <i className={`sap-icon sap-icon-slim-arrow-${stammdatenOpen ? 'up' : 'down'} text-xs mr-1`} />
                {stammdatenOpen ? 'Schließen' : 'Bearbeiten'}
              </Button>
              <Button
                variant="negative"
                size="sm"
                onClick={handleDeleteGroup}
                disabled={deleteMutation.isPending}
              >
                <i className="sap-icon sap-icon-delete text-xs mr-1" />
                Löschen
              </Button>
            </div>
          )}
        </div>

        {(stammdatenOpen || isNewMode) && (
          <div id="stammdaten-form" className={isNewMode ? '' : 'mt-4 pt-4 border-t border-border'}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="min-w-0">
                <span className="text-xs text-muted">Name <span className="text-danger">*</span></span>
                <input
                  type="text"
                  value={editName}
                  onChange={canEdit ? (e) => handleChange('name', e.target.value) : undefined}
                  readOnly={!canEdit}
                  disabled={!canEdit}
                  className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-muted">Email an <span className="text-danger">*</span></span>
                <select
                  value={editEmailTo}
                  onChange={canEdit ? (e) => handleChange('emailTo', e.target.value) : undefined}
                  disabled={!canEdit}
                  className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1 cursor-pointer"
                >
                  {emailToOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <span className="text-xs text-muted">Ersteller</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={getCreatorDisplayName()}
                    readOnly
                    className="input-field control w-full px-2 py-1 rounded-control text-sm"
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
              <div className="col-span-1 sm:col-span-3 min-w-0">
                <span className="text-xs text-muted">Beschreibung <span className="text-danger">*</span></span>
                <textarea
                  value={editDescription}
                  onChange={canEdit ? (e) => handleChange('description', e.target.value) : undefined}
                  readOnly={!canEdit}
                  disabled={!canEdit}
                  className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1 resize-y"
                />
              </div>
            </div>
            {canEdit && hasChanges && (
              <div className="mt-3 flex gap-2">
                {isNewMode ? (
                  <Button
                    variant="emphasized"
                    size="sm"
                    onClick={handleCreate}
                    disabled={!editName.trim() || !editDescription.trim() || !currentSeason || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Wird erstellt...' : 'Erstellen'}
                  </Button>
                ) : (
                  <Button
                    variant="emphasized"
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={updateMutation.isPending || !editDescription.trim()}
                  >
                    {updateMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isNewMode ? () => navigate('/manager-groups') : handleReset}
                >
                  Abbrechen
                </Button>
              </div>
            )}
            {canEdit && !isNewMode && (
              <div className="mt-3 sm:hidden">
                <Button
                  variant="negative"
                  size="sm"
                  className="w-full"
                  onClick={handleDeleteGroup}
                  disabled={deleteMutation.isPending}
                >
                  <i className="sap-icon sap-icon-delete text-xs mr-1" />
                  Gruppe löschen
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 bg-surface border border-border rounded-card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-foreground">Manager ({filteredAndSortedManagers.length})</h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {canEdit && (
              <Button
                variant="emphasized"
                className="w-full sm:w-auto"
                onClick={() => setIsAddModalOpen(true)}
              >
                Manager hinzufügen
              </Button>
            )}
          </div>
        </div>

        {!isMobile && (
          <div className="overflow-x-auto rounded-card border border-border">
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
                      {canNavigateToManager ? (
                        <RouterLink
                          to={`/managers/${manager.id}`}
                          className="link font-medium"
                        >
                          {manager.shortName || manager.name}
                        </RouterLink>
                      ) : (
                        <span className="font-medium text-foreground">
                          {manager.shortName || manager.name}
                        </span>
                      )}
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
        )}

        {isMobile && (
          <div>
            {canEdit && filteredAndSortedManagers.length > 0 && (
              <div className="flex items-start gap-2 p-2 mb-4 bg-accent-muted border border-accent/30 rounded-card">
                <i className="sap-icon sap-icon-hint text-[16px] text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  Tipp: Linken Farbrand antippen, um den Manager zu entfernen.
                </p>
              </div>
            )}
            <div className="grid gap-3">
              {filteredAndSortedManagers.length > 0 ? (
                filteredAndSortedManagers.map((manager) => {
                  const fullName = [manager.firstName, manager.lastName].filter(Boolean).join(' ') || manager.shortName || manager.name || '-'
                  return (
                    <div
                      key={manager.id}
                      className="group relative overflow-hidden bg-surface border border-border rounded-none p-3 pl-4 flex items-center gap-2 transition-colors hover:border-border-hover"
                    >
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveManager(manager.id)}
                          aria-label={`${manager.shortName || manager.name} entfernen`}
                          title="Entfernen"
                          className="group/bar absolute left-0 top-0 bottom-0 w-4 flex items-center justify-start cursor-pointer hover:bg-accent-soft/40 transition-colors"
                        >
                          <span className="w-[3px] h-full bg-accent group-hover/bar:w-[5px] transition-all" />
                        </button>
                      ) : (
                        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveManager(manager.id)}
                          aria-label={`${manager.shortName || manager.name} entfernen`}
                          title="Entfernen"
                          className="hidden sm:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-danger hover:bg-danger-hover text-danger-foreground items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                        >
                          <i className="sap-icon sap-icon-decline text-base" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        {canNavigateToManager ? (
                          <RouterLink
                            to={`/managers/${manager.id}`}
                            className="link text-base font-semibold leading-6 truncate block"
                          >
                            {fullName}
                          </RouterLink>
                        ) : (
                          <p className="text-base font-semibold text-foreground leading-6 truncate">
                            {fullName}
                          </p>
                        )}
                        {manager.login && (
                          <p className="text-sm text-muted leading-5 truncate">{manager.login}</p>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-subtle py-8">
                  Keine Manager in dieser Gruppe
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
                className="input-field control w-full px-3 py-2 rounded-control text-sm focus:outline-none mb-4"
                autoFocus
              />
              <div className="max-h-80 overflow-y-auto rounded-card border border-border">
                {availableManagers.length > 0 ? (
                  <div className="divide-y divide-border">
                    {availableManagers.map(manager => (
                      <div
                        key={manager.id}
                        onClick={() => handleAddManager(manager.id)}
                        className="p-4 hover:bg-elevated cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-foreground font-medium">
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
                className="input-field control w-full px-3 py-2 rounded-control text-sm focus:outline-none mb-4"
                autoFocus
              />
              <div className="max-h-80 overflow-y-auto rounded-card border border-border">
                {filteredUsers.length > 0 ? (
                  <div className="divide-y divide-border">
                    {filteredUsers.map(u => (
                      <div
                        key={u.id}
                        onClick={() => handleChangeCreator(u.id)}
                        className="p-4 hover:bg-elevated cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-foreground font-medium">
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
