import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('renders with default accessible label', () => {
    render(<Spinner />)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('renders with custom label', () => {
    render(<Spinner label="Uploading photos" />)
    expect(screen.getByRole('status', { name: 'Uploading photos' })).toBeInTheDocument()
  })

  it('applies sm size class', () => {
    render(<Spinner size="sm" />)
    expect(screen.getByRole('status')).toHaveClass('w-4', 'h-4')
  })

  it('applies md size class by default', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveClass('w-6', 'h-6')
  })

  it('applies lg size class', () => {
    render(<Spinner size="lg" />)
    expect(screen.getByRole('status')).toHaveClass('w-8', 'h-8')
  })

  it('applies animate-spin class', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveClass('animate-spin')
  })
})
