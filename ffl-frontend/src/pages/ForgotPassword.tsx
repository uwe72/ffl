import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useCurrentSeason } from '../hooks/useSeasons'
import Button from '../components/Button'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [logins, setLogins] = useState<string[]>([])
  const [selectedLogin, setSelectedLogin] = useState('')
  const navigate = useNavigate()
  const { data: season } = useCurrentSeason()
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

    if (logins.length > 0 && !selectedLogin) {
      setError('Bitte wähle einen Account aus.')
      return
    }

    setIsLoading(true)
    try {
      const result = await authApi.forgotPassword(email, selectedLogin || undefined)
      if (result.multipleAccounts && result.logins) {
        setLogins(result.logins)
        setSelectedLogin('')
      } else {
        setSuccess(true)
      }
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
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <img
        src="/background2627.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="relative bg-surface/70 backdrop-blur-md border border-border rounded-card w-full max-w-[440px] max-h-[90vh] flex flex-col shadow-2xl ffl-login-enter">
        <div className="flex flex-col items-center text-center gap-1 px-6 pt-8 pb-2">
          <h2 className="text-2xl font-bold text-foreground leading-tight">Passwort vergessen</h2>
          <p className="text-muted text-sm">
            Fantasy Football League{season?.name ? ` – ${season.name}` : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {success ? (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3 p-3 bg-success-bg border border-success/30 rounded-control">
                <i className="sap-icon sap-icon-message-success text-[18px] text-success shrink-0" />
                <p className="text-success text-sm">
                  Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen des Passworts gesendet.
                </p>
              </div>
              <p className="text-muted text-sm">
                Bitte überprüfe dein E-Mail-Postfach (auch den Spam-Ordner). Der Link ist 30 Minuten gültig.
              </p>
              <div className="flex items-start gap-3 p-3 bg-info-bg border border-info/30 rounded-control">
                <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0 mt-0.5" />
                <p className="text-info text-sm">
                  <strong>Wichtig:</strong> Die Anmeldung erfolgt mit deinem <strong>Login-Namen</strong> und deinem Passwort, nicht mit deiner E-Mail-Adresse.
                </p>
              </div>
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
                {logins.length > 0
                  ? 'Zu dieser E-Mail-Adresse gehören mehrere Accounts. Bitte wähle den Account aus, für den du das Passwort zurücksetzen möchtest.'
                  : 'Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.'
                }
              </p>

              {season?.seasonState === 'BEFORE_SEASON' && (
                <div className="flex items-start gap-3 p-4 bg-warning-bg border-2 border-warning rounded-control">
                  <i className="sap-icon sap-icon-alert text-[24px] text-warning shrink-0 mt-0.5" />
                  <p className="text-warning text-sm font-bold leading-snug">
                    Achtung: Zur neuen Saison{season?.name ? ` (${season.name})` : ''} muss jeder Teilnehmer einen neuen Account erstellen.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-control">
                  <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
                  <p className="text-danger text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-[13px] text-muted mb-2">
                  E-Mail-Adresse <span className="text-muted">*</span>
                </label>
                <div className="relative">
                  <i className="sap-icon sap-icon-email absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-subtle pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="email"
                    required
                    placeholder="name@beispiel.de"
                    value={email}
                    disabled={logins.length > 0}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (fieldError) validateEmail(e.target.value)
                    }}
                    onBlur={() => validateEmail(email)}
                    className={`input-field w-full pl-10 pr-3 py-2.5 text-[15px] ${fieldError ? 'border-danger focus:border-danger' : ''}`}
                  />
                </div>
                {fieldError && (
                  <p className="text-xs text-danger mt-1">{fieldError}</p>
                )}
              </div>

              {logins.length > 0 && (
                <div>
                  <label className="block text-[13px] text-muted mb-2">
                    Account auswählen <span className="text-muted">*</span>
                  </label>
                  <select
                    value={selectedLogin}
                    onChange={(e) => {
                      setSelectedLogin(e.target.value)
                      setError('')
                    }}
                    className="input-field w-full px-3 py-2.5 text-[15px]"
                  >
                    <option value="">Bitte wählen...</option>
                    {logins.map((login) => (
                      <option key={login} value={login}>{login}</option>
                    ))}
                  </select>
                </div>
              )}

              {logins.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-info-bg border border-info/30 rounded-control">
                  <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0 mt-0.5" />
                  <p className="text-info text-sm">
                    <strong>Wichtig:</strong> Die Anmeldung erfolgt mit deinem <strong>Login-Namen</strong> und deinem Passwort, nicht mit deiner E-Mail-Adresse.
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-4 flex gap-3 justify-end items-center">
                <div className="flex gap-3">
                  {logins.length > 0 ? (
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setLogins([])
                        setSelectedLogin('')
                        setError('')
                      }}
                    >
                      Zurück
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => navigate('/login')}
                    >
                      Zurück
                    </Button>
                  )}
                  <Button
                    variant="emphasized"
                    type="submit"
                    disabled={isLoading}
                  >
                    Link senden
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
