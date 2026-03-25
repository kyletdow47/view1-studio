import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FileUpload } from './FileUpload'

// jsdom doesn't implement URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock')
global.URL.revokeObjectURL = vi.fn()

function makeImageFile(name = 'photo.jpg'): File {
  return new File(['data'], name, { type: 'image/jpeg' })
}

describe('FileUpload', () => {
  it('renders the drop zone', () => {
    render(<FileUpload onFilesSelected={vi.fn()} />)
    expect(screen.getByText('Drag & drop images')).toBeInTheDocument()
  })

  it('shows max files count', () => {
    render(<FileUpload onFilesSelected={vi.fn()} maxFiles={10} />)
    expect(screen.getByText(/up to 10 images/)).toBeInTheDocument()
  })

  it('calls onFilesSelected with image files', async () => {
    const onFilesSelected = vi.fn()
    render(<FileUpload onFilesSelected={onFilesSelected} />)

    const input = screen.getByTestId('file-input')
    const file = makeImageFile()
    await userEvent.upload(input, file)

    expect(onFilesSelected).toHaveBeenCalledWith([file])
  })

  it('filters out non-image files', async () => {
    const onFilesSelected = vi.fn()
    render(<FileUpload onFilesSelected={onFilesSelected} />)

    const input = screen.getByTestId('file-input')
    const pdf = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    await userEvent.upload(input, pdf)

    expect(onFilesSelected).not.toHaveBeenCalled()
  })

  it('shows uploaded file in the list', async () => {
    render(<FileUpload onFilesSelected={vi.fn()} />)
    const input = screen.getByTestId('file-input')
    await userEvent.upload(input, makeImageFile('sunset.jpg'))
    expect(screen.getByRole('list', { name: 'Selected files' })).toBeInTheDocument()
  })

  it('removes file when remove button is clicked', async () => {
    render(<FileUpload onFilesSelected={vi.fn()} />)
    const input = screen.getByTestId('file-input')
    await userEvent.upload(input, makeImageFile('sunset.jpg'))

    const removeBtn = screen.getByLabelText('Remove sunset.jpg')
    await userEvent.click(removeBtn)

    expect(screen.queryByRole('list', { name: 'Selected files' })).not.toBeInTheDocument()
  })

  it('is disabled when disabled prop is set', () => {
    render(<FileUpload onFilesSelected={vi.fn()} disabled />)
    expect(screen.getByTestId('file-input')).toBeDisabled()
  })
})
