import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ src, alt, name, size = 'md', className, ...props }: AvatarProps) {
  const initials = name ? getInitials(name) : '?'
  const resolvedAlt = alt ?? name ?? 'Avatar'

  return (
    <div
      className={clsx(
        'relative inline-flex items-center justify-center rounded-full bg-accent/20 text-accent font-medium overflow-hidden flex-shrink-0',
        sizeClasses[size],
        className
      )}
      aria-label={resolvedAlt}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={resolvedAlt} className="w-full h-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  )
}
