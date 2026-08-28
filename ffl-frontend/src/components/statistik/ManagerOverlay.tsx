import { useMemo } from 'react'
import { useAvatar } from '../../hooks/useAvatar'
import type { Manager } from '../../types'

interface ManagerOverlayProps {
  manager: Manager
  teamname?: string | null
}

export default function ManagerOverlay({ manager, teamname }: ManagerOverlayProps) {
  const { data: avatarUrl } = useAvatar(manager.userId ?? null)

  const fullName = `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim() || manager.name || ''

  const initials = useMemo(() => {
    const first = manager.firstName?.trim()?.[0] ?? ''
    const last = manager.lastName?.trim()?.[0] ?? ''
    const name = manager.name?.trim() ?? ''
    const result = (first + last).toUpperCase()
    if (result) return result
    const login = manager.login?.trim()
    if (login) return login.charAt(0).toUpperCase()
    return name ? name.charAt(0).toUpperCase() : '?'
  }, [manager])

  return (
    <div
      className="relative flex items-center gap-3 bg-stat-card border border-border rounded-card p-3 pr-4 shadow-sm max-w-[220px]"
      title={manager.description?.trim() || undefined}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-card"
        style={{ backgroundColor: 'var(--color-goalkeeper)' }}
      />
      <div
        className="relative shrink-0 overflow-hidden rounded-[4px] bg-elevated border border-border flex items-center justify-center"
        style={{ width: 52, height: 52 }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-foreground leading-none">{initials}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground truncate leading-tight">{fullName}</div>
        <div className="text-xs text-muted leading-tight">Trainer</div>
        {teamname && <div className="text-xs text-muted leading-tight truncate">{teamname}</div>}
      </div>
    </div>
  )
}
