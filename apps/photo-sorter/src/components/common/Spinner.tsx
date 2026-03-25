import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'
import type { HTMLAttributes } from 'react'

const spinnerVariants = cva('animate-spin text-accent', {
  variants: {
    size: {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
    },
  },
  defaultVariants: { size: 'md' },
})

export interface SpinnerProps
  extends HTMLAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

export function Spinner({ size, label = 'Loading', className, ...props }: SpinnerProps) {
  return (
    <Loader2
      className={clsx(spinnerVariants({ size }), className)}
      aria-label={label}
      role="status"
      {...props}
    />
  )
}
