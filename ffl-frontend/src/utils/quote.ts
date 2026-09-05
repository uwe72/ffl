export function quoteBadgeClasses(quote: number): string {
  if (quote >= 67) return 'bg-success/15 text-success'
  if (quote >= 34) return 'bg-warning/15 text-warning'
  return 'bg-danger/15 text-danger'
}
