import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UploadQueue, type UploadTask } from './queue'

function makeTask(fileHash: string): UploadTask {
  return {
    fileHash,
    file: new File(['x'], `${fileHash}.jpg`, { type: 'image/jpeg' }),
    projectId: 'proj-1',
    storagePath: `proj-1/${fileHash}/photo.jpg`,
    mimeType: 'image/jpeg',
  }
}

describe('UploadQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when maxConcurrent is out of range', () => {
    expect(() => new UploadQueue(0, vi.fn())).toThrow()
    expect(() => new UploadQueue(4, vi.fn())).toThrow()
  })

  it('accepts maxConcurrent between 1 and 3', () => {
    expect(() => new UploadQueue(1, vi.fn())).not.toThrow()
    expect(() => new UploadQueue(3, vi.fn())).not.toThrow()
  })

  it('starts with zero active and pending', () => {
    const q = new UploadQueue(3, vi.fn())
    expect(q.activeCount).toBe(0)
    expect(q.pendingCount).toBe(0)
  })

  it('calls process immediately for first task', async () => {
    const process = vi.fn().mockResolvedValue(undefined)
    const q = new UploadQueue(1, process)
    q.add(makeTask('file-1'))
    expect(process).toHaveBeenCalledOnce()
  })

  it('respects maxConcurrent — does not start more than N at once', () => {
    const started: string[] = []
    const process = vi.fn().mockImplementation((task: UploadTask) => {
      started.push(task.fileHash)
      return new Promise<void>(() => {}) // never resolves — keeps tasks "active"
    })
    const q = new UploadQueue(2, process)

    q.add(makeTask('file-1'))
    q.add(makeTask('file-2'))
    q.add(makeTask('file-3'))

    expect(started).toHaveLength(2) // only 2 active, file-3 is pending
    expect(q.activeCount).toBe(2)
    expect(q.pendingCount).toBe(1)
  })

  it('starts next task when one completes', async () => {
    let resolveFirst!: () => void
    const order: string[] = []
    const process = vi.fn().mockImplementation((task: UploadTask) => {
      order.push(task.fileHash)
      if (task.fileHash === 'file-1') {
        return new Promise<void>((r) => { resolveFirst = r })
      }
      return Promise.resolve()
    })

    const q = new UploadQueue(1, process)
    q.add(makeTask('file-1'))
    q.add(makeTask('file-2'))

    expect(order).toEqual(['file-1'])

    resolveFirst()
    // Allow microtasks to settle
    await Promise.resolve()
    await Promise.resolve()

    expect(order).toEqual(['file-1', 'file-2'])
  })

  it('does not re-add a task that is already active', () => {
    const process = vi.fn().mockReturnValue(new Promise<void>(() => {}))
    const q = new UploadQueue(3, process)
    const task = makeTask('file-1')

    q.add(task)
    q.add(task) // duplicate

    expect(process).toHaveBeenCalledOnce()
  })

  it('does not re-add a task that is already pending', () => {
    const process = vi.fn().mockReturnValue(new Promise<void>(() => {}))
    const q = new UploadQueue(1, process)

    q.add(makeTask('file-1')) // starts immediately (active)
    q.add(makeTask('file-2')) // goes to pending
    q.add(makeTask('file-2')) // duplicate of pending — should be ignored

    expect(q.pendingCount).toBe(1)
  })

  it('isActive returns true only for running tasks', () => {
    const process = vi.fn().mockReturnValue(new Promise<void>(() => {}))
    const q = new UploadQueue(1, process)
    q.add(makeTask('file-1'))

    expect(q.isActive('file-1')).toBe(true)
    expect(q.isActive('file-2')).toBe(false)
  })

  it('totalCount is active + pending', () => {
    const process = vi.fn().mockReturnValue(new Promise<void>(() => {}))
    const q = new UploadQueue(1, process)
    q.add(makeTask('a'))
    q.add(makeTask('b'))
    q.add(makeTask('c'))
    expect(q.totalCount).toBe(3)
  })

  it('continues draining after an error', async () => {
    const order: string[] = []
    const process = vi.fn().mockImplementation((task: UploadTask) => {
      order.push(task.fileHash)
      if (task.fileHash === 'file-1') return Promise.reject(new Error('upload failed'))
      return Promise.resolve()
    })

    const q = new UploadQueue(1, process)
    q.add(makeTask('file-1'))
    q.add(makeTask('file-2'))

    await new Promise((r) => setTimeout(r, 10))
    expect(order).toContain('file-2')
  })
})
