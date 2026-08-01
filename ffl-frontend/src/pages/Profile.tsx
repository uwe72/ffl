import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import FormCard from '../components/FormCard'
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

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>
  if (!user) return <div className="text-center py-8 text-subtle">Profil nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Startseite
      </RouterLink>

      <PageHeader icon="sap-icon-settings" title="Mein Profil" />

      <FormCard>
        <div className="flex flex-wrap gap-6">
          <div className="w-[320px] max-w-full">
            <label className="block text-xs text-muted mb-0.5">Login-Name</label>
            <input
              type="text"
              value={user.login}
              readOnly
              disabled
              className="input-field w-full px-2 py-1 rounded text-sm"
            />
          </div>
          <div className="w-[320px] max-w-full">
            <label className="block text-xs text-muted mb-0.5">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="input-field w-full px-2 py-1 rounded text-sm"
            />
          </div>
          <div className="w-[320px] max-w-full">
            <label className="block text-xs text-muted mb-0.5">Vorname</label>
            <input
              type="text"
              value={user.firstName || '-'}
              readOnly
              disabled
              className="input-field w-full px-2 py-1 rounded text-sm"
            />
          </div>
          <div className="w-[320px] max-w-full">
            <label className="block text-xs text-muted mb-0.5">Nachname</label>
            <input
              type="text"
              value={user.lastName || '-'}
              readOnly
              disabled
              className="input-field w-full px-2 py-1 rounded text-sm"
            />
          </div>
          <div className="w-[320px] max-w-full">
            <label className="block text-xs text-muted mb-0.5">Theme Spieltagsmail</label>
            <select
              value={mailTheme}
              onChange={(e) => handleMailThemeChange(e.target.value as MailTheme)}
              className="input-field w-full px-2 py-1 rounded text-sm focus:outline-none focus:border-accent"
            >
              {Object.entries(mailThemeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </FormCard>

      {hasChanges && (
        <div className="mt-6 flex gap-4">
          <Button
            variant="emphasized"
            onClick={handleSave}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
          >
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  )
}
