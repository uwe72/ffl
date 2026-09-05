import { useEffect, useRef, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSurveys, useCreateSurvey, useUpdateSurvey, useUpdateSurveyMeta, useCopySurvey, useDeleteSurvey, useSurveyStatusAction, useSurveyResult } from '../hooks/useSurveys'
import type { SurveyAdmin, QuestionType, SurveyQuestionRequest } from '../types'
import BackButton from '../components/BackButton'
import Button from '../components/Button'
import SurveyPreviewDialog from '../components/SurveyPreviewDialog'
import { questionNumber } from '../components/SurveyFormView'
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
  SEPARATOR: 'Trenner (Gruppe)',
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

interface DraftOption {
  _key: string
  text: string
}

interface DraftQuestion {
  _key: string
  type: QuestionType
  text: string
  required: boolean
  maxLength: number | null
  options: DraftOption[]
}

export interface Draft {
  title: string
  description: string
  deadline: string
  questions: DraftQuestion[]
}

let draftQuestionKeyCounter = 0

function nextDraftKey(): string {
  draftQuestionKeyCounter += 1
  return `q-${draftQuestionKeyCounter}`
}

function SortableQuestionCard({ id, headerLabel, isMobile, isSeparator, onRemove, children }: {
  id: string
  headerLabel: string
  isMobile: boolean
  isSeparator?: boolean
  onRemove: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const containerClasses = isSeparator
    ? `p-5 border rounded-card bg-info-bg-strong ${isDragging ? 'border-info shadow-lg' : 'border-info'}`
    : `p-5 border rounded-card bg-surface ${isDragging ? 'border-border-strong shadow-lg' : 'border-border'}`
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={containerClasses}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            style={{ touchAction: 'none' }}
            className="cursor-grab active:cursor-grabbing text-muted hover:text-accent p-1"
            aria-label={isSeparator ? 'Trenner verschieben' : 'Frage verschieben'}
            title={isSeparator ? 'Trenner verschieben' : 'Frage verschieben'}
          >
            <i className="sap-icon sap-icon-move text-base" />
          </button>
          <span className={`text-sm font-semibold ${isSeparator ? 'text-info-strong' : 'text-foreground'}`}>{headerLabel}</span>
        </div>
        <Button variant="negative" size={isMobile ? 'sm' : 'input'} onClick={onRemove}>Entfernen</Button>
      </div>
      {children}
    </div>
  )
}

