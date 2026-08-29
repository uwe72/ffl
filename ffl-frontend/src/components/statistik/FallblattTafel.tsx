import type { Aufstellung } from '../../types/dashboard'

const DIGITS = 3

function pad(value: number | null | undefined, size: number): string[] {
  if (value == null) return Array(size).fill('')
  return String(Math.max(0, Math.round(value))).padStart(size, '0').split('')
}

function Platten({ value, digits }: { value: number | null | undefined; digits: string[] }) {
  const off = value == null
  return (
    <>
      {digits.map((d, i) => (
        <span key={i} className={`ffl-board__plate${off ? ' ffl-board__plate--off' : ''}`}>
          {d}
        </span>
      ))}
    </>
  )
}

function Chip({ current, previous }: { current: number | null | undefined; previous: number | null | undefined }) {
  if (current == null || previous == null) return null
  const delta = previous - current
  let className = 'ffl-board__chip ffl-board__chip--even'
  let text = '±0'
  if (delta > 0) {
    className = 'ffl-board__chip ffl-board__chip--up'
    text = `+${delta}`
  } else if (delta < 0) {
    className = 'ffl-board__chip ffl-board__chip--down'
    text = `\u2212${Math.abs(delta)}`
  }
  return <span className={className}>{text}</span>
}

interface BlockProps {
  label: string
  platz: number | null
  punkte: number | null
  chipPrevious?: number | null
  showChip?: boolean
}

function Block({ label, platz, punkte, chipPrevious, showChip = false }: BlockProps) {
  return (
    <div className="ffl-board__block">
      <div className="ffl-board__label">{label}</div>
      <div className="ffl-board__row">
        <div>
          <div className="ffl-board__digits">
            <Platten value={platz} digits={pad(platz, DIGITS)} />
            {showChip && <Chip current={platz} previous={chipPrevious} />}
          </div>
          <div className="ffl-board__unit">Platz</div>
        </div>
        <div>
          <div className="ffl-board__digits">
            <Platten value={punkte} digits={pad(punkte, DIGITS)} />
          </div>
          <div className="ffl-board__unit">Punkte</div>
        </div>
      </div>
    </div>
  )
}

export default function FallblattTafel({ aufstellung }: { aufstellung: Aufstellung }) {
  const {
    spieltag,
    positionGesamt,
    punkteGesamt,
    positionSpieltag,
    punkteSpieltag,
    positionGesamtVorher,
  } = aufstellung

  return (
    <div className="ffl-board">
      <Block label="Gesamt" platz={positionGesamt} punkte={punkteGesamt} chipPrevious={positionGesamtVorher} showChip />
      <div className="ffl-board__sep" />
      <Block label={`Spieltag ${spieltag}`} platz={positionSpieltag} punkte={punkteSpieltag} />
    </div>
  )
}
