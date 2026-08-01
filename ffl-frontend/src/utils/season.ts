import type { SeasonState } from '../types'

export type SeasonPhaseLabel = 'Vor Saison' | 'Hinrunde' | 'Rückrunde'

export const DEFAULT_START_ROUND_RUECKRUNDE = 18

export function seasonStateLabel(state?: SeasonState | null): SeasonPhaseLabel | null {
  switch (state) {
    case 'BEFORE_SEASON':
      return 'Vor Saison'
    case 'RUNNING_HINRUNDE':
      return 'Hinrunde'
    case 'RUNNING_RUECKRUNDE':
      return 'Rückrunde'
    default:
      return null
  }
}
