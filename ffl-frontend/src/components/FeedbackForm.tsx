import { useState } from 'react'
import axios from 'axios'
import api from '../api/client'
import { trackEvent } from '../hooks/useMatomo'
import Button from './Button'

interface Props {
  onSuccess?: () => void
  onCancel?: () => void
}

interface FieldErrors {
  subject?: string
  name?: string
  email?: string
  message?: string
}

export default function FeedbackForm({ onSuccess, onCancel }: Props) {
  const [subject, setSubject] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const validateField = (field: keyof FieldErrors, value: string) => {
    if (!value.trim()) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Dieses Feld ist erforderlich.' }))
      return false
    }
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Bitte eine gültige E-Mail-Adresse eingeben.' }))
      return false
    }
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
    return true
  }

  const handleBlur = (field: keyof FieldErrors, value: string) => {
    validateField(field, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const errors: FieldErrors = {}
    if (!subject.trim()) errors.subject = 'Dieses Feld ist erforderlich.'
    if (!name.trim()) errors.name = 'Dieses Feld ist erforderlich.'
    if (!email.trim()) errors.email = 'Dieses Feld ist erforderlich.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Bitte eine gültige E-Mail-Adresse eingeben.'
    if (!message.trim()) errors.message = 'Dieses Feld ist erforderlich.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)
    try {
      await api.post('/feedback/submit', { subject, name, email, message })
      trackEvent('feedback', 'submit', 'success')
      setSuccess(true)
      setSubject('')
      setName('')
      setEmail('')
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
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-3 p-4 bg-success-bg border border-success/30 rounded-lg mt-2">
        <i className="sap-icon sap-icon-complete text-[20px] text-success shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-success">Vielen Dank!</p>
          <p className="text-xs text-muted mt-0.5">Dein Feedback wurde versendet.</p>
        </div>
        <Button
          variant="transparent"
          size="sm"
          onClick={handleClose}
        >
          Schließen
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-4 mt-2" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-lg">
          <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-xs text-muted mb-1">
          Betreff <span className="text-primary">*</span>
        </label>
        <input
          required
          placeholder="Worum geht's?"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value)
            if (fieldErrors.subject) validateField('subject', e.target.value)
          }}
          onBlur={() => handleBlur('subject', subject)}
          className={`input-field w-full px-3 py-2 text-sm focus:outline-none ${fieldErrors.subject ? 'border-danger focus:border-danger' : ''}`}
        />
        {fieldErrors.subject && (
          <p className="text-xs text-danger mt-1">{fieldErrors.subject}</p>
        )}
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">
          Nachricht <span className="text-primary">*</span>
        </label>
        <textarea
          required
          rows={5}
          placeholder="Deine Nachricht …"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            if (fieldErrors.message) validateField('message', e.target.value)
          }}
          onBlur={() => handleBlur('message', message)}
          className={`input-field w-full px-3 py-2 text-sm focus:outline-none ${fieldErrors.message ? 'border-danger focus:border-danger' : ''}`}
        />
        {fieldErrors.message && (
          <p className="text-xs text-danger mt-1">{fieldErrors.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">
          Name <span className="text-primary">*</span>
        </label>
        <input
          required
          placeholder="Dein Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (fieldErrors.name) validateField('name', e.target.value)
          }}
          onBlur={() => handleBlur('name', name)}
          className={`input-field w-full px-3 py-2 text-sm focus:outline-none ${fieldErrors.name ? 'border-danger focus:border-danger' : ''}`}
        />
        {fieldErrors.name && (
          <p className="text-xs text-danger mt-1">{fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">
          E-Mail <span className="text-primary">*</span>
        </label>
        <input
          type="email"
          required
          placeholder="name@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (fieldErrors.email) validateField('email', e.target.value)
          }}
          onBlur={() => handleBlur('email', email)}
          className={`input-field w-full px-3 py-2 text-sm focus:outline-none ${fieldErrors.email ? 'border-danger focus:border-danger' : ''}`}
        />
        {fieldErrors.email && (
          <p className="text-xs text-danger mt-1">{fieldErrors.email}</p>
        )}
      </div>

      <div className="border-t border-border pt-4 flex gap-3 justify-end">
        <Button
          variant="transparent"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Abbrechen
        </Button>
        <Button
          variant="emphasized"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Wird versendet …' : 'Senden'}
        </Button>
      </div>
    </form>
  )
}
