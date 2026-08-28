import { useState, useEffect, useRef, useMemo } from 'react'
import type { Manager } from '../types'

export default function ManagerSelect({
  managers,
  value,
  onChange,
}: {
  managers: Manager[]
  value: number | null
  onChange: (id: number) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const sortedManagers = useMemo(() => {
    return [...managers].sort(
      (a, b) => (a.positionTotal ?? 999) - (b.positionTotal ?? 999)
    )
  }, [managers])

  const filteredManagers = useMemo(() => {
    if (!search.trim()) return sortedManagers
    const term = search.toLowerCase()
    return sortedManagers.filter(
      m =>
        m.shortName?.toLowerCase().includes(term) ||
        m.firstName?.toLowerCase().includes(term) ||
        m.lastName?.toLowerCase().includes(term)
    )
  }, [sortedManagers, search])

  const selectedManager = useMemo(
    () => (value ? managers.find(m => m.id === value) : null),
    [value, managers]
  )

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (id: number) => {
    onChange(id)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative min-w-[200px]">
      <button
        type="button"
        onClick={() => {
          setIsOpen(o => !o)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className="input-field control w-full px-3 py-1.5 rounded-control text-xs flex items-center justify-between gap-2 focus:outline-none"
      >
        <span className="truncate text-foreground">
          {selectedManager
            ? selectedManager.shortName || `${selectedManager.firstName ?? ''} ${selectedManager.lastName ?? ''}`.trim()
            : 'Manager wählen…'}
        </span>
        <i className={`sap-icon sap-icon-slim-arrow-down text-[12px] text-subtle transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-[300px] bg-surface border border-border rounded-card shadow-xl max-h-[320px] flex flex-col">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <i className="sap-icon sap-icon-search absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-subtle" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Manager suchen…"
                className="input-field control w-full pl-8 pr-2 py-1.5 rounded-badge text-xs focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredManagers.length === 0 ? (
              <div className="px-3 py-4 text-center text-subtle text-xs">Keine Manager gefunden</div>
            ) : (
              filteredManagers.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m.id)}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-elevated transition-colors ${
                    m.id === value ? 'bg-accent-muted' : ''
                  }`}
                >
                  <span className="text-foreground truncate">
                    {`${m.firstName || ''} ${m.lastName || ''}`.trim() || m.shortName || '-'}
                    {m.login ? ` (${m.login})` : ''}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
