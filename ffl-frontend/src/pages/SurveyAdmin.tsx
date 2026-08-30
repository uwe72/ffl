import { useState } from 'react'
import { useSurveys, useCreateSurvey, useUpdateSurvey, useDeleteSurvey, useSurveyStatusAction, useSurveyResult } from '../hooks/useSurveys'
import type { SurveyAdmin, QuestionType, SurveyQuestionRequest } from '../types'
import Button from '../components/Button'

const STATUS_LABEL: Record<string, string> = {
  ANGELEGT: 'Angelegt',
  GESTARTET: 'Gestartet',
  BEENDET: 'Beendet',
  VEROEFFENTLICHT: 'Veröffentlicht',
}

const TYPE_LABEL: Record<QuestionType, string> = {
  RATING: 'Bewertung (1–5)',
  SINGLE: 'Einzelauswahl',
  MULTI: 'Mehrfachauswahl',
  TEXTFIELD: 'Textfeld',
  TEXTAREA: 'Textarea',
}

function defaultMaxLength(type: QuestionType): number | null {
  if (type === 'TEXTFIELD') return 255
  if (type === 'TEXTAREA') return 4000
  return null
}

function statusClass(status: string) {
  if (status === 'GESTARTET') return 'text-success bg-success-bg'
  if (status === 'VEROEFFENTLICHT') return 'text-link bg-accent-muted'
  return 'text-muted bg-elevated'
}

