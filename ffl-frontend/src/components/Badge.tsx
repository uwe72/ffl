interface BadgeProps {
  children: React.ReactNode
  variant?:
    | 'accent'
    | 'success'
    | 'danger'
    | 'warning'
    | 'muted'
    | 'solid'
    | 'goalkeeper'
    | 'defender'
    | 'midfield'
    | 'striker'
}

const variantClasses: Record<string, string> = {
  accent: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
  warning: 'bg-warning/15 text-warning',
  muted: 'bg-elevated text-muted',
  solid: 'bg-primary text-primary-foreground',
  goalkeeper: 'bg-goalkeeper-bg text-goalkeeper',
  defender: 'bg-defender-bg text-defender',
  midfield: 'bg-midfield-bg text-midfield',
  striker: 'bg-striker-bg text-striker',
}

export default function Badge({ children, variant = 'accent' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center justify-center h-6 rounded-full px-2.5 text-xs font-medium leading-none ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}
