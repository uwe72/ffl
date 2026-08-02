import { useCurrentSeason } from '../hooks/useSeasons'
import { useAuth } from '../context/AuthContext'
import Badge from './Badge'
import { seasonStateLabel } from '../utils/season'

interface HeroSectionProps {
  collapsed: boolean
  onMenuClick: () => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export default function HeroSection({ collapsed, onMenuClick }: HeroSectionProps) {
  const { data: season } = useCurrentSeason()
  const { user } = useAuth()

  const phaseLabel = seasonStateLabel(season?.seasonState)

  const brandWidth = collapsed ? 64 : 240
  const textStart = brandWidth + 30
  const desktopGradient = [
    'rgba(10,14,20,0.22) 0px',
    `rgba(10,14,20,0.30) ${Math.max(0, brandWidth - 90)}px`,
    `rgba(10,14,20,0.86) ${textStart}px`,
    `rgba(10,14,20,0.86) ${textStart + 440}px`,
    `rgba(10,14,20,0.34) ${textStart + 700}px`,
    'rgba(10,14,20,0.06) 88%',
    'rgba(10,14,20,0) 100%',
  ].join(', ')

  return (
    <div className="hero relative h-[120px] shrink-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{ backgroundImage: 'url(/hero-banner.png)', backgroundPosition: 'center 30%' }}
      >
        <div
          className="absolute inset-0 md:hidden"
          style={{
            background: 'linear-gradient(to right, rgba(10,14,20,0.84) 0%, rgba(10,14,20,0.58) 35%, rgba(10,14,20,0.10) 65%, rgba(10,14,20,0) 100%)',
          }}
        />
        <div
          className="absolute inset-0 hidden md:block"
          style={{ background: `linear-gradient(to right, ${desktopGradient})` }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(10,16,24,0.08)' }}
        />
      </div>

      <div className="relative z-10 flex h-full items-stretch">
        <div
          className="hidden md:block shrink-0 transition-[width] duration-300 ease-in-out"
          style={{ width: collapsed ? 64 : 240 }}
        />

        <div className="flex flex-1 min-w-0 items-center px-[30px]">
          <button
            onClick={onMenuClick}
            className="md:hidden mr-3 p-1.5 rounded-lg text-muted hover:text-primary hover:bg-card-hover transition-colors"
          >
            <i className="sap-icon sap-icon-menu text-[20px]" />
          </button>

          <div className="flex flex-col justify-center min-w-0">
            <p className="text-xl md:text-2xl font-bold text-foreground leading-tight">
              {getGreeting()}, {user?.login || 'Gast'}!
            </p>
            {season && (
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-sm text-muted">Saison {season.name}</span>
                <Badge variant="solid">{phaseLabel}</Badge>
                {season.currentMatchday && (
                  <span className="text-sm text-muted">{season.currentMatchday}. Spieltag</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
