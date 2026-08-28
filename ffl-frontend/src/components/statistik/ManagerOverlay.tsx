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
    <div className="flex flex-col items-center gap-1.5" title={manager.description?.trim() || undefined}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={manager.name ?? 'Manager'}
          className="rounded-full object-cover border border-on-dark/30"
          style={{ width: 120, height: 120 }}
        />
      ) : (
        <div
          className="rounded-full bg-on-dark flex items-center justify-center border border-on-dark-muted/40"
          style={{ width: 120, height: 120 }}
        >
          <span className="text-4xl font-bold text-foreground leading-none">{initials}</span>
        </div>
      )}
    </div>
  )
}
