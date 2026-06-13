interface BadgeProps {
  children: React.ReactNode
  variant?: 'accent' | 'success' | 'danger' | 'warning' | 'muted'
}

const variantClasses: Record<string, string> = {
  accent: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
  warning: 'bg-warning/15 text-warning',
  muted: 'bg-elevated text-muted',
}

export default function Badge({ children, variant = 'accent' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}
