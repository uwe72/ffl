import { Navigate, Link as RouterLink } from 'react-router-dom'
import { useActiveSurvey } from '../hooks/useSurveys'

export default function SurveyLanding() {
  const { data: active, isLoading, isError } = useActiveSurvey()

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>

  if (active) {
    return <Navigate to={`/umfrage/${active.id}`} replace />
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 px-4">
      <div className="p-6 bg-surface border border-border rounded-card text-center">
        <div className="flex flex-col items-center gap-3 py-4">
          <i className="sap-icon sap-icon-survey text-[44px] text-subtle" />
          <h2 className="text-xl font-bold text-foreground">Umfragen</h2>
          <p className="text-muted text-sm">
            {isError
              ? 'Aktuell ist keine Umfrage gestartet.'
              : 'Aktuell ist keine Umfrage gestartet. Schau später wieder vorbei!'}
          </p>
        </div>
        <RouterLink to="/" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline font-semibold mt-2">
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück zur Übersicht
        </RouterLink>
      </div>
    </div>
  )
}
