import { useState, useEffect } from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { Card, TextField, Label, Input, Button, Chip } from '@heroui/react'
import { useUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers'
import type { User } from '../types'

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  NORMAL: 'Normal',
  GUEST: 'Gast'
}

const roleColors: Record<string, 'success' | 'warning' | 'default'> = {
  ADMIN: 'success',
  NORMAL: 'warning',
  GUEST: 'default'
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

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>
  if (!user) return <div className="text-center py-8 text-[#6b7280]">Benutzer nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/users" className="text-[#c9a66b] hover:text-[#d4b77a] mb-4 inline-block link">
        &larr; Zurück zur Übersicht
      </RouterLink>

      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Benutzer bearbeiten</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="login" isReadOnly>
            <Label className="text-[#a0aec0]">Login-Name</Label>
            <Input
              value={user.login}
              readOnly
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] opacity-70"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <Label className="text-[#a0aec0] block mb-2">Rolle</Label>
          <Chip
            color={roleColors[user.role as keyof typeof roleColors] || 'default'}
            variant="soft"
          >
            {roleLabels[user.role as keyof typeof roleLabels] || user.role}
          </Chip>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="firstName">
            <Label className="text-[#a0aec0]">Vorname <span className="text-[#e05252]">*</span></Label>
            <Input
              value={formData.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="lastName">
            <Label className="text-[#a0aec0]">Nachname <span className="text-[#e05252]">*</span></Label>
            <Input
              value={formData.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="email">
            <Label className="text-[#a0aec0]">E-Mail <span className="text-[#e05252]">*</span></Label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="birthday">
            <Label className="text-[#a0aec0]">Geburtsdatum</Label>
            <Input
              type="date"
              value={formData.birthday || ''}
              onChange={(e) => handleChange('birthday', e.target.value)}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="street">
            <Label className="text-[#a0aec0]">Straße</Label>
            <Input
              value={formData.street || ''}
              onChange={(e) => handleChange('street', e.target.value)}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="city">
            <Label className="text-[#a0aec0]">Stadt</Label>
            <Input
              value={formData.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
          </TextField>
        </Card>
      </div>

      <div className="mt-6 flex gap-4">
        {hasChanges && (
          <>
            <Button
              variant="primary"
              onPress={handleSave}
              isDisabled={updateUser.isPending}
              className="bg-[#c9a66b] text-[#0f1419] font-medium"
            >
              {updateUser.isPending ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
            <Button
              variant="secondary"
              onPress={handleCancel}
            >
              Abbrechen
            </Button>
          </>
        )}
      </div>

      {user.managers && user.managers.length > 0 && (
        <Card className="p-6 mt-6 bg-[#1a2028] border border-[#2d3748]">
          <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">Zugehörige Manager</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2d3748]">
                  <th className="px-4 py-2 text-left text-[#a0aec0]">Name</th>
                  <th className="px-4 py-2 text-left text-[#a0aec0]">Kürzel</th>
                  <th className="px-4 py-2 text-left text-[#a0aec0]">Saison</th>
                </tr>
              </thead>
              <tbody>
                {user.managers.map(manager => (
                  <tr key={manager.id} className="hover:bg-[#242d38] border-b border-[#2d3748]">
                    <td className="px-4 py-2">
                      <RouterLink
                        to={`/managers/${manager.id}`}
                        className="text-[#c9a66b] hover:text-[#f5f5f5] link"
                      >
                        {manager.name}
                      </RouterLink>
                    </td>
                    <td className="px-4 py-2 text-[#a0aec0]">{manager.shortName || '-'}</td>
                    <td className="px-4 py-2 text-[#a0aec0]">{manager.seasonName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="mt-8">
        <Button
          variant="ghost"
          onPress={handleDeleteClick}
          className="text-[#e05252] border-[#e05252]"
        >
          Benutzer löschen
        </Button>
      </div>

      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 bg-[#1a2028] border border-[#2d3748] w-full max-w-md">
            <h2 className="text-xl font-bold text-[#f5f5f5] mb-4">Benutzer löschen</h2>
            <p className="text-[#a0aec0] mb-2">
              Möchten Sie den Benutzer <strong className="text-[#f5f5f5]">"{user.login}"</strong> wirklich löschen?
            </p>
            <p className="text-[#e05252] mb-6">
              Alle zugehörigen Manager werden ebenfalls gelöscht!
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onPress={() => setDeleteDialogOpen(false)}
                className="text-[#a0aec0]"
              >
                Abbrechen
              </Button>
              <Button
                onPress={handleDeleteConfirm}
                isDisabled={deleteUser.isPending}
                className="bg-[#e05252] text-[#f5f5f5]"
              >
                {deleteUser.isPending ? 'Wird gelöscht...' : 'Löschen'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
