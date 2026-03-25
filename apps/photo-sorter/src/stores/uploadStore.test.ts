import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock before imports that use these modules
vi.mock('@/lib/upload/identity', () => ({
  computeFileIdentity: vi.fn().mockResolvedValue('abc123hash-100-photo.jpg'),
  deriveStoragePath: vi.fn().mockReturnValue('proj-1/abc123/photo.jpg'),
}))

vi.mock('@/lib/upload/indexeddb', () => ({
  saveUploadRecord: vi.fn().mockResolvedValue(undefined),
  getUploadRecord: vi.fn().mockResolvedValue(null),
  updateUploadRecord: vi.fn().mockResolvedValue(undefined),
  getAllUploadRecords: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/upload/resumable', () => ({
  startUpload: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}))

vi.mock('@/lib/upload/queue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/upload/queue')>()
  return actual // use real queue
})

import { useUploadStore } from './uploadStore'
import * as identity from '@/lib/upload/identity'
import * as idb from '@/lib/upload/indexeddb'

function makeFile(name = 'photo.jpg', size = 1024): File {
  return new File(['x'.repeat(size)], name, { type: 'image/jpeg' })
}

describe('useUploadStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state between tests
    useUploadStore.setState({ items: {}, initialized: false })
  })

  it('starts with empty items', () => {
    const { items } = useUploadStore.getState()
    expect(items).toEqual({})
  })

  it('addFiles adds items to store', async () => {
    const file = makeFile()
    await useUploadStore.getState().addFiles([file], 'proj-1')

    const { items } = useUploadStore.getState()
    const values = Object.values(items)
    expect(values).toHaveLength(1)
    expect(values[0].fileName).toBe('photo.jpg')
    // Queue picks up the task immediately, so status is 'pending' or 'uploading'
    expect(['pending', 'uploading']).toContain(values[0].status)
  })

  it('skips already-completed files (dedup)', async () => {
    vi.mocked(idb.getUploadRecord).mockResolvedValueOnce({
      fileHash: 'abc123hash-100-photo.jpg',
      fileName: 'photo.jpg',
      projectId: 'proj-1',
      bytesUploaded: 1024,
      tusUploadUrl: null,
      status: 'complete',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      storagePath: 'proj-1/abc/photo.jpg',
      createdAt: 1000,
      updatedAt: 2000,
    })

    const file = makeFile()
    await useUploadStore.getState().addFiles([file], 'proj-1')

    const { items } = useUploadStore.getState()
    expect(Object.values(items)).toHaveLength(0)
  })

  it('persists record to IndexedDB when adding a file', async () => {
    const file = makeFile()
    await useUploadStore.getState().addFiles([file], 'proj-1')
    expect(idb.saveUploadRecord).toHaveBeenCalled()
  })

  it('overallProgress returns 0 when no items', () => {
    const progress = useUploadStore.getState().overallProgress()
    expect(progress).toBe(0)
  })

  it('overallProgress calculates correctly', () => {
    useUploadStore.setState({
      items: {
        'hash-1': {
          fileHash: 'hash-1',
          fileName: 'a.jpg',
          fileSize: 1000,
          mimeType: 'image/jpeg',
          projectId: 'proj-1',
          storagePath: 'proj-1/h1/a.jpg',
          bytesUploaded: 500,
          status: 'uploading',
        },
        'hash-2': {
          fileHash: 'hash-2',
          fileName: 'b.jpg',
          fileSize: 1000,
          mimeType: 'image/jpeg',
          projectId: 'proj-1',
          storagePath: 'proj-1/h2/b.jpg',
          bytesUploaded: 1000,
          status: 'complete',
        },
      },
    })

    const progress = useUploadStore.getState().overallProgress()
    expect(progress).toBe(75) // (500 + 1000) / 2000 = 75%
  })

  it('removeCompleted removes only complete items', () => {
    useUploadStore.setState({
      items: {
        'hash-1': {
          fileHash: 'hash-1',
          fileName: 'a.jpg',
          fileSize: 100,
          mimeType: 'image/jpeg',
          projectId: 'proj-1',
          storagePath: 'proj-1/h1/a.jpg',
          bytesUploaded: 100,
          status: 'complete',
        },
        'hash-2': {
          fileHash: 'hash-2',
          fileName: 'b.jpg',
          fileSize: 100,
          mimeType: 'image/jpeg',
          projectId: 'proj-1',
          storagePath: 'proj-1/h2/b.jpg',
          bytesUploaded: 50,
          status: 'uploading',
        },
      },
    })

    useUploadStore.getState().removeCompleted()
    const { items } = useUploadStore.getState()
    expect(Object.keys(items)).toEqual(['hash-2'])
  })

  it('initialize loads non-complete records from IndexedDB', async () => {
    vi.mocked(idb.getAllUploadRecords).mockResolvedValueOnce([
      {
        fileHash: 'hash-paused',
        fileName: 'paused.jpg',
        projectId: 'proj-1',
        bytesUploaded: 200,
        tusUploadUrl: null,
        status: 'uploading', // should become 'paused' in store
        fileSize: 1000,
        mimeType: 'image/jpeg',
        storagePath: 'proj-1/hp/paused.jpg',
        createdAt: 1000,
        updatedAt: 2000,
      },
    ])

    await useUploadStore.getState().initialize()

    const { items } = useUploadStore.getState()
    const item = items['hash-paused']
    expect(item).toBeDefined()
    expect(item.status).toBe('paused')
    expect(item.bytesUploaded).toBe(200)
  })

  it('initialize skips completed records', async () => {
    vi.mocked(idb.getAllUploadRecords).mockResolvedValueOnce([
      {
        fileHash: 'hash-done',
        fileName: 'done.jpg',
        projectId: 'proj-1',
        bytesUploaded: 500,
        tusUploadUrl: null,
        status: 'complete',
        fileSize: 500,
        mimeType: 'image/jpeg',
        storagePath: 'proj-1/hd/done.jpg',
        createdAt: 1000,
        updatedAt: 2000,
      },
    ])

    await useUploadStore.getState().initialize()
    const { items } = useUploadStore.getState()
    expect(Object.keys(items)).toHaveLength(0)
  })

  it('computeFileIdentity is called for each file', async () => {
    const files = [makeFile('a.jpg'), makeFile('b.jpg')]
    await useUploadStore.getState().addFiles(files, 'proj-1')
    expect(identity.computeFileIdentity).toHaveBeenCalledTimes(2)
  })
})
