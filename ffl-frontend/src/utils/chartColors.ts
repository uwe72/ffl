function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function getChartColors() {
  return {
    accent: cssVar('--ffl-accent', '#3f3a34'),
    accentLight: cssVar('--ffl-accent-light', '#6b6258'),
    axis: cssVar('--ffl-text-muted', '#57534e'),
    grid: cssVar('--ffl-border-subtle', '#e7e5e4'),
    success: cssVar('--ffl-success', '#15803d'),
    warning: cssVar('--ffl-warning', '#b7791f'),
    danger: cssVar('--ffl-danger', '#b91c1c'),
  }
}

export const CHART_SERIES_PALETTE = [
  '#3f3a34',
  '#6b6258',
  '#0f766e',
  '#4338ca',
  '#be123c',
  '#2d2a26',
  '#57534e',
  '#8b8278',
  '#0891b2',
  '#78716c',
]
