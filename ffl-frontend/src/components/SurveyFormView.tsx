import type { QuestionType, SurveyQuestion, SurveyAnswerInput } from '../types'

export type SurveyAnswerState = Record<number, SurveyAnswerInput>

export function formatDateTime(iso: string) {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
  } catch {
    return iso
  }
}

export function questionNumber(questions: { type: QuestionType }[], index: number): number {
  let count = 0
  for (let i = 0; i <= index; i++) {
    if (questions[i].type !== 'SEPARATOR') count++
  }
  return count
}

export function isAnswered(question: SurveyQuestion, input: SurveyAnswerInput | undefined): boolean {
  if (question.type === 'SEPARATOR') return false
  if (!input) return false
  if (question.type === 'RATING') return !!input.value
  if (question.type === 'TEXTFIELD' || question.type === 'TEXTAREA') return !!input.value && input.value.trim() !== ''
  return !!input.optionIds && input.optionIds.length > 0
}

export function RatingInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
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

export function ChoiceInput({ question, input, onChange }: {
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

export function SurveyFormHeader({ title, description, deadline, progress }: {
  title: string
  description?: string | null
  deadline?: string | null
  progress?: number
}) {
  return (
    <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-1 md:mb-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{description}</p>
          )}
          {deadline && (
            <p className="text-sm text-subtle mt-2">Umfrage möglich bis {formatDateTime(deadline)}</p>
          )}
        </div>
      </div>

      {progress !== undefined && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>Fortschritt</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full bg-elevated rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function SurveyFormQuestions({ questions, answers, onAnswer }: {
  questions: SurveyQuestion[]
  answers: SurveyAnswerState
  onAnswer: (questionId: number, input: SurveyAnswerInput) => void
}) {
  return (
    <div className="flex flex-col gap-1 md:gap-4 mb-1 md:mb-4">
      {questions.map((question, index) => {
        if (question.type === 'SEPARATOR') {
          return (
            <div key={question.id} className="flex items-center gap-3 mt-4 md:mt-6 px-1">
              <h3 className="text-lg font-bold text-foreground whitespace-pre-wrap">{question.text}</h3>
              <div className="flex-1 h-px bg-border" />
            </div>
          )
        }
        const input = answers[question.id]
        return (
          <div key={question.id} className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="font-medium text-foreground">
                <span className="text-subtle">Frage {questionNumber(questions, index)}:</span> {question.text}
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
                onChange={v => onAnswer(question.id, { questionId: question.id, value: v })}
              />
            )}
            {question.type === 'TEXTFIELD' && (
              <input
                type="text"
                value={input?.value ?? ''}
                onChange={e => onAnswer(question.id, { questionId: question.id, value: e.target.value })}
                maxLength={question.maxLength ?? undefined}
                className="input-field control w-full"
                placeholder="Deine Antwort..."
              />
            )}
            {question.type === 'TEXTAREA' && (
              <textarea
                value={input?.value ?? ''}
                onChange={e => onAnswer(question.id, { questionId: question.id, value: e.target.value })}
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
                onChange={next => onAnswer(question.id, next)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
