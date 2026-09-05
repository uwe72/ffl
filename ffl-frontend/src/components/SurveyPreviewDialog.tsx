import { useMemo, useRef, useState } from 'react'
import type { SurveyQuestion } from '../types'
import type { Draft } from '../pages/SurveyAdmin'
import Button from './Button'
import { exportSurveyPdf } from '../utils/surveyPdf'
import {
  SurveyFormHeader,
  SurveyFormQuestions,
  type SurveyAnswerState,
} from './SurveyFormView'
import { trackEvent } from '../hooks/useMatomo'
import useIsMobile from '../hooks/useIsMobile'

function buildWhatsappText(draft: Draft): string {
  const lines: string[] = []
  lines.push(`*${draft.title.trim()}*`)
  const description = draft.description.trim()
  if (description) {
    lines.push('')
    lines.push(description)
  }
  let questionNumber = 0
  for (const q of draft.questions) {
    if (q.type === 'SEPARATOR') {
      lines.push('')
      lines.push(`*${q.text.trim()}*`)
      continue
    }
    questionNumber += 1
    let questionLine = `${questionNumber}. ${q.text.trim()}`
    if (q.type === 'RATING') questionLine += ' (1–5 Sterne)'
    if (q.required) questionLine += ' (Pflicht)'
    lines.push('')
    lines.push(questionLine)
    if (q.type === 'SINGLE' || q.type === 'MULTI') {
      const marker = q.type === 'SINGLE' ? '○' : '☐'
      for (const o of q.options) {
        if (o.text.trim() !== '') lines.push(`${marker} ${o.text.trim()}`)
      }
    }
  }
  return lines.join('\n')
}

export default function SurveyPreviewDialog({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const isMobile = useIsMobile()
  const [answers, setAnswers] = useState<SurveyAnswerState>({})
  const [whatsappCopied, setWhatsappCopied] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const questions: SurveyQuestion[] = useMemo(
    () => draft.questions.map((q, i) => ({
      id: i + 1,
      type: q.type,
      text: q.text,
      orderIndex: i,
      required: q.required,
      maxLength: q.maxLength,
      options: q.type === 'SINGLE' || q.type === 'MULTI'
        ? q.options
          .filter(o => o.text.trim() !== '')
          .map((o, j) => ({ id: j + 1, text: o.text, orderIndex: j }))
        : [],
    })),
    [draft],
  )

  const handleWhatsappExport = async () => {
    const text = buildWhatsappText(draft)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.top = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      trackEvent('survey', 'export_whatsapp')
      setWhatsappCopied(true)
      window.setTimeout(() => setWhatsappCopied(false), 2000)
    } catch {
      setWhatsappCopied(false)
    }
  }

  const handlePdfExport = async () => {
    if (!printRef.current || pdfGenerating) return
    setPdfGenerating(true)
    try {
      await exportSurveyPdf(printRef.current, draft.title.trim() || 'Vorschau')
      trackEvent('survey', 'export_pdf')
    } finally {
      setPdfGenerating(false)
    }
  }

  const printContainerWidth = Math.min(672, typeof window !== 'undefined' ? window.innerWidth - 32 : 672)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-preview-dialog-title"
        className="bg-elevated border border-border rounded-card shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 id="survey-preview-dialog-title" className="text-lg font-bold text-foreground">
            Vorschau
          </h2>
          <Button variant="transparent" size={isMobile ? 'sm' : 'input'} onClick={onClose}>
            <i className="sap-icon sap-icon-nav-back text-base" />
            Zurück
          </Button>
        </div>

        <SurveyFormHeader
          title={draft.title.trim() || 'Umfragetitel'}
          description={draft.description.trim() ? draft.description : null}
          deadline={draft.deadline || null}
        />
        <SurveyFormQuestions
          questions={questions}
          answers={answers}
          onAnswer={(questionId, input) => setAnswers(prev => ({ ...prev, [questionId]: input }))}
        />

        {questions.length === 0 && (
          <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-1 md:mb-4 text-center">
            <p className="text-muted text-sm">Noch keine Fragen hinzugefügt.</p>
          </div>
        )}

        <div className="mt-2 md:mt-4 flex items-center justify-end gap-2 flex-wrap">
          <p className="text-xs text-subtle mr-auto">Vorschau – Antworten werden nicht gespeichert.</p>
          <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={handlePdfExport} disabled={pdfGenerating}>
            {pdfGenerating ? 'PDF wird erstellt…' : 'PDF Export'}
          </Button>
          <Button variant="secondary" size={isMobile ? 'sm' : 'input'} onClick={handleWhatsappExport}>
            {whatsappCopied ? 'Kopiert!' : 'WhatsApp Export'}
          </Button>
          <Button variant="ghost" size={isMobile ? 'sm' : 'input'} onClick={onClose}>
            Schließen
          </Button>
        </div>
      </div>

      <div
        ref={printRef}
        aria-hidden="true"
        className="bg-elevated border border-border rounded-card shadow-2xl p-4 md:p-6"
        style={{ position: 'fixed', top: 0, left: -10000, width: printContainerWidth, pointerEvents: 'none' }}
      >
        <SurveyFormHeader
          title={draft.title.trim() || 'Umfragetitel'}
          description={draft.description.trim() ? draft.description : null}
          deadline={draft.deadline || null}
        />
        <SurveyFormQuestions
          questions={questions}
          answers={answers}
          onAnswer={(questionId, input) => setAnswers(prev => ({ ...prev, [questionId]: input }))}
        />

        {questions.length === 0 && (
          <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-1 md:mb-4 text-center">
            <p className="text-muted text-sm">Noch keine Fragen hinzugefügt.</p>
          </div>
        )}
      </div>
    </div>
  )
}
