import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Card, TextField, Label, Input, Button } from '@heroui/react'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import type { MailTheme } from '../types'

const mailThemeLabels: Record<MailTheme, string> = {
  DARKMODE: 'Darkmode',
  LIGHTMODE: 'Lightmode'
}

export default function Profile() {
  const { data: user, isLoading, error } = useProfile()
  const updateProfile = useUpdateProfile()
  const [email, setEmail] = useState('')
  const [mailTheme, setMailTheme] = useState<MailTheme>('LIGHTMODE')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (user) {
      setEmail(user.email || '')
      setMailTheme(user.mailTheme || 'LIGHTMODE')
      setHasChanges(false)
    }
  }, [user])

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setHasChanges(value !== (user?.email || '') || mailTheme !== (user?.mailTheme || 'LIGHTMODE'))
  }

  const handleMailThemeChange = (value: MailTheme) => {
    setMailTheme(value)
    setHasChanges(email !== (user?.email || '') || value !== (user?.mailTheme || 'LIGHTMODE'))
  }

  const handleSave = async () => {
    if (!hasChanges) return
    await updateProfile.mutateAsync({ email, mailTheme })
    setHasChanges(false)
  }

  const handleCancel = () => {
    if (user) {
      setEmail(user.email || '')
      setMailTheme(user.mailTheme || 'LIGHTMODE')
      setHasChanges(false)
    }
  }

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>
  if (!user) return <div className="text-center py-8 text-[#6b7280]">Profil nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/" className="text-[#c9a66b] hover:text-[#d4b77a] mb-4 inline-block link">
        &larr; Zurück zur Startseite
      </RouterLink>

      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Mein Profil</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <Label className="text-[#a0aec0] block mb-2">Login-Name</Label>
          <p className="text-[#f5f5f5] text-lg">{user.login}</p>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="email">
            <Label className="text-[#a0aec0]">E-Mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <Label className="text-[#a0aec0] block mb-2">Vorname</Label>
          <p className="text-[#f5f5f5] text-lg">{user.firstName || '-'}</p>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <Label className="text-[#a0aec0] block mb-2">Nachname</Label>
          <p className="text-[#f5f5f5] text-lg">{user.lastName || '-'}</p>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <Label className="text-[#a0aec0] block mb-2">Theme Spieltagsmail</Label>
          <select
            value={mailTheme}
            onChange={(e) => handleMailThemeChange(e.target.value as MailTheme)}
            className="w-full bg-[#242d38] border border-[#3d4a5c] text-[#f5f5f5] rounded-lg px-4 py-2 focus:outline-none focus:border-[#c9a66b]"
          >
            {Object.entries(mailThemeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </Card>
      </div>

      {hasChanges && (
        <div className="mt-6 flex gap-4">
          <Button
            variant="primary"
            onPress={handleSave}
            isDisabled={updateProfile.isPending}
            className="bg-[#c9a66b] text-[#0f1419] font-medium"
          >
            {updateProfile.isPending ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
          <Button
            variant="secondary"
            onPress={handleCancel}
          >
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  )
}
