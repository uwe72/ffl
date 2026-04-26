import { Card } from '@heroui/react'
import FeedbackForm from '../components/FeedbackForm'

export default function Feedback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1419] py-12 px-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/hintergrundbild.png')" }}>
      <Card className="max-w-2xl w-full p-8 bg-[#1a2028]/80 backdrop-blur-md border border-[#2d3748]/50 shadow-xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-[#f5f5f5]">Feedback</h2>
          <p className="text-[#a0aec0] mt-2 text-sm">Hinweise, Fragen oder Fehler?</p>
        </div>
        <FeedbackForm />
      </Card>
    </div>
  )
}
