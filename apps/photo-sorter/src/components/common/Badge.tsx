import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-white/10 text-white',
        success: 'bg-accent/15 text-accent',
        warning: 'bg-yellow-500/15 text-yellow-400',
        info: 'bg-blue-500/15 text-blue-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ variant, className, ...props }: BadgeProps) {
  return <span className={clsx(badgeVariants({ variant }), className)} {...props} />
}
