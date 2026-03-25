import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
}

export function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
