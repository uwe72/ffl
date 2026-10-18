import { Navigate, Link as RouterLink } from 'react-router-dom'
import { useActiveSurvey, useEndedSurveys } from '../hooks/useSurveys'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../components/SurveyFormView'
import BackButton from '../components/BackButton'

export default function SurveyLanding() {
  const { isAuthenticated } = useAuth()
  const { data: active, isLoading, isError } = useActiveSurvey()
  const { data: ended } = useEndedSurveys(isAuthenticated && isError)

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>

  if (active) {
    return <Navigate to={`/umfrage/${active.id}`} replace />
  }

  const showEnded = isAuthenticated && !!ended && ended.length > 0

  return (
    <div className="max-w-2xl mx-auto mt-6 px-4">
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card text-center">
        <div className="flex flex-col items-center gap-3 py-4">
          <i className="sap-icon sap-icon-survey text-[44px] text-subtle" />
          <h2 className="text-xl font-bold text-foreground">Umfragen</h2>
          <p className="text-muted text-sm">
            {isError
              ? 'Aktuell ist keine Umfrage gestartet.'
              : 'Aktuell ist keine Umfrage gestartet. Schau später wieder vorbei!'}
          </p>
        </div>
        {showEnded && (
          <div className="text-left border-t border-border pt-4 flex flex-col gap-3 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Beendete Umfragen</p>
            {ended.map(s => (
              <div key={s.id} className="min-w-0">
                <RouterLink to={`/umfrage/${s.id}`} className="link text-sm font-medium">
                  {s.title}
                </RouterLink>
                <p className="text-xs text-subtle mt-0.5">
                  Möglich bis: {formatDateTime(s.deadline)} · {s.responseCount} {s.responseCount === 1 ? 'Antwort' : 'Antworten'}
                </p>
              </div>
            ))}
          </div>
        )}
        <BackButton to="/" className="mt-2 px-0 pt-0" />
      </div>
    </div>
  )
}
