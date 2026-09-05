import { useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Aufstellung } from '../../types/dashboard'
import type { Manager } from '../../types'
import { useAvatar, useUploadAvatar } from '../../hooks/useAvatar'

const DIGITS = 3

function pad(value: number | null | undefined, size: number): string[] {
  if (value == null) return Array(size).fill('0')
  return String(Math.max(0, Math.round(value))).padStart(size, '0').split('')
}

function Platten({ digits, markZeros = false }: { digits: string[]; markZeros?: boolean }) {
  const firstNonZero = digits.findIndex(d => d !== '0')
  return (
    <>
      {digits.map((d, i) => {
        const isLeadingZero = markZeros && d === '0' && (firstNonZero === -1 || i < firstNonZero)
        return (
          <span key={i} className={`ffl-board__plate${isLeadingZero ? ' ffl-board__plate--zero' : ''}`}>
            {d}
          </span>
        )
      })}
    </>
  )
}

function Badge({ current, previous }: { current: number | null | undefined; previous: number | null | undefined }) {
  if (current == null || previous == null) return null
  const delta = previous - current
  if (delta === 0) return null
  const up = delta > 0
  const cls = up ? 'ffl-board__badge--up' : 'ffl-board__badge--down'
  const text = up ? `+${delta}` : `\u2212${Math.abs(delta)}`
  return (
    <span className={`ffl-board__badge ${cls}`}>
      <b>{text}</b>
      <span>Plätze</span>
    </span>
  )
}

function PunkteBadge({ punkte }: { punkte: number | null | undefined }) {
  if (punkte == null || punkte <= 0) return null
  return (
    <span className="ffl-board__badge ffl-board__badge--up ffl-board__badge--punkte">
      <b>+{punkte}</b>
      <span>Punkte</span>
    </span>
  )
}

function Col({ head, label, digits, secondary = false }: { head?: string; label?: string; digits: string[]; secondary?: boolean }) {
  return (
    <div className="ffl-board__col">
      {head != null ? <div className="ffl-board__colhead">{head}</div> : <div className="ffl-board__unit">{label}</div>}
      <div className={`ffl-board__digits${secondary ? ' ffl-board__digits--secondary' : ''}`}>
        <Platten digits={digits} markZeros />
      </div>
    </div>
  )
}

interface SectionProps {
  headLabel: string
  rightLabel?: string
  leftDigits: string[]
  rightDigits?: string[]
  leftSecondary?: boolean
  rightSecondary?: boolean
  children?: ReactNode
}

function Section({ headLabel, rightLabel, leftDigits, rightDigits, leftSecondary = false, rightSecondary = false, children }: SectionProps) {
  return (
    <div className="ffl-board__block">
      <div className="ffl-board__row">
        {children && <div className="ffl-board__picslot">{children}</div>}
        {rightDigits && <Col label={rightLabel} digits={rightDigits} secondary={rightSecondary} />}
        <Col head={headLabel} digits={leftDigits} secondary={leftSecondary} />
      </div>
    </div>
  )
}

function Avatar({ manager, editable = false }: { manager: Manager; editable?: boolean }) {
  const { data: avatarUrl } = useAvatar(manager.userId ?? null)
  const uploadAvatar = useUploadAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = useMemo(() => {
    const first = manager.firstName?.trim()?.[0] ?? ''
    const last = manager.lastName?.trim()?.[0] ?? ''
    const result = (first + last).toUpperCase().slice(0, 2)
    if (result) return result
    const name = manager.name?.trim()
    if (name) return name.charAt(0).toUpperCase()
    return '?'
  }, [manager])
  const fullName = `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim() || manager.name || ''
  const to = manager.id != null ? `/managers/${manager.id}` : undefined

  const inner = (
    <>
      {avatarUrl ? <img src={avatarUrl} alt={fullName} /> : <span className="ffl-board__pic--initials">{initials}</span>}
      {editable && (
        <span className="ffl-board__pic--edit">
          {uploadAvatar.isPending ? <span className="ffl-board__pic--spinner" /> : <i className="sap-icon sap-icon-camera" />}
        </span>
      )}
    </>
  )

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  if (editable) {
    return (
      <>
        <button
          type="button"
          className="ffl-board__pic ffl-board__pic--editable"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Profilbild ändern"
          title="Profilbild ändern"
        >
          {inner}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </>
    )
  }
  if (!to) return <span className="ffl-board__pic">{inner}</span>
  return (
    <Link to={to} className="ffl-board__pic" title={fullName}>
      {inner}
    </Link>
  )
}

export default function FallblattTafel({ aufstellung, manager, editable = false }: { aufstellung: Aufstellung; manager?: Manager; editable?: boolean }) {
  const { spieltag, positionGesamt, punkteGesamt, positionSpieltag, punkteSpieltag, positionGesamtVorher } = aufstellung
  const spieltagLabel = spieltag > 0 ? `Spieltag ${spieltag}` : 'Spieltag'

  return (
    <div className="ffl-board ffl-board--score">
      <Badge current={positionGesamt} previous={positionGesamtVorher} />
      <PunkteBadge punkte={punkteSpieltag} />
      <Section
        headLabel="Gesamtplatz"
        rightLabel={spieltagLabel}
        leftDigits={pad(positionGesamt, DIGITS)}
        rightDigits={pad(positionSpieltag, DIGITS)}
        leftSecondary
      />
      <div className="ffl-board__sep" />
      <Section
        headLabel="Gesamtpunkte"
        leftDigits={pad(punkteGesamt, DIGITS)}
        leftSecondary
      >
        {manager && <Avatar manager={manager} editable={editable} />}
      </Section>
    </div>
  )
}
