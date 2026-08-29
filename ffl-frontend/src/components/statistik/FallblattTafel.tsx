import type { Aufstellung } from '../../types/dashboard'

const DIGITS = 3

function pad(value: number | null | undefined, size: number): string[] {
  if (value == null) return Array(size).fill('0')
  return String(Math.max(0, Math.round(value))).padStart(size, '0').split('')
}

function Platten({ value, digits }: { value: number | null | undefined; digits: string[] }) {
  const off = value == null
  return (
    <>
      {digits.map((d, i) => (
        <span
          key={i}
          className={`ffl-board__plate${off ? ' ffl-board__plate--off' : ''}`}
        >
          {d}
        </span>
      ))}
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
            <Platten value={punkte} digits={pad(punkte, DIGITS)} />
          </div>
          <div className="ffl-board__unit">Punkte</div>
        </div>
        <div>
          <div className="ffl-board__digits ffl-board__digits--secondary">
            <Platten value={platz} digits={pad(platz, DIGITS)} />
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
