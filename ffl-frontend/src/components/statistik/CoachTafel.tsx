import { useMemo, useRef } from 'react'
import { useAvatar, useUploadAvatar } from '../../hooks/useAvatar'
import type { Manager } from '../../types'

interface CoachTafelProps {
  manager: Manager
  editable?: boolean
}

export default function CoachTafel({ manager, editable = false }: CoachTafelProps) {
  const { data: avatarUrl } = useAvatar(manager.userId ?? null)
  const uploadAvatar = useUploadAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleAvatarClick = () => {
    if (editable) fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !manager.userId) return
    try {
      await uploadAvatar.mutateAsync({ file, userId: manager.userId })
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="ffl-board ffl-board--coach">
      <div className="ffl-board__label">Manager</div>
      <div className="coach">
        {editable ? (
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={uploadAvatar.isPending}
            className="coach__plate coach__plate--photo coach__plate--editable"
            aria-label="Profilbild ändern"
            title="Profilbild ändern"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} />
            ) : (
              <span className="coach__upload-hint">
                <span className="coach__initials">{initials}</span>
                <span className="coach__upload-hint-text">Gerne hier Profilbild hochladen</span>
              </span>
            )}
            {avatarUrl && (
              <span className="coach__edit">
                {uploadAvatar.isPending ? (
                  <span className="coach__edit-spinner" />
                ) : (
                  <i className="sap-icon sap-icon-camera" />
                )}
              </span>
            )}
          </button>
        ) : avatarUrl ? (
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />
    </div>
  )
}
