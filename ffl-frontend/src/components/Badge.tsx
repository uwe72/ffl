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
  accent: 'bg-primary/15 text-primary rounded-badge',
  success: 'bg-success/15 text-success rounded-badge',
  danger: 'bg-danger/15 text-danger rounded-badge',
  warning: 'bg-warning/15 text-warning rounded-badge',
  muted: 'bg-elevated text-muted rounded-badge',
  solid: 'bg-primary text-primary-foreground rounded-badge',
  goalkeeper: 'bg-goalkeeper-bg text-goalkeeper-text rounded-badge',
  defender: 'bg-defender-bg text-defender-text rounded-badge',
  midfield: 'bg-midfield-bg text-midfield-text rounded-badge',
  striker: 'bg-striker-bg text-striker-text rounded-badge',
}

export default function Badge({ children, variant = 'accent' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center justify-center h-6 px-2.5 text-xs font-medium leading-none ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}
