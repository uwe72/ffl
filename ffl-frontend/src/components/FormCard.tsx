import type { ReactNode } from 'react'

interface FormCardProps {
  children: ReactNode
  className?: string
}

export default function FormCard({ children, className = '' }: FormCardProps) {
  return (
    <div className={`p-6 bg-card border border-border rounded-card shadow-sm ${className}`}>
      {children}
    </div>
  )
}
