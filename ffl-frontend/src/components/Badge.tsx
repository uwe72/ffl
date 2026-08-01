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
  accent: 'bg-primary/15 text-primary rounded-full',
  success: 'bg-success/15 text-success rounded-full',
  danger: 'bg-danger/15 text-danger rounded-full',
  warning: 'bg-warning/15 text-warning rounded-full',
  muted: 'bg-elevated text-muted rounded-full',
  solid: 'bg-primary text-primary-foreground rounded-full',
  goalkeeper: 'bg-goalkeeper-bg text-goalkeeper rounded-[3px]',
  defender: 'bg-defender-bg text-defender rounded-[3px]',
  midfield: 'bg-midfield-bg text-midfield rounded-[3px]',
  striker: 'bg-striker-bg text-striker rounded-[3px]',
}

export default function Badge({ children, variant = 'accent' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center justify-center h-6 px-2.5 text-xs font-medium leading-none ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}
