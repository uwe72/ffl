import { type ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'emphasized' | 'ghost' | 'transparent' | 'negative'
type ButtonSize = 'default' | 'compact' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  emphasized:
    'bg-primary text-primary-foreground hover:bg-button-primary-hover border border-transparent',
  ghost:
    'bg-transparent text-primary border border-primary hover:bg-accent-muted',
  transparent:
    'bg-transparent text-primary border border-transparent hover:bg-accent-muted',
  negative:
    'bg-transparent text-danger border border-transparent hover:bg-danger-bg',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'px-4 py-2 text-sm',
  compact: 'px-3 py-1.5 text-xs',
  sm: 'px-2 py-1 text-xs',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'emphasized', size = 'default', className = '', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent-ring focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
