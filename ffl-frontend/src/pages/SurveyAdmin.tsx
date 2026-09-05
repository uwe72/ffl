import { useEffect, useRef, useState } from 'react'
import { useSurveys, useCreateSurvey, useUpdateSurvey, useUpdateSurveyMeta, useCopySurvey, useDeleteSurvey, useSurveyStatusAction, useSurveyResult } from '../hooks/useSurveys'
import type { SurveyAdmin, QuestionType, SurveyQuestionRequest } from '../types'
import BackButton from '../components/BackButton'
import Button from '../components/Button'
import useIsMobile from '../hooks/useIsMobile'

const STATUS_LABEL: Record<string, string> = {
  ANGELEGT: 'Angelegt',
  GESTARTET: 'Gestartet',
  BEENDET: 'Beendet',
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

function formatDateTime(iso?: string | null) {
  if (!iso) return '–'
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
  } catch {
    return iso
  }
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function apiErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (err instanceof Error && err.message) return err.message
  return 'Aktion fehlgeschlagen'
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
  deadline: string
  questions: DraftQuestion[]
}

export default function SurveyAdmin() {
  const isMobile = useIsMobile()
  const { data: surveys, isLoading } = useSurveys()
  const statusAction = useSurveyStatusAction()
  const deleteMutation = useDeleteSurvey()
  const copyMutation = useCopySurvey()
  const [mode, setMode] = useState<'list' | 'edit' | 'meta' | 'result'>('list')
  const [editing, setEditing] = useState<SurveyAdmin | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [reopenTarget, setReopenTarget] = useState<SurveyAdmin | null>(null)

  const changeStatus = (id: number, action: 'start' | 'end' | 'reopen', deadline?: string) => {
    statusAction.mutate({ id, action, deadline }, {
      onError: err => alert(apiErrorMessage(err)),
    })
  }

  const remove = (id: number, responseCount: number) => {
    const warning = responseCount > 0
      ? `Möchtest du diese Umfrage wirklich löschen? Alle ${responseCount} Antworten werden ebenfalls gelöscht.`
      : 'Möchtest du diese Umfrage wirklich löschen?'
    if (!window.confirm(warning)) return
    deleteMutation.mutate(id, {
      onError: err => alert(apiErrorMessage(err)),
    })
  }

  const copy = (id: number) => {
    copyMutation.mutate(id, {
      onError: err => alert(apiErrorMessage(err)),
    })
  }

  const requestReopen = (s: SurveyAdmin) => {
    if (new Date(s.deadline).getTime() <= Date.now()) {
      setReopenTarget(s)
    } else {
      changeStatus(s.id, 'reopen')
    }
  }

  const startMetaEdit = (s: SurveyAdmin) => {
    setEditing(s)
    setIsNew(false)
    setMode('meta')
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

  if (mode === 'meta' && editing) {
    return <SurveyMetaEditor key={editing.id} existing={editing} onCancel={() => setMode('list')} />
  }

  if (mode === 'result' && activeId != null) {
    return <SurveyResults id={activeId} onBack={() => setMode('list')} />
  }

  return (
    <div>
      <BackButton to="/" className="mb-4" />
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6 w-full md:w-fit max-w-full">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Umfragen</h2>
            <p className="text-sm text-muted mt-1">Verwaltung und Auswertung</p>
          </div>
          <Button onClick={startCreate}>+ Neue Umfrage</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted">Laden...</div>
      ) : !surveys || surveys.length === 0 ? (
        <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card text-center text-subtle">
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
                    <span>Möglich bis: {formatDateTime(s.deadline)}</span>
                    <span>Erstellt: {formatDate(s.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {s.status === 'ANGELEGT' && (
                    <>
                      {!isMobile && <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => startEdit(s)}>Bearbeiten</Button>}
                      <Button variant="emphasized" size={isMobile ? 'sm' : 'input'} onClick={() => changeStatus(s.id, 'start')}>Starten</Button>
                      <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => copy(s.id)}>Kopieren</Button>
                      <Button variant="negative" size={isMobile ? 'sm' : 'input'} onClick={() => remove(s.id, s.responseCount)}>Löschen</Button>
                    </>
                  )}
                  {s.status === 'GESTARTET' && (
                    <>
                      <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => showResults(s.id)}>Ergebnisse</Button>
                      <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => startMetaEdit(s)}>Bearbeiten</Button>
                      <Button variant="emphasized" size={isMobile ? 'sm' : 'input'} onClick={() => changeStatus(s.id, 'end')}>Beenden</Button>
                      <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => copy(s.id)}>Kopieren</Button>
                      <Button variant="negative" size={isMobile ? 'sm' : 'input'} onClick={() => remove(s.id, s.responseCount)}>Löschen</Button>
                    </>
                  )}
                  {s.status === 'BEENDET' && (
                    <>
                      <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => showResults(s.id)}>Ergebnisse</Button>
                      <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => startMetaEdit(s)}>Bearbeiten</Button>
                      <Button variant="emphasized" size={isMobile ? 'sm' : 'input'} onClick={() => requestReopen(s)}>Reaktivieren</Button>
                      <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => copy(s.id)}>Kopieren</Button>
                      <Button variant="negative" size={isMobile ? 'sm' : 'input'} onClick={() => remove(s.id, s.responseCount)}>Löschen</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReopenDialog survey={reopenTarget} onClose={() => setReopenTarget(null)} />
    </div>
  )
}

