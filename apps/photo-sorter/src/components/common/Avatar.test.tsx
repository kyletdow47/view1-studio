import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders initials from name', () => {
    render(<Avatar name="Jane Doe" />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders single initial for single-word name', () => {
    render(<Avatar name="Alice" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders ? when no name or src is provided', () => {
    render(<Avatar />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('renders image when src is provided', () => {
    render(<Avatar src="/avatar.jpg" name="Jane Doe" />)
    expect(screen.getByRole('img', { name: 'Jane Doe' })).toBeInTheDocument()
  })

  it('uses alt prop for image alt text', () => {
    render(<Avatar src="/img.jpg" alt="Profile picture" />)
    expect(screen.getByRole('img', { name: 'Profile picture' })).toBeInTheDocument()
  })

  it('applies sm size class', () => {
    const { container } = render(<Avatar name="AB" size="sm" />)
    expect(container.firstChild).toHaveClass('w-7', 'h-7')
  })

  it('applies lg size class', () => {
    const { container } = render(<Avatar name="AB" size="lg" />)
    expect(container.firstChild).toHaveClass('w-12', 'h-12')
  })
})
