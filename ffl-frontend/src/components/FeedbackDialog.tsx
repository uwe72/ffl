import FeedbackForm from './FeedbackForm'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackDialog({ isOpen, onClose }: Props) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="p-6 bg-surface border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Feedback</h2>
            <p className="text-muted text-sm mt-1">Hinweise, Fragen oder Fehler?</p>
          </div>
          <button className="button-secondary h-7 px-3 text-xs rounded transition-colors" onClick={onClose}>
            Schließen
          </button>
        </div>
        <FeedbackForm 
          onSuccess={onClose}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}