function formatDate(iso?: string | null) {
  if (!iso) return '–'
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

interface DraftQuestion {
  type: QuestionType
  text: string
  required: boolean
  maxLength: number | null
  options: string[]
}

interface Draft {
  title: string
  description: string
  questions: DraftQuestion[]
}

export default function SurveyAdmin() {
  const { data: surveys, isLoading } = useSurveys()
  const statusAction = useSurveyStatusAction()
  const deleteMutation = useDeleteSurvey()
  const [mode, setMode] = useState<'list' | 'edit' | 'result'>('list')
  const [editing, setEditing] = useState<SurveyAdmin | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)

  const changeStatus = (id: number, action: 'start' | 'end' | 'publish') => {
    statusAction.mutate({ id, action }, {
      onError: err => alert(err instanceof Error ? err.message : 'Aktion fehlgeschlagen'),
    })
  }

  const remove = (id: number) => {
    if (!window.confirm('Möchtest du diese Umfrage wirklich löschen?')) return
    deleteMutation.mutate(id, {
      onError: err => alert(err instanceof Error ? err.message : 'Löschen fehlgeschlagen'),
    })
  }

  const startCreate = () => {
    setEditing(null)
    setIsNew(true)
    setMode('edit')
  }

  const startEdit = (s: SurveyAdmin) => {
    setEditing(s)
    setIsNew(false)
    setMode('edit')
  }

  const showResults = (id: number) => {
    setActiveId(id)
    setMode('result')
  }

  if (mode === 'edit') {
    return <SurveyEditor key={editing?.id ?? 'new'} existing={editing} isNew={isNew} onCancel={() => setMode('list')} />
  }

  if (mode === 'result' && activeId != null) {
    return <SurveyResults id={activeId} onBack={() => setMode('list')} />
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Umfragen</h1>
          <p className="text-sm text-muted">Verwaltung und Auswertung</p>
        </div>
        <Button onClick={startCreate}>+ Neue Umfrage</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted">Laden...</div>
      ) : !surveys || surveys.length === 0 ? (
        <div className="p-6 bg-surface border border-border rounded-card text-center text-subtle">
          Noch keine Umfragen vorhanden.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {surveys.map(s => (
            <div key={s.id} className="p-5 bg-surface border border-border rounded-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground truncate">{s.title}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(s.status)}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  {s.description && <p className="text-sm text-muted mt-1 line-clamp-2">{s.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-subtle">
                    <span>{s.questions.length} Fragen</span>
                    <span>{s.responseCount} Antworten</span>
                    <span>Erstellt: {formatDate(s.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {s.status === 'ANGELEGT' && (
                    <>
                      <Button variant="secondary" size="compact" onClick={() => startEdit(s)}>Bearbeiten</Button>
                      <Button variant="emphasized" size="compact" onClick={() => changeStatus(s.id, 'start')}>Starten</Button>
                      <Button variant="negative" size="compact" onClick={() => remove(s.id)}>Löschen</Button>
                    </>
                  )}
                  {s.status === 'GESTARTET' && (
                    <>
                      <Button variant="secondary" size="compact" onClick={() => showResults(s.id)}>Ergebnisse</Button>
                      <Button variant="emphasized" size="compact" onClick={() => changeStatus(s.id, 'end')}>Beenden</Button>
                    </>
                  )}
                  {s.status === 'BEENDET' && (
                    <>
                      <Button variant="secondary" size="compact" onClick={() => showResults(s.id)}>Ergebnisse</Button>
                      <Button variant="emphasized" size="compact" onClick={() => changeStatus(s.id, 'publish')}>Veröffentlichen</Button>
                    </>
                  )}
                  {s.status === 'VEROEFFENTLICHT' && (
                    <Button variant="secondary" size="compact" onClick={() => showResults(s.id)}>Ergebnisse</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SurveyEditor({ existing, isNew, onCancel }: {
  existing: SurveyAdmin | null
  isNew: boolean
  onCancel: () => void
}) {
  const create = useCreateSurvey()
  const update = useUpdateSurvey()
  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? {
          title: existing.title,
          description: existing.description ?? '',
          questions: existing.questions.map(q => ({
            type: q.type,
            text: q.text,
            required: q.required,
            maxLength: q.maxLength ?? defaultMaxLength(q.type),
            options: q.options.map(o => o.text),
          })),
        }
      : { title: '', description: '', questions: [] },
  )
  const [error, setError] = useState<string | null>(null)

  const setQuestion = (index: number, patch: Partial<DraftQuestion>) => {
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }))
  }

  const addQuestion = () => {
    setDraft(prev => ({ ...prev, questions: [...prev.questions, { type: 'TEXTAREA', text: '', required: false, maxLength: 4000, options: [] }] }))
  }

  const removeQuestion = (index: number) => {
    setDraft(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }))
  }

  const setOption = (qIndex: number, oIndex: number, value: string) => {
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q,
      ),
    }))
  }

  const addOption = (qIndex: number) => {
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ''] } : q)),
    }))
  }

  const removeOption = (qIndex: number, oIndex: number) => {
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.filter((_, j) => j !== oIndex) } : q,
      ),
    }))
  }

  const handleSave = async () => {
    if (!draft.title.trim()) {
      setError('Bitte gib einen Titel an.')
      return
    }
    const questions: SurveyQuestionRequest[] = draft.questions.map((q, i) => ({
      type: q.type,
      text: q.text,
      orderIndex: i,
      required: q.required,
      maxLength: q.type === 'TEXTFIELD' || q.type === 'TEXTAREA' ? q.maxLength : null,
      options: q.options.filter(o => o.trim() !== ''),
    }))
    const missing = questions.findIndex(q => !q.text.trim())
    if (missing >= 0) {
      setError(`Frage ${missing + 1} hat keinen Text.`)
      return
    }
    const choiceMissingOptions = questions.findIndex(q => (q.type === 'SINGLE' || q.type === 'MULTI') && (q.options ?? []).length === 0)
    if (choiceMissingOptions >= 0) {
      setError(`Auswahlfrage ${choiceMissingOptions + 1} benötigt mindestens eine Option.`)
      return
    }
    setError(null)
    try {
      const payload = { title: draft.title, description: draft.description, questions }
      if (isNew) {
        await create.mutateAsync(payload)
      } else if (existing) {
        await update.mutateAsync({ id: existing.id, data: payload })
      }
      onCancel()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-foreground">{isNew ? 'Neue Umfrage' : 'Umfrage bearbeiten'}</h1>
        <Button variant="transparent" size="compact" onClick={onCancel}>
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück
        </Button>
      </div>

      <div className="p-6 bg-surface border border-border rounded-card">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-muted mb-1">Titel *</label>
            <input
              type="text"
              value={draft.title}
              onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
              className="input-field control w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Beschreibung</label>
            <textarea
              value={draft.description}
              onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="input-field control w-full resize-y"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {draft.questions.map((q, qIndex) => (
          <div key={qIndex} className="p-5 bg-surface border border-border rounded-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Frage {qIndex + 1}</span>
              <Button variant="negative" size="sm" onClick={() => removeQuestion(qIndex)}>Entfernen</Button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-muted mb-1">Fragetext *</label>
                  <input
                    type="text"
                    value={q.text}
                    onChange={e => setQuestion(qIndex, { text: e.target.value })}
                    className="input-field control w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Typ</label>
                  <select
                    value={q.type}
                    onChange={e => {
                      const type = e.target.value as QuestionType
                      setQuestion(qIndex, { type, maxLength: defaultMaxLength(type) })
                    }}
                    className="input-field control w-full"
                  >
                    {(Object.keys(TYPE_LABEL) as QuestionType[]).map(t => (
                      <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={e => setQuestion(qIndex, { required: e.target.checked })}
                  className="h-4 w-4 accent-accent"
                />
                Pflichtfrage
              </label>
              {(q.type === 'TEXTFIELD' || q.type === 'TEXTAREA') && (
                <div>
                  <label className="block text-sm text-muted mb-1">Max. Länge (Zeichen)</label>
                  <input
                    type="number"
                    min={1}
                    value={q.maxLength ?? ''}
                    onChange={e => setQuestion(qIndex, { maxLength: e.target.value === '' ? null : Number(e.target.value) })}
                    className="input-field control w-40"
                  />
                </div>
              )}
              {(q.type === 'SINGLE' || q.type === 'MULTI') && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-muted">Optionen</label>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={e => setOption(qIndex, oIndex, e.target.value)}
                        className="input-field control w-full"
                      />
                      <Button variant="negative" size="sm" onClick={() => removeOption(qIndex, oIndex)}>×</Button>
                    </div>
                  ))}
                  <Button variant="secondary" size="compact" className="self-start" onClick={() => addOption(qIndex)}>
                    + Option
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button variant="secondary" size="compact" onClick={addQuestion}>
          + Frage hinzufügen
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-control border border-danger/40 bg-danger-bg text-danger text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
          {create.isPending || update.isPending ? 'Speichert...' : 'Speichern'}
        </Button>
        <Button variant="transparent" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  )
}

function SurveyResults({ id, onBack }: { id: number; onBack: () => void }) {
  const { data: result, isLoading } = useSurveyResult(id)
  if (isLoading || !result) return <div className="text-center py-8 text-muted">Laden...</div>

  const maxCount = Math.max(
    1,
    ...result.questions.flatMap(q => q.counts?.map(c => c.count) ?? [q.answerCount ?? 0]),
  )

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{result.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(result.status)}`}>
              {STATUS_LABEL[result.status]}
            </span>
            <span>{result.responseCount} Antworten</span>
          </div>
        </div>
        <Button variant="transparent" size="compact" onClick={onBack}>
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {result.questions.map(q => {
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
              {result.responses.map((r, i) => (
                <div key={i} className="border border-border rounded-control p-3">
                  <p className="text-xs text-subtle mb-2">{formatDate(r.submittedAt)}</p>
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
