import { useState } from 'react'
import { Button, Alert, TextField, Label, Input } from '@heroui/react'
import axios from 'axios'
import api from '../api/client'

interface Props {
  initialName?: string
  initialEmail?: string
  onSuccess?: () => void
}

export default function FeedbackForm({ initialName = '', initialEmail = '', onSuccess }: Props) {
  const [subject, setSubject] = useState('')
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
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
      setSuccess(true)
      setSubject('')
      setMessage('')
      onSuccess?.()
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

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {success && (
        <Alert status="success">
          <Alert.Content>
            <Alert.Description>Vielen Dank! Dein Feedback wurde versendet.</Alert.Description>
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
      <Button
        type="submit"
        variant="primary"
        className="w-full bg-[#c9a66b] text-[#0f1419] hover:bg-[#d4b77a]"
        isDisabled={isLoading}
      >
        {isLoading ? 'Wird versendet …' : 'Feedback senden'}
      </Button>
    </form>
  )
}
