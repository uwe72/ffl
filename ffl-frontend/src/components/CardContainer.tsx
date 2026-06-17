import type { ReactNode } from 'react'

interface CardContainerProps {
  children: ReactNode
  className?: string
}

export default function CardContainer({ children, className = '' }: CardContainerProps) {
  return (
    <div className={`bg-surface border border-border rounded-lg shadow-2xl flex flex-col ${className}`}>
      {children}
    </div>
  )
}
