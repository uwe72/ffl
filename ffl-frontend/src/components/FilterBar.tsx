import { useState, useRef, useEffect } from 'react'

export interface FilterConfig {
  key: string
  label: string
  options: { value: string; label: string }[]
}

export interface ActiveFilter {
  key: string
  value: string
  label: string
}

interface FilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterConfig[]
  filterValues?: Record<string, string>
  onFilterChange?: (key: string, value: string) => void
  activeFilters?: ActiveFilter[]
  onRemoveFilter?: (key: string) => void
  onReset?: () => void
  onGo?: () => void
  hasFilters?: boolean
}

function FilterDropdown({ config, value, onChange }: {
  config: FilterConfig
  value: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = config.options.find(o => o.value === value)

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-36 px-2.5 py-1.5 rounded bg-elevated border border-border text-foreground text-xs flex items-center justify-between gap-1.5 focus:outline-none focus:border-accent hover:border-border-hover transition-colors"
      >
        <span className="truncate">{selectedOption?.label || config.label}</span>
        <span className="text-subtle text-[10px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-surface border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          <button
            onClick={() => { onChange(''); setIsOpen(false) }}
            className={`w-full px-2.5 py-1.5 text-left text-xs hover:bg-elevated transition-colors ${!value ? 'bg-elevated text-primary' : 'text-muted'}`}
          >
            Alle
          </button>
          {config.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
              className={`w-full px-2.5 py-1.5 text-left text-xs hover:bg-elevated transition-colors ${value === opt.value ? 'bg-elevated text-primary' : 'text-foreground'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Suchen...',
  filters = [],
  filterValues = {},
  onFilterChange,
  activeFilters = [],
  onRemoveFilter,
  onReset,
  onGo,
  hasFilters = false,
}: FilterBarProps) {
  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-6 py-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-[260px]">
          <i className="sap-icon sap-icon-search absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-subtle" />
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && onGo) onGo() }}
            placeholder={searchPlaceholder}
            className="input-field pl-8 pr-3 py-1.5 text-xs w-full"
          />
        </div>

        {filters.map(config => (
          <FilterDropdown
            key={config.key}
            config={config}
            value={filterValues[config.key] || ''}
            onChange={value => onFilterChange?.(config.key, value)}
          />
        ))}

        {onGo && (
          <button
            onClick={onGo}
            className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-button-primary-hover transition-colors"
          >
            Suchen
          </button>
        )}

        {hasFilters && onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-subtle hover:text-danger transition-colors"
          >
            <i className="sap-icon sap-icon-decline text-sm" />
            <span>Zurücksetzen</span>
          </button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5 px-6 pb-2.5 flex-wrap">
          {activeFilters.map(af => (
            <span
              key={af.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
            >
              {af.label}
              <button
                onClick={() => onRemoveFilter?.(af.key)}
                className="hover:text-danger transition-colors"
              >
                <i className="sap-icon sap-icon-decline text-xs" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
