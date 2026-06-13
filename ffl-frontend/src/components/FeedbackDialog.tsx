import { useEffect, useRef, useCallback } from 'react'
import Button from './Button'
import FeedbackForm from './FeedbackForm'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackDialog({ isOpen, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
          'input, textarea, button, [href], [tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
      }, 50)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      if (previousFocusRef.current && !isOpen) {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        className="bg-surface border border-border rounded-lg w-full max-w-[600px] max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <h2 id="feedback-dialog-title" className="text-xl font-bold text-foreground">Feedback</h2>
            <p className="text-muted text-sm mt-1">Hinweise, Fragen oder Fehler?</p>
          </div>
          <Button
            variant="transparent"
            size="sm"
            onClick={onClose}
            aria-label="Schließen"
            className="p-1.5 -mr-1.5 mt-0.5"
          >
            <i className="sap-icon sap-icon-decline text-[20px]" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <FeedbackForm
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  )
}
