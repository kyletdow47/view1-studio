export interface UploadTask {
  fileHash: string
  file: File
  projectId: string
  storagePath: string
  mimeType: string
}

export type ProcessUploadFn = (task: UploadTask) => Promise<void>

export class UploadQueue {
  private pending: UploadTask[] = []
  private active = new Set<string>()
  private readonly maxConcurrent: number
  private readonly process: ProcessUploadFn

  constructor(maxConcurrent: number, process: ProcessUploadFn) {
    if (maxConcurrent < 1 || maxConcurrent > 3) {
      throw new Error('maxConcurrent must be between 1 and 3')
    }
    this.maxConcurrent = maxConcurrent
    this.process = process
  }

  add(task: UploadTask): void {
    // Skip if already active or pending
    const alreadyQueued =
      this.active.has(task.fileHash) ||
      this.pending.some((t) => t.fileHash === task.fileHash)
    if (alreadyQueued) return

    this.pending.push(task)
    this.drain()
  }

  private drain(): void {
    while (this.active.size < this.maxConcurrent && this.pending.length > 0) {
      const task = this.pending.shift()!
      this.active.add(task.fileHash)

      this.process(task)
        .catch(() => {
          // errors are handled via callbacks in process fn
        })
        .finally(() => {
          this.active.delete(task.fileHash)
          this.drain()
        })
    }
  }

  get activeCount(): number {
    return this.active.size
  }

  get pendingCount(): number {
    return this.pending.length
  }

  get totalCount(): number {
    return this.active.size + this.pending.length
  }

  isActive(fileHash: string): boolean {
    return this.active.has(fileHash)
  }
}
