import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies bordered variant class', () => {
    const { container } = render(<Card variant="bordered">Content</Card>)
    expect(container.firstChild).toHaveClass('border', 'border-view1-border')
  })

  it('renders Card.Header', () => {
    render(<Card><Card.Header>Title</Card.Header></Card>)
    expect(screen.getByText('Title')).toBeInTheDocument()
  })

  it('renders Card.Content', () => {
    render(<Card><Card.Content>Body</Card.Content></Card>)
    expect(screen.getByText('Body')).toBeInTheDocument()
  })

  it('renders Card.Footer', () => {
    render(<Card><Card.Footer>Footer text</Card.Footer></Card>)
    expect(screen.getByText('Footer text')).toBeInTheDocument()
  })

  it('renders all sub-components together', () => {
    render(
      <Card>
        <Card.Header>Header</Card.Header>
        <Card.Content>Body</Card.Content>
        <Card.Footer>Footer</Card.Footer>
      </Card>
    )
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})
