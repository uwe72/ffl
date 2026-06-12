import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { trackEvent } from '../hooks/useMatomo'

export default function Register() {
  const [login, setLogin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="card max-w-md w-full p-8 bg-surface border border-border">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground">Registrieren</h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 mb-4 rounded bg-danger-bg border border-danger/30 text-danger text-sm">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Login</label>
              <input
                type="text"
                placeholder="Login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="input-field w-full px-3 py-2 rounded bg-elevated border-border-hover text-foreground placeholder-[#8899aa] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">E-Mail</label>
              <input
                type="email"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full px-3 py-2 rounded bg-elevated border-border-hover text-foreground placeholder-[#8899aa] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Passwort</label>
              <input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full px-3 py-2 rounded bg-elevated border-border-hover text-foreground placeholder-[#8899aa] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Vorname</label>
              <input
                type="text"
                placeholder="Vorname (optional)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-field w-full px-3 py-2 rounded bg-elevated border-border-hover text-foreground placeholder-[#8899aa] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Nachname</label>
              <input
                type="text"
                placeholder="Nachname (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-field w-full px-3 py-2 rounded bg-elevated border-border-hover text-foreground placeholder-[#8899aa] focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="button-primary w-full px-4 py-2 rounded font-medium hover:bg-button-primary-hover transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Wird geladen...' : 'Registrieren'}
          </button>
          <div className="text-center">
            <RouterLink to="/login" className="text-accent hover:text-accent-hover link">
              Bereits ein Konto? Anmelden
            </RouterLink>
          </div>
        </form>
      </div>
    </div>
  )
}