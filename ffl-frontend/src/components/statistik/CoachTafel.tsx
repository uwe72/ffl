import { useMemo } from 'react'
import { useAvatar } from '../../hooks/useAvatar'
import type { Manager } from '../../types'

export default function CoachTafel({ manager }: { manager: Manager }) {
  const { data: avatarUrl } = useAvatar(manager.userId ?? null)

  const fullName = `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim() || manager.name || ''

  const initials = useMemo(() => {
    const first = manager.firstName?.trim()?.[0] ?? ''
    const last = manager.lastName?.trim()?.[0] ?? ''
    const result = (first + last).toUpperCase().slice(0, 2)
    if (result) return result
    const name = manager.name?.trim()
    if (name) return name.charAt(0).toUpperCase()
    return '?'
  }, [manager])

  const slogan = manager.description?.trim() || ''

  return (
    <div className="ffl-board ffl-board--coach">
      <div className="ffl-board__label">Manager</div>
      <div className="coach">
        {avatarUrl ? (
          <span className="coach__plate coach__plate--photo">
            <img src={avatarUrl} alt={fullName} />
          </span>
        ) : (
          <span className="coach__plate">
            <span className="coach__initials">{initials}</span>
          </span>
        )}
        {slogan && <span className="coach__tip">{slogan}</span>}
      </div>
    </div>
  )
}
