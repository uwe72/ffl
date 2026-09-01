import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'
import FeedbackForm from '../components/FeedbackForm'

export default function Feedback() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl">
      <BackButton to="/" className="mb-4" />
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card">
        <h2 className="text-xl font-semibold text-foreground">Feedback</h2>
        <p className="text-sm text-muted mt-1 mb-4">Hinweise, Fragen oder Fehler?</p>
        <FeedbackForm
          onSuccess={() => navigate('/')}
          onCancel={() => navigate(-1)}
        />
      </div>

      <div className="h-10" />
    </div>
  )
}
