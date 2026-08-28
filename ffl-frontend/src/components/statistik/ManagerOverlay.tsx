import { useMemo } from 'react'
import { useAvatar } from '../../hooks/useAvatar'
import type { Manager } from '../../types'

export default function ManagerOverlay({ manager }: { manager: Manager }) {
  const { data: avatarUrl } = useAvatar(manager.userId ?? null)

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
    <div className="flex flex-col items-center gap-1.5 pointer-events-none">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={manager.name ?? 'Manager'}
          className="rounded-full object-cover border border-on-dark/30"
          style={{ width: 40, height: 40 }}
        />
      ) : (
        <div
          className="rounded-full bg-on-dark flex items-center justify-center border border-on-dark-muted/40"
          style={{ width: 40, height: 40 }}
        >
          <span className="text-sm font-bold text-foreground leading-none">{initials}</span>
        </div>
      )}
      {manager.description?.trim() && (
        <div className="text-[11px] font-medium text-on-dark-muted italic leading-tight text-center max-w-[140px]">
          „{manager.description.trim()}“
        </div>
      )}
    </div>
  )
}
