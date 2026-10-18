import Button from './Button'
import useIsMobile from '../hooks/useIsMobile'
import { useSurveyResult, useMemberSurveyResult, useDeleteSurveyResponse } from '../hooks/useSurveys'
import { surveyStatusClass, SURVEY_STATUS_LABEL } from '../utils/surveyStatus'

function formatDate(iso?: string | null) {
  if (!iso) return '–'
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

function apiErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (err instanceof Error && err.message) return err.message
  return 'Aktion fehlgeschlagen'
}

export default function SurveyResultsView({ id, onBack, mode = 'admin' }: {
  id: number
  onBack: () => void
  mode?: 'admin' | 'member'
}) {
  const isMobile = useIsMobile()
  const isAdmin = mode === 'admin'
  const adminResult = useSurveyResult(isAdmin ? id : 0)
  const memberResult = useMemberSurveyResult(isAdmin ? 0 : id)
  const result = isAdmin ? adminResult.data : memberResult.data
  const isLoading = isAdmin ? adminResult.isLoading : memberResult.isLoading
  const deleteResponse = useDeleteSurveyResponse()

  const removeResponse = (responseId: number) => {
    if (!window.confirm('Möchtest du diese Antwort wirklich löschen?')) return
    deleteResponse.mutate({ surveyId: id, responseId }, {
      onError: err => alert(apiErrorMessage(err)),
    })
  }

  if (isLoading || !result) return <div className="text-center py-8 text-muted">Laden...</div>

  const maxCount = Math.max(
    1,
    ...result.questions.flatMap(q => q.counts?.map(c => c.count) ?? [q.answerCount ?? 0]),
  )

  return (
    <div>
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{result.title}</h2>
            <p className="text-sm text-muted mt-1">{result.responseCount} Antworten</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${surveyStatusClass(result.status)}`}>
              {SURVEY_STATUS_LABEL[result.status]}
            </span>
            <Button variant="transparent" size={isMobile ? 'sm' : 'input'} onClick={onBack}>
              <i className="sap-icon sap-icon-nav-back text-base" />
              Zurück
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {result.questions.map(q => {
          if (q.type === 'SEPARATOR') {
            return (
              <div key={q.questionId} className="flex items-center gap-3 pt-2">
                <h3 className="text-lg font-bold text-foreground whitespace-pre-wrap">{q.text}</h3>
                <div className="flex-1 h-px bg-border" />
              </div>
            )
          }
          if (q.type === 'RATING') {
            const total = q.ratingDistribution?.reduce((a, b) => a + b, 0) ?? 0
            return (
              <div key={q.questionId} className="p-5 bg-surface border border-border rounded-card">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-foreground">{q.text}</p>
                  {q.mean != null && (
                    <span className="text-sm text-foreground font-semibold tabular-nums">{q.mean.toFixed(2)} / 5</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = q.ratingDistribution?.[star - 1] ?? 0
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-sm text-muted w-8 shrink-0 text-right">{star}★</span>
                        <div className="flex-1 h-5 bg-elevated rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm text-subtle w-8 shrink-0 tabular-nums">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }
          if (q.type === 'SINGLE' || q.type === 'MULTI') {
            return (
              <div key={q.questionId} className="p-5 bg-surface border border-border rounded-card">
                <p className="font-medium text-foreground mb-3">{q.text}</p>
                <div className="flex flex-col gap-2">
                  {(q.counts ?? []).map(c => {
                    const pct = Math.round((c.count / maxCount) * 100)
                    return (
                      <div key={c.optionId} className="flex items-center gap-3">
                        <span className="text-sm text-muted flex-1 min-w-0 truncate">{c.optionText}</span>
                        <div className="flex-1 h-5 bg-elevated rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm text-subtle w-8 shrink-0 tabular-nums">{c.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }
          const texts = q.freeTexts ?? []
          return (
            <div key={q.questionId} className="p-5 bg-surface border border-border rounded-card">
              <p className="font-medium text-foreground mb-3">{q.text}</p>
              {texts.length === 0 ? (
                <p className="text-sm text-subtle">Keine Freitext-Antworten</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {texts.map((t, i) => (
                    <li key={i} className="py-2 text-sm text-foreground whitespace-pre-wrap">{t}</li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}

        <div className="p-5 bg-surface border border-border rounded-card">
          <p className="font-medium text-foreground mb-3">Einzelne Antworten</p>
          {result.responses.length === 0 ? (
            <p className="text-sm text-subtle">Noch keine Antworten</p>
          ) : (
            <div className="flex flex-col gap-4">
              {result.responses.map(r => (
                <div key={r.id} className="border border-border rounded-control p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs text-subtle">{formatDate(r.submittedAt)}</p>
                    {isAdmin && (
                      <Button
                        variant="negative"
                        size={isMobile ? 'sm' : 'input'}
                        onClick={() => removeResponse(r.id)}
                        disabled={deleteResponse.isPending}
                      >
                        Löschen
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {r.answers.map((a, j) => (
                      <div key={j} className="text-sm">
                        <span className="text-muted">{a.questionText}: </span>
                        <span className="text-foreground">{a.answerText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
