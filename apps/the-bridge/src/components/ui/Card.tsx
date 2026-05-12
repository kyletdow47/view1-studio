import { cn } from '@/lib/cn'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  bright?: boolean
}

export function Card({ className, bright, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'glass-card p-4',
        bright && 'glass-card-bright',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
