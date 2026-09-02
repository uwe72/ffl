import BackButton from '../components/BackButton'
import Button from '../components/Button'
import api from '../api/client'
import { trackEvent } from '../hooks/useMatomo'
import { usePWAInstall } from '../hooks/usePWAInstall'

type InstallPlatform = 'ios' | 'firefox' | 'safari' | 'chromium'

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Firefox/i.test(ua)) return 'firefox'
  if (/Safari/i.test(ua) && !/Chrom/i.test(ua) && !/Edg/i.test(ua)) return 'safari'
  return 'chromium'
}

const platformInstructions: Record<InstallPlatform, { title: string; text: string }> = {
  ios: {
    title: 'Installation über Safari',
    text: 'Auf iPhone/iPad installierst du die App über den Safari-Browser: Öffne ffl.ipv64.de in Safari, tippe unten auf „Teilen“ und wähle „Zum Home-Bildschirm“.'
  },
  firefox: {
    title: 'Chrome oder Edge verwenden',
    text: 'Die Installation funktioniert mit Firefox nicht direkt. Bitte öffne die Seite in Chrome oder Edge und klicke dort auf „Installieren“.'
  },
  safari: {
    title: 'Chrome oder Edge verwenden',
    text: 'Die Installation funktioniert mit Safari am Computer nicht direkt. Bitte öffne die Seite in Chrome oder Edge und klicke dort auf „Installieren“.'
  },
  chromium: {
    title: 'Über das Browser-Menü installieren',
    text: 'Der Install-Dialog ist gerade nicht verfügbar. Öffne das Browser-Menü (⋮) oben rechts und wähle „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.'
  }
}

export default function Install() {
  const { isInstallable, isInstalled, install } = usePWAInstall()
  const platform = detectPlatform()
  const instructions = platformInstructions[platform]

  const handleInstall = async () => {
    await install()
    api.post('/pwa/install-click').catch(() => {})
    trackEvent('pwa', 'install-click', 'page')
  }

  return (
    <div className="max-w-2xl">
      <BackButton to="/" className="mb-4" />
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="shrink-0 w-10 h-10 rounded-full bg-accent-muted text-accent flex items-center justify-center">
            <i className="sap-icon sap-icon-download text-[20px]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-foreground">Installieren</h2>
            <p className="text-sm text-muted">FFL als App auf deinem Gerät installieren</p>
          </div>
        </div>

        <div className="space-y-5">
          <section>
            <h3 className="text-base font-semibold text-foreground">Was ist der PWA-Modus?</h3>
            <p className="text-sm text-muted mt-1">
              Die App lässt sich wie eine native App auf deinem Gerät installieren. Sie bekommt ein eigenes App-Icon und startet in einem eigenen Vollbild-Fenster – ganz ohne Browser-Leiste und Adresszeile.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">Was passiert beim Installieren?</h3>
            <p className="text-sm text-muted mt-1">
              Ein Klick auf „Installieren“ legt die App als Icon auf deinem Startbildschirm (Smartphone) bzw. Desktop (Computer) ab. Danach startet die FFL wie eine normale App in einem eigenen Fenster.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">Vorteile</h3>
            <ul className="mt-1 space-y-1.5">
              {[
                'Schneller Zugriff direkt vom Startbildschirm oder Desktop',
                'Eigenes App-Icon und eigenes Vollbild-Fenster',
                'Startet wie eine native App',
                'Automatische Updates',
                'Funktioniert auch bei langsamer Verbindung (Offline-Cache)'
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted">
                  <i className="sap-icon sap-icon-accept text-[14px] text-success shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            {isInstalled ? (
              <div className="flex items-center gap-2 chip-success px-3 py-2 text-sm">
                <i className="sap-icon sap-icon-accept text-[14px]" />
                Bereits installiert – die App ist in deiner App-Liste bzw. auf deinem Desktop zu finden.
              </div>
            ) : isInstallable ? (
              <Button variant="emphasized" onClick={handleInstall}>
                <i className="sap-icon sap-icon-download text-xs" />
                Installieren
              </Button>
            ) : (
              <div className="px-4 py-3 bg-default border border-border rounded-card">
                <h4 className="text-sm font-semibold text-foreground">{instructions.title}</h4>
                <p className="text-sm text-muted mt-1">{instructions.text}</p>
              </div>
            )}
          </section>
        </div>
      </div>
      <div className="h-10" />
    </div>
  )
}
