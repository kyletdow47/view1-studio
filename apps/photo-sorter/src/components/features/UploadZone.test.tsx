import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/stores/uploadStore', () => ({
  useUploadStore: vi.fn(),
}))

import { UploadZone } from './UploadZone'
import { useUploadStore } from '@/stores/uploadStore'

const mockAddFiles = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useUploadStore).mockImplementation((selector) => {
    const state = { addFiles: mockAddFiles }
    return selector(state as unknown as Parameters<typeof selector>[0])
  })
})

describe('UploadZone', () => {
  it('renders drop zone text', () => {
    render(<UploadZone projectId="proj-1" />)
    expect(screen.getByText(/drag & drop photos/i)).toBeInTheDocument()
  })

  it('shows accepted file types hint', () => {
    render(<UploadZone projectId="proj-1" />)
    expect(screen.getByText(/JPG.*PNG.*WEBP/i)).toBeInTheDocument()
  })

  it('has accessible role and label', () => {
    render(<UploadZone projectId="proj-1" />)
    expect(screen.getByRole('button', { name: /upload photos/i })).toBeInTheDocument()
  })

  it('shows drag-over feedback when dragging', () => {
    render(<UploadZone projectId="proj-1" />)
    const zone = screen.getByRole('button')
    fireEvent.dragOver(zone)
    expect(screen.getByText(/drop photos here/i)).toBeInTheDocument()
  })

  it('resets drag state on drag leave', () => {
    render(<UploadZone projectId="proj-1" />)
    const zone = screen.getByRole('button')
    fireEvent.dragOver(zone)
    fireEvent.dragLeave(zone)
    expect(screen.queryByText(/drop photos here/i)).not.toBeInTheDocument()
  })

  it('calls addFiles on drop with valid file', () => {
    render(<UploadZone projectId="proj-1" />)
    const zone = screen.getByRole('button')

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })

    expect(mockAddFiles).toHaveBeenCalledWith([file], 'proj-1')
  })

  it('does not call addFiles for unsupported file types', () => {
    render(<UploadZone projectId="proj-1" />)
    const zone = screen.getByRole('button')

    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })

    expect(mockAddFiles).not.toHaveBeenCalled()
  })

  it('shows error for unsupported file type', async () => {
    render(<UploadZone projectId="proj-1" />)
    const zone = screen.getByRole('button')

    const file = new File(['data'], 'document.pdf', { type: 'application/pdf' })
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })

    await screen.findByText(/unsupported file type/i)
  })

  it('shows error for file exceeding 500MB', async () => {
    render(<UploadZone projectId="proj-1" />)
    const zone = screen.getByRole('button')

    const bigFile = new File(['x'], 'huge.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 501 * 1024 * 1024 })

    fireEvent.drop(zone, { dataTransfer: { files: [bigFile] } })

    await screen.findByText(/exceeds 500MB/i)
  })

  it('accepts RAW files by extension', () => {
    render(<UploadZone projectId="proj-1" />)
    const zone = screen.getByRole('button')

    // RAW files have no standard MIME type
    const raw = new File(['data'], 'shot.cr2', { type: '' })
    fireEvent.drop(zone, { dataTransfer: { files: [raw] } })

    expect(mockAddFiles).toHaveBeenCalledWith([raw], 'proj-1')
  })

  it('opens file input on Enter key', async () => {
    render(<UploadZone projectId="proj-1" />)
    const zone = screen.getByRole('button')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    fireEvent.keyDown(zone, { key: 'Enter' })
    expect(clickSpy).toHaveBeenCalled()
  })
})
