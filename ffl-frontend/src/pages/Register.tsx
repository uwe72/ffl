import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { trackEvent } from '../hooks/useMatomo'
import Button from '../components/Button'

interface FieldErrors {
  login?: string
  email?: string
  password?: string
}

export default function Register() {
  const [login, setLogin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { register } = useAuth()
  const navigate = useNavigate()
  const firstInputRef = useRef<HTMLInputElement>(null)

  const validateField = (field: keyof FieldErrors, value: string) => {
    if (!value.trim()) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Dieses Feld ist erforderlich.' }))
      return false
    }
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Bitte eine gültige E-Mail-Adresse eingeben.' }))
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
    if (!email.trim()) errors.email = 'Dieses Feld ist erforderlich.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Bitte eine gültige E-Mail-Adresse eingeben.'
    if (!password.trim()) errors.password = 'Dieses Feld ist erforderlich.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      await register({ login, email, password, firstName, lastName })
      trackEvent('auth', 'register', 'success')
      navigate('/')
    } catch (err) {
      trackEvent('auth', 'register', 'failure')
      setError('Registrierung fehlgeschlagen. Login oder E-Mail bereits vergeben.')
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
            <h2 className="text-xl font-bold text-foreground">Registrieren</h2>
            <p className="text-muted text-sm mt-1">Erstelle ein neues Konto.</p>
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
          <form className="space-y-4 mt-2" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-lg">
                <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs text-muted mb-1">
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
                className={`input-field w-full px-3 py-2 rounded focus:outline-none text-sm ${fieldErrors.login ? 'border-danger focus:border-danger' : ''}`}
              />
              {fieldErrors.login && (
                <p className="text-xs text-danger mt-1">{fieldErrors.login}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">
                E-Mail <span className="text-primary">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) validateField('email', e.target.value)
                }}
                onBlur={() => handleBlur('email', email)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none text-sm ${fieldErrors.email ? 'border-danger focus:border-danger' : ''}`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-danger mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">
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
                className={`input-field w-full px-3 py-2 rounded focus:outline-none text-sm ${fieldErrors.password ? 'border-danger focus:border-danger' : ''}`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-danger mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Vorname</label>
              <input
                type="text"
                placeholder="Vorname (optional)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-field w-full px-3 py-2 rounded focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Nachname</label>
              <input
                type="text"
                placeholder="Nachname (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-field w-full px-3 py-2 rounded focus:outline-none text-sm"
              />
            </div>

            <div className="border-t border-border pt-4 flex gap-3 justify-end">
              <Button
                variant="transparent"
                onClick={() => navigate('/login')}
                disabled={isLoading}
              >
                Abbrechen
              </Button>
              <Button
                variant="emphasized"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Wird geladen …' : 'Registrieren'}
              </Button>
            </div>

            <div className="text-center">
              <RouterLink to="/login" className="text-sm text-primary hover:text-primary-hover transition-colors">
                Bereits ein Konto? Anmelden
              </RouterLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