function SurveyEditor({ existing, isNew, onCancel }: {
  existing: SurveyAdmin | null
  isNew: boolean
  onCancel: () => void
}) {
  const isMobile = useIsMobile()
  const create = useCreateSurvey()
  const update = useUpdateSurvey()
  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? {
          title: existing.title,
          description: existing.description ?? '',
          deadline: toDatetimeLocal(existing.deadline),
          questions: existing.questions.map(q => ({
            type: q.type,
            text: q.text,
            required: q.required,
            maxLength: q.maxLength ?? defaultMaxLength(q.type),
            options: q.options.map(o => o.text),
          })),
        }
      : { title: '', description: '', deadline: '', questions: [] },
  )
  const [error, setError] = useState<string | null>(null)
  const optionRefs = useRef<Record<number, Record<number, HTMLInputElement | null>>>({})
  const pendingOptionFocus = useRef<{ qIndex: number; oIndex: number } | null>(null)

  useEffect(() => {
    if (pendingOptionFocus.current) {
      const { qIndex, oIndex } = pendingOptionFocus.current
      optionRefs.current[qIndex]?.[oIndex]?.focus()
      pendingOptionFocus.current = null
    }
  })

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
    const newIndex = draft.questions[qIndex].options.length
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ''] } : q)),
    }))
    pendingOptionFocus.current = { qIndex, oIndex: newIndex }
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
    if (!draft.deadline) {
      setError('Bitte gib ein Zieldatum an.')
      return
    }
    if (!draft.questions.some(q => q.required)) {
      setError('Die Umfrage benötigt mindestens eine Pflichtfrage.')
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
      const payload = { title: draft.title, description: draft.description, deadline: draft.deadline, questions }
      if (isNew) {
        await create.mutateAsync(payload)
      } else if (existing) {
        await update.mutateAsync({ id: existing.id, data: payload })
      }
      onCancel()
    } catch (e) {
      setError(apiErrorMessage(e))
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">{isNew ? 'Neue Umfrage' : 'Umfrage bearbeiten'}</h2>
          <Button variant="transparent" size={isMobile ? 'sm' : 'input'} onClick={onCancel}>
            <i className="sap-icon sap-icon-nav-back text-base" />
            Zurück
          </Button>
        </div>
      </div>

      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-muted mb-1">Titel *</label>
            <input
              type="text"
              value={draft.title}
              onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
              className="input-field control w-full px-3 py-2 rounded-control text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Beschreibung</label>
            <textarea
              value={draft.description}
              onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="input-field control w-full px-3 py-2 rounded-control text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Umfrage möglich bis *</label>
            <input
              type="datetime-local"
              value={draft.deadline}
              onChange={e => setDraft(prev => ({ ...prev, deadline: e.target.value }))}
              className="input-field control w-full px-3 py-2 rounded-control text-sm"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {draft.questions.map((q, qIndex) => (
          <div key={qIndex} className="p-5 bg-surface border border-border rounded-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Frage {qIndex + 1}</span>
              <Button variant="negative" size={isMobile ? 'sm' : 'input'} onClick={() => removeQuestion(qIndex)}>Entfernen</Button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-muted mb-1">Fragetext *</label>
                  <input
                    type="text"
                    value={q.text}
                    onChange={e => setQuestion(qIndex, { text: e.target.value })}
                    className="input-field control w-full px-3 py-2 rounded-control text-sm"
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
                    className="input-field control w-full px-3 py-2 rounded-control text-sm"
                  >
                    {(Object.keys(TYPE_LABEL) as QuestionType[]).map(t => (
                      <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex items-center">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={e => setQuestion(qIndex, { required: e.target.checked })}
                      className="h-4 w-4 accent-accent"
                    />
                    Pflichtfrage
                  </label>
                </div>
                {(q.type === 'TEXTFIELD' || q.type === 'TEXTAREA') && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-muted">Max. Länge (Zeichen)</label>
                    <input
                      type="number"
                      min={1}
                      value={q.maxLength ?? ''}
                      onChange={e => setQuestion(qIndex, { maxLength: e.target.value === '' ? null : Number(e.target.value) })}
                      className="input-field control w-full px-3 py-2 rounded-control text-sm"
                    />
                  </div>
                )}
              </div>
              {(q.type === 'SINGLE' || q.type === 'MULTI') && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-muted">Optionen</label>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="text"
                        ref={el => {
                          if (!optionRefs.current[qIndex]) optionRefs.current[qIndex] = {}
                          optionRefs.current[qIndex][oIndex] = el
                        }}
                        value={opt}
                        onChange={e => setOption(qIndex, oIndex, e.target.value)}
                        className="input-field control w-full px-3 py-2 rounded-control text-sm"
                      />
                      <Button variant="negative" size="sm" onClick={() => removeOption(qIndex, oIndex)}>×</Button>
                    </div>
                  ))}
                  <Button variant="ghost" size={isMobile ? 'sm' : 'input'} className="self-start" onClick={() => addOption(qIndex)}>
                    + Option
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button variant="ghost" size={isMobile ? 'sm' : 'input'} onClick={addQuestion}>
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

function ReopenDialog({ survey, onClose }: { survey: SurveyAdmin | null; onClose: () => void }) {
  const statusAction = useSurveyStatusAction()
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (survey) {
      setDeadline(toDatetimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()))
      setError(null)
    }
  }, [survey])

  if (!survey) return null

  const handleReopen = async () => {
    if (!deadline) {
      setError('Bitte gib ein neues Zieldatum an.')
      return
    }
    setError(null)
    try {
      await statusAction.mutateAsync({ id: survey.id, action: 'reopen', deadline })
      onClose()
    } catch (e) {
      setError(apiErrorMessage(e))
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={() => { if (!statusAction.isPending) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-reopen-dialog-title"
        className="bg-surface border border-border rounded-card shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="survey-reopen-dialog-title" className="text-lg font-bold text-foreground">
          Umfrage reaktivieren
        </h2>
        <p className="text-sm text-muted mt-2">
          Das Zieldatum von „{survey.title}" ist abgelaufen. Setze ein neues Zieldatum, um die Umfrage wieder zu öffnen.
        </p>
        <div className="mt-4">
          <label className="block text-sm text-muted mb-1">Umfrage möglich bis *</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="input-field control w-full px-3 py-2 rounded-control text-sm"
          />
        </div>
        {error && (
          <div className="mt-4 p-3 rounded-control border border-danger/40 bg-danger-bg text-danger text-sm">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="input" onClick={onClose} disabled={statusAction.isPending}>
            Abbrechen
          </Button>
          <Button variant="emphasized" size="input" onClick={handleReopen} disabled={statusAction.isPending}>
            {statusAction.isPending ? 'Wird geöffnet...' : 'Reaktivieren'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SurveyMetaEditor({ existing, onCancel }: {
  existing: SurveyAdmin
  onCancel: () => void
}) {
  const isMobile = useIsMobile()
  const updateMeta = useUpdateSurveyMeta()
  const [draft, setDraft] = useState({
    title: existing.title,
    description: existing.description ?? '',
    deadline: toDatetimeLocal(existing.deadline),
  })
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!draft.title.trim()) {
      setError('Bitte gib einen Titel an.')
      return
    }
    if (!draft.deadline) {
      setError('Bitte gib ein Zieldatum an.')
      return
    }
    setError(null)
    try {
      await updateMeta.mutateAsync({
        id: existing.id,
        data: { title: draft.title, description: draft.description, deadline: draft.deadline },
      })
      onCancel()
    } catch (e) {
      setError(apiErrorMessage(e))
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">Umfrage bearbeiten</h2>
          <Button variant="transparent" size={isMobile ? 'sm' : 'input'} onClick={onCancel}>
            <i className="sap-icon sap-icon-nav-back text-base" />
            Zurück
          </Button>
        </div>
      </div>

      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card">
        <p className="text-sm text-muted mb-4">
          Hier können nur Titel, Beschreibung und Zieldatum geändert werden. Die Fragen bleiben unverändert.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-muted mb-1">Titel *</label>
            <input
              type="text"
              value={draft.title}
              onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
              className="input-field control w-full px-3 py-2 rounded-control text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Beschreibung</label>
            <textarea
              value={draft.description}
              onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="input-field control w-full px-3 py-2 rounded-control text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Umfrage möglich bis *</label>
            <input
              type="datetime-local"
              value={draft.deadline}
              onChange={e => setDraft(prev => ({ ...prev, deadline: e.target.value }))}
              className="input-field control w-full px-3 py-2 rounded-control text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Fragen (schreibgeschützt)</label>
            <div className="flex flex-col divide-y divide-border border border-border rounded-control">
              {existing.questions.map(q => (
                <div key={q.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                  <span className="text-foreground flex-1 min-w-0 truncate">{q.text}</span>
                  <span className="text-subtle shrink-0">{TYPE_LABEL[q.type]}</span>
                  {q.required && <span className="text-subtle shrink-0">Pflicht</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-control border border-danger/40 bg-danger-bg text-danger text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button onClick={handleSave} disabled={updateMeta.isPending}>
          {updateMeta.isPending ? 'Speichert...' : 'Speichern'}
        </Button>
        <Button variant="transparent" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  )
}

function SurveyResults({ id, onBack }: { id: number; onBack: () => void }) {
  const isMobile = useIsMobile()
  const { data: result, isLoading } = useSurveyResult(id)
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
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(result.status)}`}>
              {STATUS_LABEL[result.status]}
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
