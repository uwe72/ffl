import { useEffect, useRef, useCallback } from 'react'
import RulesContent from './RulesContent'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function RulesDialog({ isOpen, onClose }: Props) {
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
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
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
      className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6 overflow-hidden"
      role="presentation"
      onClick={onClose}
    >
      <img
        src="/background2627.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-overlay" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-dialog-title"
        className="relative bg-surface/70 backdrop-blur-md border border-border rounded-card w-full max-w-[720px] max-h-[90vh] flex flex-col shadow-2xl ffl-login-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
          <h2 id="rules-dialog-title" className="text-xl font-bold text-foreground leading-tight pr-8">
            Fantasie Fußball Liga: das Spiel in Kürze
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="shrink-0 -mr-2 -mt-1 p-2 text-subtle hover:text-foreground rounded-control transition-colors focus:outline-none focus:ring-2 focus:ring-accent-ring"
          >
            <i className="sap-icon sap-icon-decline text-[20px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <RulesContent />
        </div>
      </div>
    </div>
  )
}
