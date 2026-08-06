function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function getChartColors() {
  return {
    accent: cssVar('--color-accent', '#1d4ed8'),
    accentLight: cssVar('--color-accent-light', '#60a5fa'),
    axis: cssVar('--color-muted', '#6b6b6b'),
    grid: cssVar('--color-border-neutral', '#dcdcdc'),
    success: cssVar('--color-success', '#15803d'),
    warning: cssVar('--color-warning', '#b7791f'),
    danger: cssVar('--color-danger', '#b91c1c'),
  }
}

export const CHART_SERIES_PALETTE = [
  '#1d4ed8',
  '#60a5fa',
  '#172554',
  '#0ea5e9',
  '#2563eb',
  '#1e40af',
  '#38bdf8',
  '#3b82f6',
  '#0284c7',
  '#93c5fd',
]
