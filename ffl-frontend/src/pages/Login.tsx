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
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/background.png"
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      >
        <source src="/login.mp4" type="video/mp4" />
      </video>
      <div className="relative bg-surface/80 backdrop-blur-md border border-border rounded-card w-full max-w-[440px] max-h-[90vh] flex flex-col shadow-2xl ffl-login-enter">
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <span className="text-[26px] leading-none text-accent">
              <i className="sap-icon sap-icon-manager" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-foreground leading-tight">Willkommen zurück</h2>
              <p className="text-muted text-sm mt-0.5">
                Fantasy Football League{season?.name ? ` – ${season.name}` : ''}
              </p>
            </div>
          </div>
          <button
            className="p-1.5 rounded-control text-subtle hover:text-foreground hover:bg-elevated transition-colors -mr-1.5 mt-0.5"
            onClick={() => navigate('/')}
            aria-label="Schließen"
          >
            <i className="sap-icon sap-icon-decline text-[20px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form className="space-y-4 mt-2" onSubmit={handleSubmit} noValidate>
            {justRegistered && (
              <div className="flex items-center gap-3 p-3 bg-success-bg border border-success/30 rounded-control">
                <i className="sap-icon sap-icon-message-success text-[18px] text-success shrink-0" />
                <p className="text-success text-sm">Registrierung erfolgreich! Du kannst dich jetzt anmelden.</p>
              </div>
            )}

            {passwordReset && (
              <div className="flex items-center gap-3 p-3 bg-success-bg border border-success/30 rounded-control">
                <i className="sap-icon sap-icon-message-success text-[18px] text-success shrink-0" />
                <p className="text-success text-sm">Passwort wurde zurückgesetzt. Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-control">
                <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm text-muted mb-1.5">
                Login <span className="text-muted">*</span>
              </label>
              <div className="relative">
                <i className="sap-icon sap-icon-account absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-subtle pointer-events-none" />
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
                  className={`input-field w-full pl-10 pr-3 py-2 text-sm ${fieldErrors.login ? 'border-danger focus:border-danger' : ''}`}
                />
              </div>
              {fieldErrors.login && (
                <p className="text-xs text-danger mt-1">{fieldErrors.login}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">
                Passwort <span className="text-muted">*</span>
              </label>
              <div className="relative">
                <i className="sap-icon sap-icon-locked absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-subtle pointer-events-none" />
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
                  className={`input-field w-full pl-10 pr-3 py-2 text-sm ${fieldErrors.password ? 'border-danger focus:border-danger' : ''}`}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-danger mt-1">{fieldErrors.password}</p>
              )}
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs link mt-1.5 inline-block"
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
                  {isLoading && (
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  )}
                  {isLoading ? 'Anmelden …' : 'Anmelden'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
