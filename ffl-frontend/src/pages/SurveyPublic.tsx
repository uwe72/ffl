import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePublicSurvey, usePublicSurveyResult, useSubmitSurvey } from '../hooks/useSurveys'
import type { SurveyQuestion, SurveyAnswerInput } from '../types'
import Button from '../components/Button'
import BackButton from '../components/BackButton'

type AnswerState = Record<number, SurveyAnswerInput>

const STORAGE_PREFIX = 'ffl-survey-draft-'

function storageKey(surveyId: number) {
  return `${STORAGE_PREFIX}${surveyId}`
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
  } catch {
    return iso
  }
}

function loadDraft(surveyId: number): AnswerState | null {
  try {
    const raw = localStorage.getItem(storageKey(surveyId))
    return raw ? (JSON.parse(raw) as AnswerState) : null
  } catch {
    return null
  }
}

function saveDraft(surveyId: number, answers: AnswerState) {
  try {
    localStorage.setItem(storageKey(surveyId), JSON.stringify(answers))
  } catch {
    // ignore storage failures
  }
}

function clearDraft(surveyId: number) {
  try {
    localStorage.removeItem(storageKey(surveyId))
  } catch {
    // ignore storage failures
  }
}

function isAnswered(question: SurveyQuestion, input: SurveyAnswerInput | undefined): boolean {
  if (!input) return false
  if (question.type === 'RATING') return !!input.value
  if (question.type === 'TEXTFIELD' || question.type === 'TEXTAREA') return !!input.value && input.value.trim() !== ''
  return !!input.optionIds && input.optionIds.length > 0
}

function RatingInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const current = value ? parseInt(value, 10) : 0
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Bewertung">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(String(star))}
          aria-label={`${star} von 5 Sternen`}
          aria-checked={current === star}
          role="radio"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[28px] leading-none rounded-control transition-colors focus:outline-none focus:ring-2 focus:ring-accent-ring"
        >
          <span className={star <= current ? 'text-accent' : 'text-border-strong'}>★</span>
        </button>
      ))}
    </div>
  )
}

