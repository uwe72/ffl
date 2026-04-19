import { useEffect, useState } from 'react'
import { Card } from '@heroui/react'
import FeedbackForm from '../components/FeedbackForm'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function Feedback() {
  const { isAuthenticated } = useAuth()
  const [initialName, setInitialName] = useState('')
  const [initialEmail, setInitialEmail] = useState('')
  const [ready, setReady] = useState(!isAuthenticated)

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated) {
      setReady(true)
      return
    }
    api.get('/auth/me')
      .then((res) => {
        if (cancelled) return
        const d = res.data || {}
        const full = [d.firstName, d.lastName].filter(Boolean).join(' ').trim() || d.login || ''
        setInitialName(full)
        setInitialEmail(d.email || '')
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
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
