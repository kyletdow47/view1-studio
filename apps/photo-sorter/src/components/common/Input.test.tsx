import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('associates label with input via htmlFor', () => {
    render(<Input label="Email" />)
    const input = screen.getByLabelText('Email')
    expect(input.tagName).toBe('INPUT')
  })

  it('renders error message when provided', () => {
    render(<Input label="Email" error="Invalid email" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email')
  })

  it('marks input as invalid when error is present', () => {
    render(<Input label="Email" error="Required" />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('is disabled when disabled prop is set', () => {
    render(<Input label="Name" disabled />)
    expect(screen.getByLabelText('Name')).toBeDisabled()
  })

  it('accepts typed input', async () => {
    render(<Input label="Name" />)
    const input = screen.getByLabelText('Name')
    await userEvent.type(input, 'John')
    expect(input).toHaveValue('John')
  })

  it('calls onChange handler', async () => {
    const onChange = vi.fn()
    render(<Input label="Name" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Name'), 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('supports type="password"', () => {
    render(<Input type="password" label="Password" />)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })
})
