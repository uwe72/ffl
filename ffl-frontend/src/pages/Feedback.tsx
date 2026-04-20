import { Card } from '@heroui/react'
import FeedbackForm from '../components/FeedbackForm'
import { useAuth } from '../context/AuthContext'

export default function Feedback() {
  const { user, isAuthenticated } = useAuth()
  const initialName = isAuthenticated && user ? user.login : ''
  const initialEmail = ''

  return (
    <div className="flex items-center justify-center py-8 px-4">
      <Card className="max-w-2xl w-full p-8 bg-[#1a2028] border border-[#2d3748]">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-[#f5f5f5]">Feedback</h2>
          <p className="text-[#a0aec0] mt-2 text-sm">Hinweise, Fragen oder Fehler?</p>
        </div>
        <FeedbackForm initialName={initialName} initialEmail={initialEmail} />
      </Card>
    </div>
  )
}
