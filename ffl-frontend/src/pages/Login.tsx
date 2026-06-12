import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCurrentSeason } from '../hooks/useSeasons'
import { trackEvent } from '../hooks/useMatomo'

export default function Login() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login: authLogin } = useAuth()
  const { data: season } = useCurrentSeason()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/background.png')" }}>
      <div className="card max-w-md w-full p-8 bg-surface/80 backdrop-blur-md border border-border/50 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground">Anmelden</h2>
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
              <label className="block text-sm text-muted mb-1">Passwort</label>
              <input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full px-3 py-2 rounded bg-elevated border-border-hover text-foreground placeholder-[#8899aa] focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="button-primary w-full px-4 py-2 rounded font-medium hover:bg-button-primary-hover transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Wird geladen...' : 'Anmelden'}
          </button>
          {season?.seasonState === 'BEFORE_SEASON' && (
            <div className="text-center">
              <RouterLink to="/register" className="text-accent hover:text-accent-hover link">
                Noch kein Konto? Registrieren
              </RouterLink>
            </div>
          )}
          <div className="text-center pt-2 border-t border-border/50">
            <a
              href="/feedback"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted hover:text-accent link transition-colors"
            >
              Feedback senden
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}