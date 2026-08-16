import Button from './Button'

interface InfoDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  icon?: string
  confirmLabel?: string
}

export default function InfoDialog({ isOpen, onClose, title, message, icon, confirmLabel = 'Verstanden' }: InfoDialogProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface border border-border rounded-card shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div className="shrink-0 w-10 h-10 rounded-full bg-accent-muted text-accent flex items-center justify-center">
              <i className={`sap-icon ${icon} text-[20px]`} />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted mt-2">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="emphasized">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
