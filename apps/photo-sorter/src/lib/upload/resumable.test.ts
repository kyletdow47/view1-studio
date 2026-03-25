import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startUpload } from './resumable'

// Mock tus-js-client
const mockStart = vi.fn()
const mockAbort = vi.fn().mockResolvedValue(undefined)
let capturedOptions: Record<string, unknown> = {}

vi.mock('tus-js-client', () => ({
  Upload: vi.fn().mockImplementation((_file: unknown, options: Record<string, unknown>) => {
    capturedOptions = options
    return {
      url: 'https://supabase.co/storage/v1/upload/resumable/abc123',
      start: mockStart,
      abort: mockAbort,
    }
  }),
}))

function makeFile(name = 'photo.jpg', size = 1024): File {
  return new File(['x'.repeat(size)], name, { type: 'image/jpeg' })
}

const baseOptions = {
  file: makeFile(),
  storagePath: 'proj-1/abc/photo.jpg',
  mimeType: 'image/jpeg',
  tusUploadUrl: null,
  supabaseUrl: 'https://xyz.supabase.co',
  supabaseAnonKey: 'anon-key',
  onProgress: vi.fn(),
  onSuccess: vi.fn(),
  onError: vi.fn(),
}

describe('startUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOptions = {}
  })

  it('calls Upload.start()', () => {
    startUpload(baseOptions)
    expect(mockStart).toHaveBeenCalledOnce()
  })

  it('sets the correct endpoint', () => {
    startUpload(baseOptions)
    expect(capturedOptions.endpoint).toBe('https://xyz.supabase.co/storage/v1/upload/resumable')
  })

  it('sets Authorization header', () => {
    startUpload(baseOptions)
    const headers = capturedOptions.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer anon-key')
  })

  it('sets x-upsert header to false', () => {
    startUpload(baseOptions)
    const headers = capturedOptions.headers as Record<string, string>
    expect(headers['x-upsert']).toBe('false')
  })

  it('passes storage path in metadata', () => {
    startUpload(baseOptions)
    const metadata = capturedOptions.metadata as Record<string, string>
    expect(metadata.objectName).toBe('proj-1/abc/photo.jpg')
    expect(metadata.bucketName).toBe('photos')
    expect(metadata.contentType).toBe('image/jpeg')
  })

  it('passes chunk size of 6MB', () => {
    startUpload(baseOptions)
    expect(capturedOptions.chunkSize).toBe(6 * 1024 * 1024)
  })

  it('passes existing tusUploadUrl as uploadUrl', () => {
    startUpload({ ...baseOptions, tusUploadUrl: 'https://tus-url' })
    expect(capturedOptions.uploadUrl).toBe('https://tus-url')
  })

  it('returns abort function that calls upload.abort()', async () => {
    const { abort } = startUpload(baseOptions)
    await abort()
    expect(mockAbort).toHaveBeenCalledWith(false)
  })

  it('calls onProgress when progress fires', () => {
    const onProgress = vi.fn()
    startUpload({ ...baseOptions, onProgress })
    const progressFn = capturedOptions.onProgress as (a: number, b: number) => void
    progressFn(500, 1024)
    expect(onProgress).toHaveBeenCalledWith(500, 1024)
  })

  it('calls onSuccess with upload URL on success', () => {
    const onSuccess = vi.fn()
    startUpload({ ...baseOptions, onSuccess })
    const successFn = capturedOptions.onSuccess as () => void
    successFn()
    expect(onSuccess).toHaveBeenCalledWith('https://supabase.co/storage/v1/upload/resumable/abc123')
  })

  it('calls onError with an Error object on failure', () => {
    const onError = vi.fn()
    startUpload({ ...baseOptions, onError })
    const errorFn = capturedOptions.onError as (e: { message: string }) => void
    errorFn({ message: 'Network error' })
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    expect(onError.mock.calls[0][0].message).toBe('Network error')
  })
})