function SortableOptionRow({ id, children }: {
  id: string
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 ${isDragging ? 'shadow-md' : ''}`}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        className="cursor-grab active:cursor-grabbing text-muted hover:text-accent p-1 shrink-0"
        aria-label="Option verschieben"
        title="Option verschieben"
      >
        <i className="sap-icon sap-icon-move text-base" />
      </button>
      {children}
    </div>
  )
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

  const changeStatus = (id: number, action: 'start' | 'end' | 'reopen' | 'reset', deadline?: string) => {
    statusAction.mutate({ id, action, deadline }, {
      onError: err => alert(apiErrorMessage(err)),
    })
  }

  const resetStatus = (id: number) => {
    if (!window.confirm('Möchtest du den Status dieser Umfrage wirklich auf „Angelegt" zurücksetzen?')) return
    changeStatus(id, 'reset')
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
                      {s.responseCount === 0 && <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => resetStatus(s.id)}>Zurücksetzen</Button>}
                      <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => copy(s.id)}>Kopieren</Button>
                      <Button variant="negative" size={isMobile ? 'sm' : 'input'} onClick={() => remove(s.id, s.responseCount)}>Löschen</Button>
                    </>
                  )}
                  {s.status === 'BEENDET' && (
                    <>
                      <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => showResults(s.id)}>Ergebnisse</Button>
                      <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => startMetaEdit(s)}>Bearbeiten</Button>
                      <Button variant="emphasized" size={isMobile ? 'sm' : 'input'} onClick={() => requestReopen(s)}>Reaktivieren</Button>
                      {s.responseCount === 0 && <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => resetStatus(s.id)}>Zurücksetzen</Button>}
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
            _key: nextDraftKey(),
            type: q.type,
            text: q.text,
            required: q.required,
            maxLength: q.maxLength ?? defaultMaxLength(q.type),
            options: q.options.map(o => ({ _key: nextDraftKey(), text: o.text })),
          })),
        }
      : { title: '', description: '', deadline: '', questions: [] },
  )
  const [created, setCreated] = useState<SurveyAdmin | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [saved, setSaved] = useState(false)
  const optionRefs = useRef<Record<number, Record<number, HTMLInputElement | null>>>({})
  const pendingOptionFocus = useRef<{ qIndex: number; oIndex: number } | null>(null)
  const questionTextRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const pendingTextFocus = useRef<number | null>(null)

  useEffect(() => {
    if (pendingOptionFocus.current) {
      const { qIndex, oIndex } = pendingOptionFocus.current
      optionRefs.current[qIndex]?.[oIndex]?.focus()
      pendingOptionFocus.current = null
    }
    if (pendingTextFocus.current != null) {
      questionTextRefs.current[pendingTextFocus.current]?.focus()
      pendingTextFocus.current = null
    }
  })

  useEffect(() => {
    setSaved(false)
  }, [draft])

  const setQuestion = (index: number, patch: Partial<DraftQuestion>) => {
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }))
  }

  const addQuestion = () => {
    pendingTextFocus.current = draft.questions.length
    setDraft(prev => ({ ...prev, questions: [...prev.questions, { _key: nextDraftKey(), type: 'TEXTAREA', text: '', required: false, maxLength: 4000, options: [] }] }))
  }

  const addSeparator = () => {
    pendingTextFocus.current = draft.questions.length
    setDraft(prev => ({ ...prev, questions: [...prev.questions, { _key: nextDraftKey(), type: 'SEPARATOR', text: '', required: false, maxLength: null, options: [] }] }))
  }

  const removeQuestion = (index: number) => {
    setDraft(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setDraft(prev => {
      const from = prev.questions.findIndex(q => q._key === active.id)
      const to = prev.questions.findIndex(q => q._key === over.id)
      if (from < 0 || to < 0) return prev
      return { ...prev, questions: arrayMove(prev.questions, from, to) }
    })
  }

  const handleOptionDragEnd = (qIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qIndex) return q
        const from = q.options.findIndex(o => o._key === active.id)
        const to = q.options.findIndex(o => o._key === over.id)
        if (from < 0 || to < 0) return q
        return { ...q, options: arrayMove(q.options, from, to) }
      }),
    }))
  }

  const setOption = (qIndex: number, oIndex: number, value: string) => {
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, text: value } : o)) } : q,
      ),
    }))
  }

  const addOption = (qIndex: number) => {
    const newIndex = draft.questions[qIndex].options.length
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, { _key: nextDraftKey(), text: '' }] } : q)),
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

  const saveDraft = async () => {
    if (!draft.title.trim()) {
      setError('Bitte gib einen Titel an.')
      return false
    }
    if (!draft.deadline) {
      setError('Bitte gib ein Zieldatum an.')
      return false
    }
    if (!draft.questions.some(q => q.required && q.type !== 'SEPARATOR')) {
      setError('Die Umfrage benötigt mindestens eine Pflichtfrage.')
      return false
    }
    const questions: SurveyQuestionRequest[] = draft.questions.map((q, i) => ({
      type: q.type,
      text: q.text,
      orderIndex: i,
      required: q.required,
      maxLength: q.type === 'TEXTFIELD' || q.type === 'TEXTAREA' ? q.maxLength : null,
      options: q.type === 'SEPARATOR' ? [] : q.options.map(o => o.text).filter(o => o.trim() !== ''),
    }))
    const missing = questions.findIndex(q => !q.text.trim())
    if (missing >= 0) {
      setError(questions[missing].type === 'SEPARATOR'
        ? `Der Trenner an Position ${missing + 1} hat keine Überschrift.`
        : `Frage ${questionNumber(draft.questions, missing)} hat keinen Text.`)
      return false
    }
    const choiceMissingOptions = questions.findIndex(q => (q.type === 'SINGLE' || q.type === 'MULTI') && (q.options ?? []).length === 0)
    if (choiceMissingOptions >= 0) {
      setError(`Auswahlfrage ${questionNumber(draft.questions, choiceMissingOptions)} benötigt mindestens eine Option.`)
      return false
    }
    setError(null)
    try {
      const payload = { title: draft.title, description: draft.description, deadline: draft.deadline, questions }
      if (created) {
        await update.mutateAsync({ id: created.id, data: payload })
      } else if (isNew) {
        const survey = await create.mutateAsync(payload)
        setCreated(survey)
      } else if (existing) {
        await update.mutateAsync({ id: existing.id, data: payload })
      }
      setSaved(true)
      return true
    } catch (e) {
      setError(apiErrorMessage(e))
      return false
    }
  }

  const handleSave = async () => {
    await saveDraft()
  }

  const handleSaveAndClose = async () => {
    if (await saveDraft()) onCancel()
  }

  return (
    <div className="max-w-3xl">
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">{isNew && !created ? 'Neue Umfrage' : 'Umfrage bearbeiten'}</h2>
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={draft.questions.map(q => q._key)} strategy={verticalListSortingStrategy}>
          <div className="mt-4 flex flex-col gap-3">
            {draft.questions.map((q, qIndex) => (
              <SortableQuestionCard
                key={q._key}
                id={q._key}
                headerLabel={q.type === 'SEPARATOR' ? 'Trenner' : `Frage ${questionNumber(draft.questions, qIndex)}`}
                isMobile={isMobile}
                isSeparator={q.type === 'SEPARATOR'}
                onRemove={() => removeQuestion(qIndex)}
              >
                {q.type === 'SEPARATOR' ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-sm text-muted mb-1">Gruppenüberschrift *</label>
                        <input
                          type="text"
                          ref={el => { questionTextRefs.current[qIndex] = el }}
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
                  </div>
                ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-sm text-muted mb-1">Fragetext *</label>
                      <input
                        type="text"
                        ref={el => { questionTextRefs.current[qIndex] = el }}
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
                          if (type === 'SEPARATOR') {
                            setQuestion(qIndex, { type, required: false, maxLength: null, options: [] })
                          } else {
                            setQuestion(qIndex, { type, maxLength: defaultMaxLength(type) })
                          }
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
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd(qIndex)}>
                        <SortableContext items={q.options.map(o => o._key)} strategy={verticalListSortingStrategy}>
                          {q.options.map((opt, oIndex) => (
                            <SortableOptionRow key={opt._key} id={opt._key}>
                              <input
                                type="text"
                                ref={el => {
                                  if (!optionRefs.current[qIndex]) optionRefs.current[qIndex] = {}
                                  optionRefs.current[qIndex][oIndex] = el
                                }}
                                value={opt.text}
                                onChange={e => setOption(qIndex, oIndex, e.target.value)}
                                className="input-field control w-full px-3 py-2 rounded-control text-sm"
                              />
                              <Button variant="negative" size="sm" onClick={() => removeOption(qIndex, oIndex)}>×</Button>
                            </SortableOptionRow>
                          ))}
                        </SortableContext>
                      </DndContext>
                      <Button variant="ghost" size={isMobile ? 'sm' : 'input'} className="self-start" onClick={() => addOption(qIndex)}>
                        + Option
                      </Button>
                    </div>
                  )}
                </div>
                )}
              </SortableQuestionCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size={isMobile ? 'sm' : 'input'} onClick={addQuestion}>
          + Frage hinzufügen
        </Button>
        <Button variant="ghost" size={isMobile ? 'sm' : 'input'} onClick={addSeparator}>
          + Trenner hinzufügen
        </Button>
        <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={() => setShowPreview(true)}>
          Vorschau
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-control border border-danger/40 bg-danger-bg text-danger text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={handleSave} disabled={create.isPending || update.isPending}>
          Speichern
        </Button>
        <Button size={isMobile ? 'sm' : 'input'} onClick={handleSaveAndClose} disabled={create.isPending || update.isPending}>
          {create.isPending || update.isPending ? 'Speichert...' : 'Speichern & schließen'}
        </Button>
        <Button variant="transparent" size={isMobile ? 'sm' : 'input'} onClick={onCancel}>Abbrechen</Button>
        {saved && <span className="text-sm text-muted">Gespeichert</span>}
      </div>

      {showPreview && (
        <SurveyPreviewDialog draft={draft} onClose={() => setShowPreview(false)} />
      )}
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
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(false)
  }, [draft])

  const saveDraft = async () => {
    if (!draft.title.trim()) {
      setError('Bitte gib einen Titel an.')
      return false
    }
    if (!draft.deadline) {
      setError('Bitte gib ein Zieldatum an.')
      return false
    }
    setError(null)
    try {
      await updateMeta.mutateAsync({
        id: existing.id,
        data: { title: draft.title, description: draft.description, deadline: draft.deadline },
      })
      setSaved(true)
      return true
    } catch (e) {
      setError(apiErrorMessage(e))
      return false
    }
  }

  const handleSave = async () => {
    await saveDraft()
  }

  const handleSaveAndClose = async () => {
    if (await saveDraft()) onCancel()
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

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={handleSave} disabled={updateMeta.isPending}>
          Speichern
        </Button>
        <Button size={isMobile ? 'sm' : 'input'} onClick={handleSaveAndClose} disabled={updateMeta.isPending}>
          {updateMeta.isPending ? 'Speichert...' : 'Speichern & schließen'}
        </Button>
        <Button variant="transparent" size={isMobile ? 'sm' : 'input'} onClick={onCancel}>Abbrechen</Button>
        {saved && <span className="text-sm text-muted">Gespeichert</span>}
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
