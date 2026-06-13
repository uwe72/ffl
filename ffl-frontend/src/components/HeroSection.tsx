import { Link } from 'react-router-dom'
import { useManagers } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { usePlayers } from '../hooks/usePlayers'
import { useAuth } from '../context/AuthContext'
import Badge from './Badge'

interface HeroSectionProps {
  onMenuClick: () => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

const env = import.meta.env.VITE_APP_ENV
const buildDate = import.meta.env.VITE_BUILD_DATE
const isProd = env === 'PROD'
const dateParts = buildDate.split('-')
const formattedDate = dateParts[2] + '.' + dateParts[1] + '.' + dateParts[0].slice(-2)

export default function HeroSection({ onMenuClick }: HeroSectionProps) {
  const { data: managers } = useManagers()
  const { data: season } = useCurrentSeason()
  const { data: players } = usePlayers()
  const { user } = useAuth()

  const phaseLabel = season
    ? season.seasonState === 'RUNNING_HINRUNDE'
      ? 'Hinrunde'
      : season.seasonState === 'RUNNING_RUECKRUNDE'
        ? 'Rückrunde'
        : 'Vor Saison'
    : null

  return (
    <div className="hero-fade relative h-56 shrink-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-[length:100%_auto] bg-right bg-no-repeat"
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
            className="md:hidden p-1.5 rounded-lg text-muted hover:text-primary hover:bg-card-hover transition-colors"
          >
            <i className="sap-icon sap-icon-menu text-[20px]" />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-4">
          <div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              {getGreeting()}, {user?.login || 'Gast'}!
            </p>
            {season && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted">Saison {season.name}</span>
                <Badge>{phaseLabel}</Badge>
                {season.currentMatchday && (
                  <span className="text-sm text-muted">{season.currentMatchday}. Spieltag</span>
                )}
                <span className="text-sm text-muted">V{formattedDate}{isProd ? '' : ' (Test)'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/managers" className="hero-stat-card px-4 py-3 flex items-center gap-3 hover:bg-surface/90 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <i className="sap-icon sap-icon-employee text-[18px] text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-tight">{managers?.length ?? 0}</p>
                <p className="text-xs text-muted">Manager</p>
              </div>
            </Link>

            <Link to="/players" className="hero-stat-card px-4 py-3 flex items-center gap-3 hover:bg-surface/90 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <i className="sap-icon sap-icon-group text-[18px] text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-tight">{players?.length ?? 0}</p>
                <p className="text-xs text-muted">Spieler</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
