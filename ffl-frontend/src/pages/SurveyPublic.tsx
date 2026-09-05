import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePublicSurvey, useSubmitSurvey } from '../hooks/useSurveys'
import type { SurveyAnswerInput } from '../types'
import Button from '../components/Button'
import BackButton from '../components/BackButton'
import {
  SurveyFormHeader,
  SurveyFormQuestions,
  isAnswered,
  type SurveyAnswerState,
} from '../components/SurveyFormView'

const STORAGE_PREFIX = 'ffl-survey-draft-'

type AnswerState = SurveyAnswerState

function storageKey(surveyId: number) {
  return `${STORAGE_PREFIX}${surveyId}`
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

export default function SurveyPublic() {
  const { id } = useParams<{ id: string }>()
  const surveyId = Number(id)
  const { data: survey, isLoading, error } = usePublicSurvey(surveyId)
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
      <SurveyFormHeader
        title={survey.title}
        description={survey.description}
        deadline={survey.deadline}
      />
      <SurveyFormQuestions
        questions={survey.questions}
        answers={answers}
        onAnswer={(questionId, input) => setAnswers(prev => ({ ...prev, [questionId]: input }))}
      />
      {validationError && (
        <div className="mb-1 md:mb-4 p-3 rounded-control border border-danger/40 bg-danger-bg text-danger text-sm">
          {validationError}
        </div>
      )}
      <div className="flex items-center justify-end gap-4 mb-4 md:mb-8">
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
