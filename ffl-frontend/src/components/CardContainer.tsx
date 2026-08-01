import type { ReactNode } from 'react'

interface CardContainerProps {
  children: ReactNode
  className?: string
  title?: ReactNode
  subtitle?: ReactNode
  headerRight?: ReactNode
}

export default function CardContainer({ children, className = '', title, subtitle, headerRight }: CardContainerProps) {
  const hasHeader = title != null || subtitle != null || headerRight != null
  return (
    <div className={`bg-card border border-border rounded-card shadow-sm flex flex-col ${className}`}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
          <div className="min-w-0">
            {title != null && (
              <h2 className="text-[16px] font-medium text-foreground">{title}</h2>
            )}
            {subtitle != null && (
              <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerRight != null && (
            <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
              {headerRight}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
