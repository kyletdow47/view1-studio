import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders title and children when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Title" description="Some description">
        <p>Body</p>
      </Modal>
    )
    expect(screen.getByText('Some description')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Hidden">
        <p>Hidden content</p>
      </Modal>
    )
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="Modal">
        <p>Content</p>
      </Modal>
    )
    await userEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
