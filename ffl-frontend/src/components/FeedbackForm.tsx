import { useState } from 'react'
import axios from 'axios'
import api from '../api/client'
import { trackEvent } from '../hooks/useMatomo'

interface Props {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function FeedbackForm({ onSuccess, onCancel }: Props) {
  const [subject, setSubject] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)
    try {
      await api.post('/feedback/submit', { subject, name, email, message })
      trackEvent('feedback', 'submit', 'success')
      setSuccess(true)
      setSubject('')
      setMessage('')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError('Zu viele Anfragen. Bitte später erneut versuchen.')
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(String(err.response.data.error))
      } else {
        setError('Feedback konnte nicht versendet werden.')
      }
      trackEvent('feedback', 'submit', 'failure')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (onSuccess) {
      onSuccess()
    } else {
      window.close()
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      window.close()
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl text-green-400 mb-4">✓</div>
        <h3 className="text-2xl font-bold text-accent mb-2">Vielen Dank!</h3>
        <p className="text-muted">Dein Feedback wurde versendet.</p>
        <button
          className="mt-6 bg-primary text-background hover:bg-button-primary-hover px-4 py-2 rounded font-medium transition-colors"
          onClick={handleClose}
        >
          Fenster schließen
        </button>
      </div>
    )
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 mb-4 rounded bg-danger-bg border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm text-muted mb-1">Name *</label>
        <input
          required
          placeholder="Dein Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground placeholder-[#8899aa]"
        />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1">E-Mail *</label>
        <input
          type="email"
          required
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground placeholder-[#8899aa]"
        />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1">Betreff *</label>
        <input
          required
          placeholder="Worum geht's?"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground placeholder-[#8899aa]"
        />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1">Nachricht *</label>
        <textarea
          required
          rows={6}
          placeholder="Deine Nachricht …"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-elevated border border-border-hover text-foreground placeholder-[#8899aa] rounded-md px-3 py-2 focus:outline-none focus:border-accent"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          className="button-secondary flex-1 px-4 py-2 rounded transition-colors"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="flex-1 bg-primary text-background hover:bg-button-primary-hover px-4 py-2 rounded font-medium transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Wird versendet …' : 'Feedback senden'}
        </button>
      </div>
    </form>
  )
}
