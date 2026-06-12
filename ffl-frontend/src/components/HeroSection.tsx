import { Menu, Shield, UserCheck, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useManagers } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useTeams } from '../hooks/useTeams'
import { useAuth } from '../context/AuthContext'

interface HeroSectionProps {
  onMenuClick: () => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

function formatDate(): string {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function HeroSection({ onMenuClick }: HeroSectionProps) {
  const { data: managers } = useManagers()
  const { data: season } = useCurrentSeason()
  const { data: teams } = useTeams()
  const { user } = useAuth()

  return (
    <div className="hero-fade relative h-56 shrink-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-right bg-no-repeat"
        style={{ backgroundImage: 'url(/hero-banner.png)' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(10,14,20,0.70) 0%, rgba(10,14,20,0.40) 40%, rgba(10,14,20,0.08) 70%, rgba(10,14,20,0.02) 100%)',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 md:px-6">
        <div className="flex items-center py-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 rounded-lg text-muted hover:text-accent hover:bg-elevated transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {getGreeting()}, {user?.login || 'Gast'}!
            </h1>
            <p className="text-sm text-muted mt-1">{formatDate()}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/managers" className="hero-stat-card px-4 py-3 flex items-center gap-3 hover:bg-surface/90 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                <UserCheck size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-tight">{managers?.length ?? 0}</p>
                <p className="text-xs text-muted">Manager</p>
              </div>
            </Link>

            {season && (
              <div className="hero-stat-card px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Calendar size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground leading-tight">{season.currentMatchday || 0}</p>
                  <p className="text-xs text-muted">Spieltag</p>
                </div>
              </div>
            )}

            <Link to="/teams" className="hero-stat-card px-4 py-3 flex items-center gap-3 hover:bg-surface/90 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                <Shield size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-tight">{teams?.length ?? 0}</p>
                <p className="text-xs text-muted">Teams</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
