const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const millionsFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  return currencyFormatter.format(value)
}

export function formatMillions(value: number | null | undefined): string {
  if (value == null) return '-'
  return `${millionsFormatter.format(value / 1_000_000)} Mio. €`
}

const millionsShortFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatMillionsShort(value: number | null | undefined): string {
  if (value == null) return '-'
  return `${millionsShortFormatter.format(value / 1_000_000)}M`
}

export function formatPoints(value: number | null | undefined): string {
  if (value == null) return '-'
  return integerFormatter.format(Math.round(value))
}
