import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered'
}

function CardRoot({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-surface',
        variant === 'bordered' && 'border border-view1-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-6 py-4 border-b border-view1-border', className)} {...props}>
      {children}
    </div>
  )
}

function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-6 py-4 border-t border-view1-border', className)} {...props}>
      {children}
    </div>
  )
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
})
