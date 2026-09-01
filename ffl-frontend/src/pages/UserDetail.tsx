import { useState, useEffect } from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { useUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import BackButton from '../components/BackButton'
import FormCard from '../components/FormCard'
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
  const { user: authUser } = useAuth()
  const isAdmin = authUser?.role === 'ADMIN'

  const [formData, setFormData] = useState<Partial<User>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        login: user.login,
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
        login: user.login,
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
      <BackButton to="/users" className="mb-4" />

      <div className="grid gap-6 md:grid-cols-2">
        <FormCard>
          <label className="block text-sm text-muted mb-1">Login-Name</label>
          <input
            value={isAdmin ? (formData.login ?? user.login) : user.login}
            readOnly={!isAdmin}
            onChange={isAdmin ? (e) => handleChange('login', e.target.value) : undefined}
            maxLength={25}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </FormCard>

        <FormCard>
          <label className="block text-sm text-muted mb-2">Rolle</label>
          <span className={`${roleChipClass[user.role as keyof typeof roleChipClass] || 'chip-accent'} text-xs font-medium px-2 py-0.5 rounded-badge`}>
            {roleLabels[user.role as keyof typeof roleLabels] || user.role}
          </span>
        </FormCard>

        <FormCard>
          <label className="block text-sm text-muted mb-1">Vorname <span className="text-muted">*</span></label>
          <input
            value={formData.firstName || ''}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </FormCard>

        <FormCard>
          <label className="block text-sm text-muted mb-1">Nachname <span className="text-muted">*</span></label>
          <input
            value={formData.lastName || ''}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </FormCard>

        <FormCard>
          <label className="block text-sm text-muted mb-1">E-Mail <span className="text-muted">*</span></label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </FormCard>

        <FormCard>
          <label className="block text-sm text-muted mb-1">Geburtsdatum</label>
          <input
            type="date"
            value={formData.birthday || ''}
            onChange={(e) => handleChange('birthday', e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </FormCard>

        <FormCard>
          <label className="block text-sm text-muted mb-1">Straße</label>
          <input
            value={formData.street || ''}
            onChange={(e) => handleChange('street', e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </FormCard>

        <FormCard>
          <label className="block text-sm text-muted mb-1">Stadt</label>
          <input
            value={formData.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            className="input-field w-full px-3 py-2 rounded-badge focus:outline-none"
          />
        </FormCard>
      </div>

      <div className="mt-6 flex gap-4">
        {hasChanges && (
          <>
            <Button
              variant="emphasized"
              onClick={handleSave}
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
            >
              Abbrechen
            </Button>
          </>
        )}
      </div>

      {updateUser.isError && (
        <div className="mt-4 bg-danger/10 border border-danger rounded-card p-4">
          <p className="text-danger text-sm font-medium">
            Fehler: {(updateUser.error as any)?.response?.data || (updateUser.error as Error)?.message || 'Unbekannter Fehler'}
          </p>
        </div>
      )}

      {user.managers && user.managers.length > 0 && (
        <FormCard className="mt-6">
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
                {user.managers.map((manager, index) => (
                  <tr key={manager.id} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                    <td className="px-4 py-2">
                      <RouterLink
                        to={`/managers/${manager.id}`}
                        className="link"
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
        </FormCard>
      )}

      <div className="mt-8">
        <Button
          variant="negative"
          onClick={handleDeleteClick}
        >
          Benutzer löschen
        </Button>
      </div>

      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <FormCard className="w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-4">Benutzer löschen</h2>
            <p className="text-muted mb-2">
              Möchten Sie den Benutzer <strong className="text-foreground">"{user.login}"</strong> wirklich löschen?
            </p>
            <p className="text-danger mb-6">
              Alle zugehörigen Manager werden ebenfalls gelöscht!
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="negative"
                onClick={handleDeleteConfirm}
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending ? 'Wird gelöscht...' : 'Löschen'}
              </Button>
            </div>
          </FormCard>
        </div>
      )}
    </div>
  )
}
