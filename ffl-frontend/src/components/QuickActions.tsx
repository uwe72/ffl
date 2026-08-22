import { Link } from 'react-router-dom'

export interface QuickAction {
  icon: string
  label: string
  to: string
}

interface QuickActionsProps {
  items: QuickAction[]
}

export default function QuickActions({ items }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <Link
          key={item.to}
          to={item.to}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-control bg-surface border border-border-strong text-primary hover:bg-card-hover hover:border-border-hover transition-colors"
        >
          <i className={`${item.icon} text-base text-accent`} />
          {item.label}
        </Link>
      ))}
    </div>
  )
}
