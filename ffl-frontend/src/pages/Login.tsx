import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFeedback } from '../context/FeedbackContext'
import { useCurrentSeason } from '../hooks/useSeasons'
import { trackEvent } from '../hooks/useMatomo'
import Button from '../components/Button'

interface FieldErrors {
  login?: string
  password?: string
}

export default function Login() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { login: authLogin } = useAuth()
  const { open: openFeedback } = useFeedback()
  const { data: season } = useCurrentSeason()
  const navigate = useNavigate()
  const location = useLocation()
  const firstInputRef = useRef<HTMLInputElement>(null)
  const justRegistered = (location.state as { registered?: boolean })?.registered === true
  const passwordReset = (location.state as { passwordReset?: boolean })?.passwordReset === true

  const validateField = (field: keyof FieldErrors, value: string) => {
    if (!value.trim()) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Dieses Feld ist erforderlich.' }))
      return false
    }
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
    return true
  }

  const handleBlur = (field: keyof FieldErrors, value: string) => {
    validateField(field, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const errors: FieldErrors = {}
    if (!login.trim()) errors.login = 'Dieses Feld ist erforderlich.'
    if (!password.trim()) errors.password = 'Dieses Feld ist erforderlich.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      await authLogin({ login, password })
      trackEvent('auth', 'login', 'success')
      navigate('/')
    } catch (err) {
      trackEvent('auth', 'login', 'failure')
      setError('Ungültiger Login oder Passwort')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/background.png')" }}>
      <div className="bg-surface border border-border rounded-lg w-full max-w-[440px] max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <h2 className="text-xl font-bold text-foreground">FFL</h2>
            <p className="text-muted text-sm mt-0.5">Fantasy Football League</p>
          </div>
          <button
            className="p-1.5 rounded-md text-subtle hover:text-foreground hover:bg-elevated transition-colors -mr-1.5 mt-0.5"
            onClick={() => navigate('/')}
            aria-label="Schließen"
          >
            <i className="sap-icon sap-icon-decline text-[20px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form className="space-y-4 mt-2" onSubmit={handleSubmit} noValidate>
            {justRegistered && (
              <div className="flex items-center gap-3 p-3 bg-success-bg border border-success/30 rounded-md">
                <i className="sap-icon sap-icon-message-success text-[18px] text-success shrink-0" />
                <p className="text-success text-sm">Registrierung erfolgreich! Du kannst dich jetzt anmelden.</p>
              </div>
            )}

            {passwordReset && (
              <div className="flex items-center gap-3 p-3 bg-success-bg border border-success/30 rounded-md">
                <i className="sap-icon sap-icon-message-success text-[18px] text-success shrink-0" />
                <p className="text-success text-sm">Passwort wurde zurückgesetzt. Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-md">
                <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm text-muted mb-1.5">
                Login <span className="text-primary">*</span>
              </label>
              <input
                ref={firstInputRef}
                type="text"
                required
                placeholder="Login"
                value={login}
                onChange={(e) => {
                  setLogin(e.target.value)
                  if (fieldErrors.login) validateField('login', e.target.value)
                }}
                onBlur={() => handleBlur('login', login)}
                className={`input-field w-full px-3 py-2 text-sm ${fieldErrors.login ? 'border-danger focus:border-danger' : ''}`}
              />
              {fieldErrors.login && (
                <p className="text-xs text-danger mt-1">{fieldErrors.login}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">
                Passwort <span className="text-primary">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Passwort"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) validateField('password', e.target.value)
                }}
                onBlur={() => handleBlur('password', password)}
                className={`input-field w-full px-3 py-2 text-sm ${fieldErrors.password ? 'border-danger focus:border-danger' : ''}`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-danger mt-1">{fieldErrors.password}</p>
              )}
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-accent hover:text-accent-hover hover:underline mt-1.5 inline-block"
              >
                Passwort vergessen?
              </button>
            </div>

            <div className="border-t border-border pt-4 flex gap-3 justify-between items-center">
              <Button
                variant="transparent"
                type="button"
                onClick={openFeedback}
              >
                Feedback
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => navigate('/register')}
                  disabled={season?.seasonState !== 'BEFORE_SEASON'}
                >
                  Registrieren
                </Button>
                <Button
                  variant="emphasized"
                  type="submit"
                  disabled={isLoading}
                >
                  Anmelden
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
