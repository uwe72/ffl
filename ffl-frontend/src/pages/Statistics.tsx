import { Link as RouterLink } from 'react-router-dom'

export default function Statistics() {
  return (
    <div>
      <RouterLink to="/" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline font-semibold mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Übersicht
      </RouterLink>

      <iframe
        src="https://matomo.ipv64.de/"
        title="Matomo Statistik"
        className="w-full h-[calc(100vh-200px)] border border-border rounded-control bg-surface"
      />
    </div>
  )
}
