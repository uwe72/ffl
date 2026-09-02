import { useCurrentSeason } from '../hooks/useSeasons'
import { useAuth } from '../context/AuthContext'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { trackEvent } from '../hooks/useMatomo'
import api from '../api/client'
import Badge from './Badge'
import Button from './Button'
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
  const { isInstallable, isInstalled, install } = usePWAInstall()

  const phaseLabel = seasonStateLabel(season?.seasonState)

  const handleInstall = async () => {
    await install()
    api.post('/pwa/install-click').catch(() => {})
    trackEvent('pwa', 'install-click', 'hero')
  }

  return (
    <div className="hero relative h-[84px] md:h-[102px] shrink-0 overflow-hidden bg-header">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: 'url(/hero-banner.png)',
          backgroundPosition: 'center 10%',
          filter: 'brightness(1.35) contrast(0.92)',
        }}
      />
      <div className="img-overlay" />

      <div className="relative z-10 flex h-full items-stretch">
        <div
          className="hidden md:block shrink-0 transition-[width] duration-300 ease-in-out"
          style={{ width: collapsed ? 64 : 240 }}
        />

        <div className="flex flex-1 min-w-0 items-center px-[30px]">
          <button
            onClick={onMenuClick}
            className="md:hidden mr-3 -ml-[18px] p-1.5 rounded-control text-muted hover:text-primary hover:bg-card-hover transition-colors"
          >
            <i className="sap-icon sap-icon-menu text-[20px]" />
          </button>

          <div className="flex flex-col justify-center min-w-0 hero-text-shadow">
            <p className="text-xl md:text-2xl font-bold text-foreground leading-tight pl-2.5">
              {getGreeting()}, {user?.firstName || user?.login || 'Gast'}!
            </p>
            {season && (
              <div className="flex items-center gap-3 mt-0.5">
                <Badge variant="solid">Saison {season.name}</Badge>
                <Badge variant="solid">{phaseLabel}</Badge>
                {season.currentMatchday && (
                  <Badge variant="solid">{season.currentMatchday}. Spieltag</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col shrink-0 pr-[30px] pt-3 md:hidden">
          {isInstallable && !isInstalled && (
              <Button variant="secondary" size="input" onClick={handleInstall} className="!bg-defender-bg !border-defender hover:!bg-defender-bg">
              <i className="sap-icon sap-icon-download text-xs" />
              Installieren
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
