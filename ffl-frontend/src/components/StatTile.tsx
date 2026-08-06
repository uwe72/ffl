import type { ReactNode } from 'react'

type StatTileTone = 'default' | 'warning' | 'danger'

interface StatTileProps {
  label: string
  value?: string
  tone?: StatTileTone
  state?: 'default' | 'loading' | 'empty' | 'error'
  icon?: ReactNode
}

const toneValueClass: Record<StatTileTone, string> = {
  default: 'text-foreground',
  warning: 'text-warning',
  danger: 'text-danger',
}

export default function StatTile({
  label,
  value,
  tone = 'default',
  state = 'default',
  icon,
}: StatTileProps) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle">
        {label}
      </p>
      {state === 'loading' ? (
        <div className="mt-1 h-8 w-20 rounded-control bg-elevated animate-pulse motion-reduce:animate-none" />
      ) : state === 'empty' ? (
        <p className="mt-1 text-2xl font-semibold tabular-nums text-muted">&mdash;</p>
      ) : state === 'error' ? (
        <p className="mt-1 inline-flex items-center gap-1 text-2xl font-semibold tabular-nums text-danger">
          <i className="sap-icon sap-icon-alert text-base" />
          <span className="text-base font-medium">Fehler</span>
        </p>
      ) : (
        <p
          className={`mt-1 inline-flex items-center gap-1 text-2xl font-semibold tabular-nums ${toneValueClass[tone]}`}
        >
          {icon}
          {value}
        </p>
      )}
    </div>
  )
}
