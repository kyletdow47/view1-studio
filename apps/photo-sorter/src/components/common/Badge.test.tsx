import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Category</Badge>)
    expect(screen.getByText('Category')).toBeInTheDocument()
  })

  it('applies default variant classes by default', () => {
    render(<Badge>Tag</Badge>)
    expect(screen.getByText('Tag')).toHaveClass('bg-white/10', 'text-white')
  })

  it('applies success variant classes', () => {
    render(<Badge variant="success">Approved</Badge>)
    expect(screen.getByText('Approved')).toHaveClass('text-accent')
  })

  it('applies warning variant classes', () => {
    render(<Badge variant="warning">Review</Badge>)
    expect(screen.getByText('Review')).toHaveClass('text-yellow-400')
  })

  it('applies info variant classes', () => {
    render(<Badge variant="info">New</Badge>)
    expect(screen.getByText('New')).toHaveClass('text-blue-400')
  })

  it('accepts custom className', () => {
    render(<Badge className="custom-class">Tag</Badge>)
    expect(screen.getByText('Tag')).toHaveClass('custom-class')
  })
})
