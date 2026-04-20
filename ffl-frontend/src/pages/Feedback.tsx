import { useEffect, useState } from 'react'
import { Card } from '@heroui/react'
import FeedbackForm from '../components/FeedbackForm'
import { useAuth } from '../context/AuthContext'

export default function Feedback() {
  const { isAuthenticated } = useAuth()
  const [initialName, setInitialName] = useState('')
  const [initialEmail, setInitialEmail] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setReady(true)
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setReady(true)
      return
    }

    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
          const name = fullName ? `${fullName} (${data.login})` : data.login || ''
          setInitialName(name)
          setInitialEmail(data.email || '')
        }
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [isAuthenticated])

  return (
    <div className="flex items-center justify-center py-8 px-4">
      <Card className="max-w-2xl w-full p-8 bg-[#1a2028] border border-[#2d3748]">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-[#f5f5f5]">Feedback</h2>
          <p className="text-[#a0aec0] mt-2 text-sm">Hinweise, Fragen oder Fehler?</p>
        </div>
        {ready && <FeedbackForm initialName={initialName} initialEmail={initialEmail} />}
      </Card>
    </div>
  )
}
