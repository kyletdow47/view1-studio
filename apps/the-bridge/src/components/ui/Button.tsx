import { cn } from '@/lib/cn'

type Variant = 'primary' | 'ghost' | 'danger'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'rainbow-bright-fill text-white font-semibold shadow-[0_4px_20px_rgba(236,72,153,0.35)] hover:brightness-110 active:brightness-95',
  ghost:
    'bg-white/8 text-white/90 hover:bg-white/12 border border-white/10',
  danger:
    'bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25',
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'tap-target px-4 rounded-md text-sm transition-all',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
