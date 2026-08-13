import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePublicCurrentSeason } from '../hooks/useSeasons'
import { trackEvent } from '../hooks/useMatomo'
import Button from '../components/Button'
import RulesDialog from '../components/RulesDialog'

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
  const [showPassword, setShowPassword] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showEmailHint, setShowEmailHint] = useState(false)
  const { login: authLogin } = useAuth()
  const { data: season } = usePublicCurrentSeason()
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
    setShowEmailHint(false)

    try {
      await authLogin({ login, password })
      trackEvent('auth', 'login', 'success')
      navigate('/')
    } catch (err) {
      trackEvent('auth', 'login', 'failure')
      setError('Ungültiger Login oder Passwort')
      if (login.includes('@')) {
        setShowEmailHint(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    firstInputRef.current?.focus()
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
          <h2 className="text-2xl font-bold text-foreground leading-tight">Willkommen</h2>
          <p className="text-muted text-sm">
            Fantasy Football League{season?.name ? ` – ${season.name}` : ''}
          </p>
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
              <div className="flex items-start gap-3 p-3 bg-danger-bg border border-danger/30 rounded-control">
                <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0 mt-0.5" />
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            {error && season?.seasonState === 'BEFORE_SEASON' && (
              <div className="flex items-start gap-3 p-3 bg-info-bg border border-info/30 rounded-control">
                <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0 mt-0.5" />
                <p className="text-info text-sm">
                  Zur neuen Saison wurde alles zurückgesetzt. Bitte registriere dich erneut mit einem neuen Account.
                </p>
              </div>
            )}

            {showEmailHint && (
              <div className="flex items-start gap-3 p-3 bg-info-bg border border-info/30 rounded-control">
                <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0 mt-0.5" />
                <p className="text-info text-sm">
                  Bitte melde dich mit deinem Login-Namen an, nicht mit deiner E-Mail-Adresse.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[13px] text-muted mb-2">
                Login <span className="text-muted">*</span>
              </label>
              <div className="relative">
                <i className="sap-icon sap-icon-account absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-subtle pointer-events-none" />
                <input
                  ref={firstInputRef}
                  type="text"
                  required
                  placeholder="Login (nicht E-Mail-Adresse)"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value)
                    if (fieldErrors.login) validateField('login', e.target.value)
                  }}
                  onBlur={() => handleBlur('login', login)}
                  className={`input-field w-full pl-10 pr-3 py-2.5 text-[15px] ${fieldErrors.login ? 'border-danger focus:border-danger' : ''}`}
                />
              </div>
              {fieldErrors.login && (
                <p className="text-xs text-danger mt-1">{fieldErrors.login}</p>
              )}
              <button
                type="button"
                onClick={() => navigate('/forgot-login')}
                className="text-xs link mt-1.5 inline-block"
              >
                Login vergessen?
              </button>
            </div>

            <div>
              <label className="block text-[13px] text-muted mb-2">
                Passwort <span className="text-muted">*</span>
              </label>
              <div className="relative">
                <i className="sap-icon sap-icon-locked absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-subtle pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Passwort"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) validateField('password', e.target.value)
                  }}
                  onBlur={() => handleBlur('password', password)}
                  className={`input-field w-full pl-10 pr-10 py-2.5 text-[15px] ${fieldErrors.password ? 'border-danger focus:border-danger' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  <i className={`sap-icon ${showPassword ? 'sap-icon-hide' : 'sap-icon-show'} text-[18px]`} />
                </button>
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

            <div className="border-t border-border pt-4 flex justify-between items-center">
              <div>
                <Button
                  variant="transparent"
                  type="button"
                  onClick={() => setShowRules(true)}
                >
                  <i className="sap-icon sap-icon-information text-[18px]" />
                  Infos
                </Button>
              </div>
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

      <RulesDialog isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  )
}
