import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>
  if (!user) return <div className="text-center py-8 text-subtle">Profil nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/" className="text-accent hover:text-accent-hover mb-4 inline-block link">
        &larr; Zurück zur Startseite
      </RouterLink>

      <h1 className="text-3xl font-bold text-foreground mb-6">Mein Profil</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-2">Login-Name</label>
          <p className="text-foreground text-lg">{user.login}</p>
        </div>

        <div className="card p-6 bg-surface border border-border">
          <div>
            <label className="block text-sm text-muted mb-1">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="input-field w-full px-3 py-2 rounded bg-elevated border-border-hover text-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="card p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-2">Vorname</label>
          <p className="text-foreground text-lg">{user.firstName || '-'}</p>
        </div>

        <div className="card p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-2">Nachname</label>
          <p className="text-foreground text-lg">{user.lastName || '-'}</p>
        </div>

        <div className="card p-6 bg-surface border border-border">
          <label className="block text-sm text-muted mb-2">Theme Spieltagsmail</label>
          <select
            value={mailTheme}
            onChange={(e) => handleMailThemeChange(e.target.value as MailTheme)}
            className="w-full bg-elevated border border-border-hover text-foreground rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
          >
            {Object.entries(mailThemeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {hasChanges && (
        <div className="mt-6 flex gap-4">
          <button
            className="button-primary px-4 py-2 rounded font-medium hover:bg-button-primary-hover transition-colors"
            onClick={handleSave}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? 'Wird gespeichert...' : 'Speichern'}
          </button>
          <button
            className="button-secondary px-4 py-2 rounded transition-colors"
            onClick={handleCancel}
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  )
}
