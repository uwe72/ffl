interface StatToggleOption {
  value: string
  label: string
}

interface StatToggleProps {
  options: StatToggleOption[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}

export default function StatToggle({ options, value, onChange, ariaLabel }: StatToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-control border border-border-strong bg-elevated p-0.5"
    >
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`px-3 py-1 rounded-[3px] text-xs font-medium transition-colors cursor-pointer ${
              active
                ? 'bg-stat-accent text-white'
                : 'text-muted hover:text-foreground hover:bg-card-hover'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
