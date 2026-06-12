import FeedbackForm from '../components/FeedbackForm'

export default function Feedback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/background.png')" }}>
      <div className="max-w-2xl w-full p-8 bg-surface/80 backdrop-blur-md border border-border/50 shadow-xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">Feedback</h2>
          <p className="text-muted mt-2 text-sm">Hinweise, Fragen oder Fehler?</p>
        </div>
        <FeedbackForm />
      </div>
    </div>
  )
}
