import { useState, useEffect } from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers'
import type { User } from '../types'

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  NORMAL: 'Normal',
  GUEST: 'Gast'
}

const roleChipClass: Record<string, string> = {
  ADMIN: 'chip-success',
  NORMAL: 'chip-warning',
  GUEST: 'chip-accent'
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: user, isLoading, error } = useUser(Number(id))
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [formData, setFormData] = useState<Partial<User>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        street: user.street,
        city: user.city,
        birthday: user.birthday
      })
      setHasChanges(false)
    }
  }, [user])

  const handleChange = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!user || !hasChanges) return
    await updateUser.mutateAsync({ id: user.id, data: formData })
    setHasChanges(false)
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        street: user.street,
        city: user.city,
        birthday: user.birthday
      })
      setHasChanges(false)
    }
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!user) return
    await deleteUser.mutateAsync(user.id)
    navigate('/users')
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>
  if (!user) return <div className="text-center py-8 text-subtle">Benutzer nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/users" className="text-accent hover:text-accent-hover mb-4 inline-block link">
        &larr; Zurück zur Übersicht
      </RouterLink>

      <div className="flex items-center gap-3 mb-6">
        <Settings size={28} className="text-accent" />
        <h1 className="text-2xl font-bold text-accent">Benutzer bearbeiten</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-1">Login-Name</label>
          <input
            value={user.login}
            readOnly
            className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground opacity-70"
          />
        </div>

        <div className="p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-2">Rolle</label>
          <span className={`${roleChipClass[user.role as keyof typeof roleChipClass] || 'chip-accent'} text-xs font-medium px-2 py-0.5 rounded`}>
            {roleLabels[user.role as keyof typeof roleLabels] || user.role}
          </span>
        </div>

        <div className="p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-1">Vorname <span className="text-danger">*</span></label>
          <input
            value={formData.firstName || ''}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
          />
        </div>

        <div className="p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-1">Nachname <span className="text-danger">*</span></label>
          <input
            value={formData.lastName || ''}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
          />
        </div>

        <div className="p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-1">E-Mail <span className="text-danger">*</span></label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
          />
        </div>

        <div className="p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-1">Geburtsdatum</label>
          <input
            type="date"
            value={formData.birthday || ''}
            onChange={(e) => handleChange('birthday', e.target.value)}
            className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
          />
        </div>

        <div className="p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-1">Straße</label>
          <input
            value={formData.street || ''}
            onChange={(e) => handleChange('street', e.target.value)}
            className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
          />
        </div>

        <div className="p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-1">Stadt</label>
          <input
            value={formData.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        {hasChanges && (
          <>
            <button
              onClick={handleSave}
              disabled={updateUser.isPending}
              className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors disabled:opacity-50"
            >
              {updateUser.isPending ? 'Wird gespeichert...' : 'Speichern'}
            </button>
            <button
              className="button-secondary px-4 py-2 rounded transition-colors"
              onClick={handleCancel}
            >
              Abbrechen
            </button>
          </>
        )}
      </div>

      {user.managers && user.managers.length > 0 && (
        <div className="p-6 mt-6 bg-surface border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Zugehörige Manager</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-muted">Name</th>
                  <th className="px-4 py-2 text-left text-muted">Kürzel</th>
                  <th className="px-4 py-2 text-left text-muted">Saison</th>
                </tr>
              </thead>
              <tbody>
                {user.managers.map(manager => (
                  <tr key={manager.id} className="hover:bg-elevated border-b border-border">
                    <td className="px-4 py-2">
                      <RouterLink
                        to={`/managers/${manager.id}`}
                        className="text-accent hover:text-foreground link"
                      >
                        {manager.name}
                      </RouterLink>
                    </td>
                    <td className="px-4 py-2 text-muted">{manager.shortName || '-'}</td>
                    <td className="px-4 py-2 text-muted">{manager.seasonName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={handleDeleteClick}
          className="text-danger border border-danger px-4 py-2 rounded hover:bg-danger/10 transition-colors"
        >
          Benutzer löschen
        </button>
      </div>

      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="p-6 bg-surface border border-border w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-4">Benutzer löschen</h2>
            <p className="text-muted mb-2">
              Möchten Sie den Benutzer <strong className="text-foreground">"{user.login}"</strong> wirklich löschen?
            </p>
            <p className="text-danger mb-6">
              Alle zugehörigen Manager werden ebenfalls gelöscht!
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="button-secondary px-4 py-2 rounded transition-colors text-muted"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteUser.isPending}
                className="bg-danger text-foreground px-4 py-2 rounded hover:bg-danger/80 transition-colors disabled:opacity-50"
              >
                {deleteUser.isPending ? 'Wird gelöscht...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
