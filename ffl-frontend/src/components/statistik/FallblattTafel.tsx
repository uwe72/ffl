import type { Aufstellung } from '../../types/dashboard'

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

interface BlockProps {
  label: string
  platz: number | null
  punkte: number | null
}

function Block({ label, platz, punkte }: BlockProps) {
  return (
    <div className="ffl-board__block">
      <div className="ffl-board__head">
        <div className="ffl-board__label">{label}</div>
      </div>
      <div className="ffl-board__row">
        <div>
          <div className="ffl-board__digits">
            <Platten digits={pad(punkte, DIGITS)} />
          </div>
          <div className="ffl-board__unit">Punkte</div>
        </div>
        <div>
          <div className="ffl-board__digits ffl-board__digits--secondary">
            <Platten digits={pad(platz, DIGITS)} markZeros />
          </div>
          <div className="ffl-board__unit">Platz</div>
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
    <div className="ffl-board ffl-board--score">
      <Badge current={positionGesamt} previous={positionGesamtVorher} />
      <Block label="Gesamt" platz={positionGesamt} punkte={punkteGesamt} />
      <div className="ffl-board__sep" />
      <Block label={spieltag > 0 ? `Spieltag ${spieltag}` : 'Spieltag'} platz={positionSpieltag} punkte={punkteSpieltag} />
    </div>
  )
}
