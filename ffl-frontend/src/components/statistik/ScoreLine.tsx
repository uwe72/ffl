function DeltaBadge({ value }: { value: number | null }) {
  if (value == null || value === 0) return null
  return (
    <span className={`font-semibold tabular-nums ${value > 0 ? 'text-success' : 'text-danger'}`}>
      ({value > 0 ? `+${value}` : `\u2212${Math.abs(value)}`})
    </span>
  )
}

export default function ScoreLine({
  position,
  positionVorher,
  punkte,
  punkteVorher,
  einsatzquote,
}: {
  position: number | null
  positionVorher: number | null
  punkte: number | null
  punkteVorher: number | null
  einsatzquote?: number | null
}) {
  const posDelta = position != null && positionVorher != null ? positionVorher - position : null
  const ptsDelta = punkte != null && punkteVorher != null ? punkte - punkteVorher : null
  return (
    <div className="flex flex-wrap items-center gap-x-1.5">
      <span className="text-foreground">Platz {position ?? '-'}<DeltaBadge value={posDelta} /></span>
      <span className="text-muted">·</span>
      <span className="text-foreground">Punkte: {punkte != null ? Math.round(punkte) : '-'}<DeltaBadge value={ptsDelta} /></span>
      {einsatzquote != null && (
        <>
          <span className="text-muted">·</span>
          <span className="text-foreground">Einsatzquote: {einsatzquote} %</span>
        </>
      )}
    </div>
  )
}
