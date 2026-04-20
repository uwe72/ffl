import { Card, Button } from '@heroui/react'
import FeedbackForm from './FeedbackForm'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackDialog({ isOpen, onClose }: Props) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card
        className="p-6 bg-[#1a2028] border border-[#2d3748] w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-[#f5f5f5]">Feedback</h2>
            <p className="text-[#a0aec0] text-sm mt-1">Hinweise, Fragen oder Fehler?</p>
          </div>
          <Button size="sm" variant="secondary" onPress={onClose} className="h-7 px-3 text-xs">
            Schließen
          </Button>
        </div>
        <FeedbackForm 
          onSuccess={onClose}
          onCancel={onClose}
        />
      </Card>
    </div>
  )
}
