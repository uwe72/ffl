import type { ReactNode } from 'react'

interface FormCardProps {
  children: ReactNode
  className?: string
}

export default function FormCard({ children, className = '' }: FormCardProps) {
  return (
    <div className={`p-6 bg-surface border border-border rounded-lg ${className}`}>
      {children}
    </div>
  )
}
