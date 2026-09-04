import { useState, useEffect } from 'react'
import Button from './Button'

interface DocumentDescriptionDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  submitLabel: string
  initialDescription: string
  isSaving: boolean
  onConfirm: (description: string) => void
}

export default function DocumentDescriptionDialog({
  isOpen,
  onClose,
  title,
  submitLabel,
  initialDescription,
  isSaving,
  onConfirm,
}: DocumentDescriptionDialogProps) {
  const [description, setDescription] = useState(initialDescription)

  useEffect(() => {
    if (isOpen) {
      setDescription(initialDescription)
    }
  }, [isOpen, initialDescription])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={() => { if (!isSaving) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-description-dialog-title"
        className="bg-surface border border-border rounded-card shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="document-description-dialog-title" className="text-lg font-bold text-foreground">
          {title}
        </h2>
        <div className="flex items-baseline justify-between mt-4 mb-1">
          <label className="block text-sm text-muted">
            Beschreibung <span className="text-subtle">(optional)</span>
          </label>
          <span className="text-xs text-subtle tabular-nums">{description.length}/80</span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 80))}
          rows={4}
          maxLength={80}
          placeholder="Kurze Beschreibung des Dokuments …"
          autoFocus
          className="input-field control w-full px-3 py-2 rounded-control text-sm resize-y"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="input" onClick={onClose} disabled={isSaving}>
            Abbrechen
          </Button>
          <Button
            variant="emphasized"
            size="input"
            onClick={() => onConfirm(description)}
            disabled={isSaving}
          >
            {isSaving ? 'Wird gespeichert …' : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
