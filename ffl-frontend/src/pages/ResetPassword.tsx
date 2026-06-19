import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'
import Button from '../components/Button'

interface FieldErrors {
  newPassword?: string
  confirmPassword?: string
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const navigate = useNavigate()
  const firstInputRef = useRef<HTMLInputElement>(null)

  const validateField = (field: keyof FieldErrors, value: string) => {
    if (field === 'newPassword') {
      if (!value.trim()) {
        setFieldErrors(prev => ({ ...prev, newPassword: 'Dieses Feld ist erforderlich.' }))
        return false
      }
      if (value.length < 6) {
        setFieldErrors(prev => ({ ...prev, newPassword: 'Passwort muss mindestens 6 Zeichen lang sein.' }))
        return false
      }
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next.newPassword
        return next
      })
      return true
    }
    if (field === 'confirmPassword') {
      if (!value.trim()) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: 'Dieses Feld ist erforderlich.' }))
        return false
      }
      if (value !== newPassword) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwörter stimmen nicht überein.' }))
        return false
      }
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next.confirmPassword
        return next
      })
      return true
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const errors: FieldErrors = {}
    if (!newPassword.trim()) {
      errors.newPassword = 'Dieses Feld ist erforderlich.'
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Passwort muss mindestens 6 Zeichen lang sein.'
    }
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Dieses Feld ist erforderlich.'
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwörter stimmen nicht überein.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    if (!token) {
      setError('Ungültiger Link. Bitte fordere einen neuen an.')
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      await authApi.resetPassword(token, newPassword)
      setSuccess(true)
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } }
      const message = axiosError?.response?.data?.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/background.png')" }}>
        <div className="bg-surface border border-border rounded-lg w-full max-w-[440px] max-h-[90vh] flex flex-col shadow-2xl">
          <div className="flex items-start justify-between px-6 pt-6 pb-2">
            <div>
              <h2 className="text-xl font-bold text-foreground">FFL</h2>
              <p className="text-muted text-sm mt-0.5">Passwort zurücksetzen</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-md">
                <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
                <p className="text-danger text-sm">Ungültiger Link. Bitte fordere einen neuen an.</p>
              </div>
              <div className="border-t border-border pt-4">
                <Button
                  variant="emphasized"
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                >
                  Neuen Link anfordern
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/background.png')" }}>
      <div className="bg-surface border border-border rounded-lg w-full max-w-[440px] max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <h2 className="text-xl font-bold text-foreground">FFL</h2>
            <p className="text-muted text-sm mt-0.5">Neues Passwort vergeben</p>
          </div>
          <button
            className="p-1.5 rounded-md text-subtle hover:text-foreground hover:bg-elevated transition-colors -mr-1.5 mt-0.5"
            onClick={() => navigate('/login')}
            aria-label="Schließen"
          >
            <i className="sap-icon sap-icon-decline text-[20px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {success ? (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3 p-3 bg-success-bg border border-success/30 rounded-md">
                <i className="sap-icon sap-icon-message-success text-[18px] text-success shrink-0" />
                <p className="text-success text-sm">
                  Dein Passwort wurde erfolgreich zurückgesetzt.
                </p>
              </div>
              <div className="border-t border-border pt-4">
                <Button
                  variant="emphasized"
                  type="button"
                  onClick={() => navigate('/login', { state: { passwordReset: true } })}
                >
                  Zum Login
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4 mt-2" onSubmit={handleSubmit} noValidate>
              <p className="text-muted text-sm">
                Gib dein neues Passwort ein.
              </p>

              {error && (
                <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-md">
                  <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
                  <p className="text-danger text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-muted mb-1.5">
                  Neues Passwort <span className="text-primary">*</span>
                </label>
                <input
                  ref={firstInputRef}
                  type="password"
                  required
                  placeholder="Neues Passwort"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (fieldErrors.newPassword) validateField('newPassword', e.target.value)
                  }}
                  onBlur={() => validateField('newPassword', newPassword)}
                  className={`input-field w-full px-3 py-2 text-sm ${fieldErrors.newPassword ? 'border-danger focus:border-danger' : ''}`}
                />
                {fieldErrors.newPassword && (
                  <p className="text-xs text-danger mt-1">{fieldErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-muted mb-1.5">
                  Passwort bestätigen <span className="text-primary">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Passwort bestätigen"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (fieldErrors.confirmPassword) validateField('confirmPassword', e.target.value)
                  }}
                  onBlur={() => validateField('confirmPassword', confirmPassword)}
                  className={`input-field w-full px-3 py-2 text-sm ${fieldErrors.confirmPassword ? 'border-danger focus:border-danger' : ''}`}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-danger mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <div className="border-t border-border pt-4 flex gap-3 justify-between items-center">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => navigate('/login')}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="emphasized"
                  type="submit"
                  disabled={isLoading}
                >
                  Passwort speichern
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
