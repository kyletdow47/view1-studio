import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/stores/uploadStore', () => ({
  useUploadStore: vi.fn(),
}))

import { UploadProgress } from './UploadProgress'
import { useUploadStore } from '@/stores/uploadStore'
import type { UploadItem } from '@/stores/uploadStore'

function makeItem(overrides: Partial<UploadItem> = {}): UploadItem {
  return {
    fileHash: 'hash-1',
    fileName: 'photo.jpg',
    fileSize: 1000,
    mimeType: 'image/jpeg',
    projectId: 'proj-1',
    storagePath: 'proj-1/h/photo.jpg',
    bytesUploaded: 500,
    status: 'uploading',
    ...overrides,
  }
}

const mockRemoveCompleted = vi.fn()

function mockStore(
  items: Record<string, UploadItem>,
  overallProgressValue = 0,
) {
  vi.mocked(useUploadStore).mockImplementation((selector) => {
    const state = {
      items,
      overallProgress: () => overallProgressValue,
      removeCompleted: mockRemoveCompleted,
    }
    return selector(state as unknown as Parameters<typeof selector>[0])
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('UploadProgress', () => {
  it('renders nothing when there are no items', () => {
    mockStore({}, 0)
    const { container } = render(<UploadProgress />)
    expect(container.firstChild).toBeNull()
  })

  it('shows uploading status text while in progress', () => {
    mockStore({ 'hash-1': makeItem() }, 50)
    render(<UploadProgress />)
    expect(screen.getByText(/uploading.*50%/i)).toBeInTheDocument()
  })

  it('shows "Upload complete" when all items are done', () => {
    mockStore({ 'hash-1': makeItem({ status: 'complete', bytesUploaded: 1000 }) }, 100)
    render(<UploadProgress />)
    expect(screen.getByText(/upload complete/i)).toBeInTheDocument()
  })

  it('renders a progress bar with correct aria attributes', () => {
    mockStore({ 'hash-1': makeItem() }, 50)
    render(<UploadProgress />)
    const bars = screen.getAllByRole('progressbar')
    expect(bars.length).toBeGreaterThanOrEqual(1)
    expect(bars[0]).toHaveAttribute('aria-valuenow', '50')
  })

  it('displays file name for each upload item', () => {
    mockStore({ 'hash-1': makeItem({ fileName: 'wedding.cr2' }) }, 0)
    render(<UploadProgress />)
    expect(screen.getByText('wedding.cr2')).toBeInTheDocument()
  })

  it('shows error message for errored items', () => {
    mockStore(
      {
        'hash-1': makeItem({
          status: 'error',
          errorMessage: 'Connection lost',
        }),
      },
      0,
    )
    render(<UploadProgress />)
    expect(screen.getByText('Connection lost')).toBeInTheDocument()
  })

  it('shows "Done" badge for completed items', () => {
    mockStore({ 'hash-1': makeItem({ status: 'complete', bytesUploaded: 1000 }) }, 100)
    render(<UploadProgress />)
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('shows "Error" badge for errored items', () => {
    mockStore({ 'hash-1': makeItem({ status: 'error', errorMessage: 'Failed' }) }, 0)
    render(<UploadProgress />)
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('shows "Clear completed" button when there are completed items', () => {
    mockStore({ 'hash-1': makeItem({ status: 'complete', bytesUploaded: 1000 }) }, 100)
    render(<UploadProgress />)
    expect(screen.getByRole('button', { name: /clear completed/i })).toBeInTheDocument()
  })

  it('calls removeCompleted on button click', () => {
    mockStore({ 'hash-1': makeItem({ status: 'complete', bytesUploaded: 1000 }) }, 100)
    render(<UploadProgress />)
    fireEvent.click(screen.getByRole('button', { name: /clear completed/i }))
    expect(mockRemoveCompleted).toHaveBeenCalledOnce()
  })

  it('displays formatted byte sizes', () => {
    mockStore({ 'hash-1': makeItem({ bytesUploaded: 500, fileSize: 1000 }) }, 50)
    render(<UploadProgress />)
    expect(screen.getByText(/500 B \/ 1000 B/)).toBeInTheDocument()
  })

  it('shows per-file percentage for uploading items', () => {
    mockStore({ 'hash-1': makeItem({ bytesUploaded: 500, fileSize: 1000 }) }, 50)
    render(<UploadProgress />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders the upload list with correct aria-label', () => {
    mockStore({ 'hash-1': makeItem() }, 0)
    render(<UploadProgress />)
    expect(screen.getByRole('list', { name: /upload queue/i })).toBeInTheDocument()
  })
})