function ChoiceInput({ question, input, onChange }: {
  question: SurveyQuestion
  input: SurveyAnswerInput | undefined
  onChange: (input: SurveyAnswerInput) => void
}) {
  const selected = input?.optionIds ?? []
  const toggle = (optionId: number) => {
    if (question.type === 'SINGLE') {
      onChange({ questionId: question.id, optionIds: [optionId] })
      return
    }
    const next = selected.includes(optionId)
      ? selected.filter(id => id !== optionId)
      : [...selected, optionId]
    onChange({ questionId: question.id, optionIds: next })
  }
  return (
    <div className="flex flex-col gap-2">
      {question.options.map(option => {
        const active = selected.includes(option.id)
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            aria-pressed={active}
            className={`min-h-[44px] flex items-center gap-3 rounded-control border px-4 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent-ring ${
              active
                ? 'border-accent bg-accent-muted text-foreground font-medium'
                : 'border-border-strong hover:border-border-hover bg-surface'
            }`}
          >
            <span
              className={`flex items-center justify-center w-5 h-5 shrink-0 rounded-control border text-xs ${
                active ? 'border-accent bg-accent text-primary-foreground' : 'border-border-strong'
              }`}
            >
              {active ? (question.type === 'MULTI' ? '✓' : '•') : ''}
            </span>
            <span className="min-w-0">{option.text}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function SurveyPublic() {
  const { id } = useParams<{ id: string }>()
  const surveyId = Number(id)
  const { data: survey, isLoading, error } = usePublicSurvey(surveyId)
  const { data: result } = usePublicSurveyResult(surveyId, survey?.status === 'VEROEFFENTLICHT')
  const submit = useSubmitSurvey()
  const [answers, setAnswers] = useState<AnswerState>({})
  const [submitted, setSubmitted] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (survey && survey.status === 'GESTARTET') {
      const draft = loadDraft(survey.id)
      if (draft) setAnswers(draft)
    }
  }, [survey])

  useEffect(() => {
    if (survey && survey.status === 'GESTARTET') {
      saveDraft(survey.id, answers)
    }
  }, [answers, survey])

  const progress = useMemo(() => {
    if (!survey || survey.questions.length === 0) return 0
    const required = survey.questions.filter(q => q.required)
    if (required.length === 0) return 100
    const answered = required.filter(q => isAnswered(q, answers[q.id])).length
    return Math.round((answered / required.length) * 100)
  }, [survey, answers])

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error || !survey) {
    return <div className="text-center py-8 text-danger">Umfrage nicht gefunden</div>
  }

  if (submitted) {
    return (
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card max-w-2xl mx-auto mt-8">
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <i className="sap-icon sap-icon-approvals text-[44px] text-accent" />
          <h2 className="text-xl font-bold text-foreground">Vielen Dank!</h2>
          <p className="text-muted text-sm">Deine Antwort wurde übermittelt.</p>
        </div>
      </div>
    )
  }

  if (survey.status === 'VEROEFFENTLICHT') {
    return (
      <PublicResults
        title={survey.title}
        description={survey.description ?? ''}
        responseCount={result?.responseCount ?? 0}
        questions={result?.questions ?? []}
      />
    )
  }

  if (survey.status !== 'GESTARTET') {
    return (
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card max-w-2xl mx-auto mt-8 text-center">
        <p className="text-muted text-sm">Diese Umfrage ist derzeit nicht aktiv.</p>
      </div>
    )
  }

  const handleSubmit = async () => {
    const missing = survey.questions
      .filter(q => q.required && !isAnswered(q, answers[q.id]))
      .map(q => q.text)
    if (missing.length > 0) {
      setValidationError(`Bitte beantworte noch: ${missing.join(', ')}`)
      return
    }
    setValidationError(null)
    try {
      await submit.mutateAsync({
        id: survey.id,
        data: { answers: survey.questions.map(q => answers[q.id]).filter(Boolean) as SurveyAnswerInput[] },
      })
      clearDraft(survey.id)
      setSubmitted(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler'
      setValidationError(`Absenden fehlgeschlagen: ${msg}`)
    }
  }

  return (
    <div className="pb-6">
      <BackButton to="/" className="mb-4" />
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{survey.title}</h2>
            {survey.description && (
              <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{survey.description}</p>
            )}
            <p className="text-sm text-subtle mt-2">Umfrage möglich bis {formatDateTime(survey.deadline)}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>Fortschritt</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full bg-elevated rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        {survey.questions.map((question, index) => {
          const input = answers[question.id]
          return (
            <div key={question.id} className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="font-medium text-foreground">
                  <span className="text-subtle">Frage {index + 1}:</span> {question.text}
                  {question.required && <span className="text-danger ml-1">*</span>}
                </p>
                {question.type !== 'TEXTFIELD' && question.type !== 'TEXTAREA' && (
                  <span className="text-xs text-subtle shrink-0 mt-0.5">
                    {question.type === 'RATING' ? 'Bewertung' : question.type === 'SINGLE' ? 'Einzelauswahl' : 'Mehrfachauswahl'}
                  </span>
                )}
              </div>
              {question.type === 'RATING' && (
                <RatingInput
                  value={input?.value}
                  onChange={v => setAnswers(prev => ({ ...prev, [question.id]: { questionId: question.id, value: v } }))}
                />
              )}
              {question.type === 'TEXTFIELD' && (
                <input
                  type="text"
                  value={input?.value ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [question.id]: { questionId: question.id, value: e.target.value } }))}
                  maxLength={question.maxLength ?? undefined}
                  className="input-field control w-full"
                  placeholder="Deine Antwort..."
                />
              )}
              {question.type === 'TEXTAREA' && (
                <textarea
                  value={input?.value ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [question.id]: { questionId: question.id, value: e.target.value } }))}
                  rows={3}
                  maxLength={question.maxLength ?? undefined}
                  className="input-field control w-full resize-y"
                  placeholder="Deine Antwort..."
                />
              )}
              {(question.type === 'SINGLE' || question.type === 'MULTI') && (
                <ChoiceInput
                  question={question}
                  input={input}
                  onChange={next => setAnswers(prev => ({ ...prev, [question.id]: next }))}
                />
              )}
            </div>
          )
        })}
      </div>

      {validationError && (
        <div className="mb-4 p-3 rounded-control border border-danger/40 bg-danger-bg text-danger text-sm">
          {validationError}
        </div>
      )}

      <div className="flex items-center justify-end gap-4 mb-8">
        <p className="text-xs text-subtle">Deine Antworten sind anonym.</p>
        <Button
          onClick={handleSubmit}
          disabled={submit.isPending}
          size="default"
        >
          {submit.isPending ? 'Wird gesendet...' : 'Absenden'}
        </Button>
      </div>
    </div>
  )
}

function PublicResults({ title, description, responseCount, questions }: {
  title: string
  description: string
  responseCount: number
  questions: { questionId: number; text: string; type: string; answerCount?: number; mean?: number; ratingDistribution?: number[]; counts?: { optionText: string; count: number }[] }[]
}) {
  const maxCount = Math.max(1, ...questions.flatMap(q => q.counts?.map(c => c.count) ?? [q.answerCount ?? 0]))
  return (
    <div>
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{description}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-subtle mt-5">{responseCount} Antworten</p>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        {questions.map(q => {
          if (q.type === 'RATING') {
            const total = q.ratingDistribution?.reduce((a, b) => a + b, 0) ?? 0
            return (
              <div key={q.questionId} className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card">
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
              <div key={q.questionId} className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card">
                <p className="font-medium text-foreground mb-3">{q.text}</p>
                <div className="flex flex-col gap-2">
                  {(q.counts ?? []).map(c => {
                    const pct = Math.round((c.count / maxCount) * 100)
                    return (
                      <div key={c.optionText} className="flex items-center gap-3">
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
          return (
            <div key={q.questionId} className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card">
              <p className="font-medium text-foreground mb-1">{q.text}</p>
              <p className="text-sm text-subtle">{q.answerCount ?? 0} Antworten</p>
            </div>
          )
        })}
      </div>

      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card">
        <BackButton to="/" className="px-0 pt-0" />
      </div>
    </div>
  )
}
