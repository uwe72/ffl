import { useNavigate } from 'react-router-dom'
import FeedbackForm from '../components/FeedbackForm'

export default function Feedback() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <img
        src="/background2627.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="img-overlay" />

      <div className="relative bg-surface/70 backdrop-blur-md border border-border rounded-card w-full max-w-[600px] max-h-[90vh] flex flex-col shadow-2xl ffl-login-enter">
        <div className="flex flex-col items-center text-center gap-1 px-6 pt-8 pb-2">
          <h2 className="text-2xl font-bold text-foreground leading-tight">Feedback</h2>
          <p className="text-muted text-sm">Hinweise, Fragen oder Fehler?</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <FeedbackForm
            onSuccess={() => navigate('/')}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  )
}
