import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import Button from '../components/Button'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setFieldError('Dieses Feld ist erforderlich.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFieldError('Bitte gib eine gültige E-Mail-Adresse ein.')
      return false
    }
    setFieldError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateEmail(email)) return

    setIsLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSuccess(true)
    } catch {
      setSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/background.png')" }}>
      <div className="bg-surface border border-border rounded-lg w-full max-w-[440px] max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <h2 className="text-xl font-bold text-foreground">FFL</h2>
            <p className="text-muted text-sm mt-0.5">Passwort vergessen</p>
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
                  Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen des Passworts gesendet.
                </p>
              </div>
              <p className="text-muted text-sm">
                Bitte überprüfe dein E-Mail-Postfach (auch den Spam-Ordner). Der Link ist 30 Minuten gültig.
              </p>
              <div className="border-t border-border pt-4">
                <Button
                  variant="emphasized"
                  type="button"
                  onClick={() => navigate('/login')}
                >
                  Zurück zum Login
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4 mt-2" onSubmit={handleSubmit} noValidate>
              <p className="text-muted text-sm">
                Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.
              </p>

              {error && (
                <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-md">
                  <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
                  <p className="text-danger text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-muted mb-1.5">
                  E-Mail-Adresse <span className="text-primary">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="email"
                  required
                  placeholder="name@beispiel.de"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldError) validateEmail(e.target.value)
                  }}
                  onBlur={() => validateEmail(email)}
                  className={`input-field w-full px-3 py-2 text-sm ${fieldError ? 'border-danger focus:border-danger' : ''}`}
                />
                {fieldError && (
                  <p className="text-xs text-danger mt-1">{fieldError}</p>
                )}
              </div>

              <div className="border-t border-border pt-4 flex gap-3 justify-between items-center">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => navigate('/login')}
                >
                  Zurück
                </Button>
                <Button
                  variant="emphasized"
                  type="submit"
                  disabled={isLoading}
                >
                  Link senden
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
