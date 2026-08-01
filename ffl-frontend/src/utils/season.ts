export type SeasonPhase = 'Hinrunde' | 'Rückrunde'

export const DEFAULT_START_ROUND_RUECKRUNDE = 18

export function deriveSeasonPhase(
  currentMatchday?: number | null,
  startRoundRueckrunde?: number | null,
): SeasonPhase | null {
  if (currentMatchday == null || currentMatchday <= 0) return null
  const threshold = startRoundRueckrunde ?? DEFAULT_START_ROUND_RUECKRUNDE
  return currentMatchday >= threshold ? 'Rückrunde' : 'Hinrunde'
}
