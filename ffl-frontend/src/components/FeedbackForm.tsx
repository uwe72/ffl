import { useState, useEffect } from 'react'
import { Button, Alert, TextField, Label, Input } from '@heroui/react'
import axios from 'axios'
import api from '../api/client'

interface Props {
  initialName?: string
  initialEmail?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function FeedbackForm({ initialName = '', initialEmail = '', onSuccess, onCancel }: Props) {
  const [subject, setSubject] = useState('')
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    setName(initialName)
    setEmail(initialEmail)
  }, [initialName, initialEmail])

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (success && countdown === 0) {
      onSuccess?.()
    }
  }, [success, countdown, onSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)
    try {
      await api.post('/feedback/submit', { subject, name, email, message })
      setSuccess(true)
      setSubject('')
      setMessage('')
      setCountdown(3)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError('Zu viele Anfragen. Bitte später erneut versuchen.')
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(String(err.response.data.error))
      } else {
        setError('Feedback konnte nicht versendet werden.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl text-green-400 mb-4">✓</div>
        <h3 className="text-2xl font-bold text-[#c9a66b] mb-2">Vielen Dank!</h3>
        <p className="text-[#a0aec0]">Dein Feedback wurde versendet.</p>
        <p className="text-[#6b7280] text-sm mt-4">
          Dialog schließt automatisch in {countdown} Sekunde{countdown !== 1 ? 'n' : ''}...
        </p>
      </div>
    )
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <TextField name="name" isRequired>
        <Label className="text-[#a0aec0]">Name</Label>
        <Input
          placeholder="Dein Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] placeholder-[#6b7280]"
        />
      </TextField>
      <TextField name="email" isRequired>
        <Label className="text-[#a0aec0]">E-Mail</Label>
        <Input
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] placeholder-[#6b7280]"
        />
      </TextField>
      <TextField name="subject" isRequired>
        <Label className="text-[#a0aec0]">Betreff</Label>
        <Input
          placeholder="Worum geht's?"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] placeholder-[#6b7280]"
        />
      </TextField>
      <div>
        <label className="block text-sm text-[#a0aec0] mb-1">Nachricht</label>
        <textarea
          required
          rows={6}
          placeholder="Deine Nachricht …"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-[#242d38] border border-[#3d4a5c] text-[#f5f5f5] placeholder-[#6b7280] rounded-md px-3 py-2 focus:outline-none focus:border-[#c9a66b]"
        />
      </div>
      <div className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onPress={onCancel}
            isDisabled={isLoading}
          >
            Abbrechen
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          className="flex-1 bg-[#c9a66b] text-[#0f1419] hover:bg-[#d4b77a]"
          isDisabled={isLoading}
        >
          {isLoading ? 'Wird versendet …' : 'Feedback senden'}
        </Button>
      </div>
    </form>
  )
}
