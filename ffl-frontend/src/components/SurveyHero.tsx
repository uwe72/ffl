import type { ReactNode } from 'react'

export default function SurveyHero({ title, subtitle, children }: {
  title: string
  subtitle?: string | null
  children?: ReactNode
}) {
  return (
    <div className="relative h-[140px] md:h-[180px] rounded-card overflow-hidden mb-6 border border-border">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: 'url(/umfrage.png)',
          backgroundPosition: 'center 10%',
          filter: 'brightness(0.65) contrast(1.05)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgba(10,14,20,0.65) 0%, rgba(10,14,20,0.35) 60%, rgba(10,14,20,0.15) 100%)' }}
      />
      <div className="relative h-full flex items-center justify-between gap-4 px-6 md:px-8">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-on-dark leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-on-dark-muted mt-1 line-clamp-2 whitespace-pre-wrap">{subtitle}</p>
          )}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  )
}
