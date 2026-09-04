function PositionDeltaBadge({ value }: { value: number | null }) {
  if (value == null || value === 0) return null
  return (
    <span className={`font-semibold tabular-nums ${value > 0 ? 'text-success' : 'text-danger'}`}>
      ({value > 0 ? `+${value}` : `\u2212${Math.abs(value)}`})
    </span>
  )
}

function PunkteDeltaBadge({ value }: { value: number | null }) {
  if (value == null) return null
  return (
    <span className={`font-semibold tabular-nums ${value > 0 ? 'text-success' : value < 0 ? 'text-danger' : 'text-foreground'}`}>
      ({value > 0 ? `+${value}` : value < 0 ? `\u2212${Math.abs(value)}` : '+0'})
    </span>
  )
}

export default function ScoreLine({
  position,
  positionVorher,
  punkteGesamt,
  punkteSpieltag,
  einsatzquote,
}: {
  position: number | null
  positionVorher: number | null
  punkteGesamt: number | null
  punkteSpieltag: number | null
  einsatzquote?: number | null
}) {
  const posDelta = position != null && positionVorher != null ? positionVorher - position : null
  return (
    <div className="flex flex-wrap items-center gap-x-1.5">
      <span className="text-foreground">Platz {position ?? '-'} <PositionDeltaBadge value={posDelta} /></span>
      <span className="text-muted">·</span>
      <span className="text-foreground">Punkte: {punkteGesamt ?? '-'} <PunkteDeltaBadge value={punkteSpieltag} /></span>
      {einsatzquote != null && (
        <>
          <span className="text-muted">·</span>
          <span className="text-foreground">Einsatzquote: {einsatzquote} %</span>
        </>
      )}
    </div>
  )
}
