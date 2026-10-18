import type { SurveyStatus } from '../types'

export const SURVEY_STATUS_LABEL: Record<SurveyStatus, string> = {
  ANGELEGT: 'Angelegt',
  GESTARTET: 'Gestartet',
  BEENDET: 'Beendet',
}

export function surveyStatusClass(status: SurveyStatus): string {
  if (status === 'GESTARTET') return 'text-success bg-success-bg'
  return 'text-muted bg-elevated'
}
