interface TabItem {
  key: string
  label: string
}

interface SegmentedTabsProps {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export default function SegmentedTabs({ items, active, onChange, className = '' }: SegmentedTabsProps) {
  return (
    <div
      role="group"
      className={`inline-flex w-full sm:w-auto rounded-control border border-border-strong bg-elevated p-0.5 ${className}`}
    >
      {items.map(item => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            aria-pressed={isActive}
            className={`flex-1 px-3 py-1.5 rounded-[3px] text-sm font-medium transition-colors cursor-pointer ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted hover:text-foreground hover:bg-card-hover'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
