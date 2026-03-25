'use client'

import { create } from 'zustand'
import { computeFileIdentity, deriveStoragePath } from '@/lib/upload/identity'
import {
  saveUploadRecord,
  getUploadRecord,
  updateUploadRecord,
  getAllUploadRecords,
  type UploadStatus,
} from '@/lib/upload/indexeddb'
import { startUpload } from '@/lib/upload/resumable'
import { UploadQueue, type UploadTask } from '@/lib/upload/queue'
import { createClient } from '@/lib/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export interface UploadItem {
  fileHash: string
  fileName: string
  fileSize: number
  mimeType: string
  projectId: string
  storagePath: string
  bytesUploaded: number
  status: UploadStatus
  errorMessage?: string
}

interface UploadState {
  items: Record<string, UploadItem>
  initialized: boolean
  addFiles: (files: File[], projectId: string) => Promise<void>
  initialize: () => Promise<void>
  removeCompleted: () => void
  overallProgress: () => number
}

// Queue singleton — lives outside Zustand so it persists across re-renders
let queue: UploadQueue | null = null

function getQueue(processUpload: (task: UploadTask) => Promise<void>): UploadQueue {
  if (!queue) {
    queue = new UploadQueue(3, processUpload)
  }
  return queue
}

export const useUploadStore = create<UploadState>((set, get) => {
  // Internal: update a single item in store + IndexedDB
  const updateItem = async (fileHash: string, patch: Partial<UploadItem>): Promise<void> => {
    set((state) => ({
      items: {
        ...state.items,
        [fileHash]: { ...state.items[fileHash], ...patch },
      },
    }))
    await updateUploadRecord(fileHash, patch).catch(() => {
      // Non-fatal: IndexedDB update failure doesn't break the upload
    })
  }

  // Internal: process one upload task
  const processUpload = (task: UploadTask): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      void updateItem(task.fileHash, { status: 'uploading' })

      startUpload({
        file: task.file,
        storagePath: task.storagePath,
        mimeType: task.mimeType,
        tusUploadUrl: null, // tus uses fingerprint-based resumption internally
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SUPABASE_ANON_KEY,
        onProgress: (bytesUploaded) => {
          void updateItem(task.fileHash, { bytesUploaded, status: 'uploading' })
        },
        onSuccess: () => {
          void (async () => {
            try {
              await updateItem(task.fileHash, {
                status: 'complete',
                bytesUploaded: task.file.size,
              })
              await insertMediaRow(task)
            } catch (err) {
              console.error('Post-upload error', err)
            } finally {
              resolve()
            }
          })()
        },
        onError: (error) => {
          void updateItem(task.fileHash, {
            status: 'error',
            errorMessage: error.message,
          })
          reject(error)
        },
      })
    })
  }

  const insertMediaRow = async (task: UploadTask): Promise<void> => {
    const supabase = createClient()
    const { error } = await supabase.from('media').insert({
      project_id: task.projectId,
      storage_path: task.storagePath,
      file_name: task.file.name,
      file_size: task.file.size,
      mime_type: task.mimeType,
      file_hash: task.fileHash,
      status: 'uploaded',
    })
    if (error) {
      console.error('Failed to insert media row:', error)
    }
  }

  return {
    items: {},
    initialized: false,

    async initialize() {
      if (get().initialized) return
      try {
        const records = await getAllUploadRecords()
        const items: Record<string, UploadItem> = {}

        for (const record of records) {
          if (record.status === 'complete') continue // skip done

          items[record.fileHash] = {
            fileHash: record.fileHash,
            fileName: record.fileName,
            fileSize: record.fileSize,
            mimeType: record.mimeType,
            projectId: record.projectId,
            storagePath: record.storagePath,
            bytesUploaded: record.bytesUploaded,
            status: record.status === 'uploading' ? 'paused' : record.status,
          }
        }

        set({ items, initialized: true })
      } catch (err) {
        console.error('Failed to initialize upload store:', err)
        set({ initialized: true })
      }
    },

    async addFiles(files: File[], projectId: string) {
      const q = getQueue(processUpload)

      for (const file of files) {
        try {
          const fileHash = await computeFileIdentity(file)

          // Check for already-completed upload (dedup)
          const existing = await getUploadRecord(fileHash)
          if (existing?.status === 'complete') continue

          const storagePath = deriveStoragePath(fileHash, projectId, file.name)
          const mimeType = file.type || 'application/octet-stream'

          const item: UploadItem = {
            fileHash,
            fileName: file.name,
            fileSize: file.size,
            mimeType,
            projectId,
            storagePath,
            bytesUploaded: existing?.bytesUploaded ?? 0,
            status: 'pending',
          }

          // Persist to IndexedDB
          await saveUploadRecord({
            fileHash,
            fileName: file.name,
            projectId,
            bytesUploaded: existing?.bytesUploaded ?? 0,
            tusUploadUrl: existing?.tusUploadUrl ?? null,
            status: 'pending',
            fileSize: file.size,
            mimeType,
            storagePath,
            createdAt: existing?.createdAt ?? Date.now(),
            updatedAt: Date.now(),
          })

          set((state) => ({
            items: { ...state.items, [fileHash]: item },
          }))

          q.add({ fileHash, file, projectId, storagePath, mimeType })
        } catch (err) {
          console.error(`Failed to queue file ${file.name}:`, err)
        }
      }
    },

    removeCompleted() {
      set((state) => {
        const items = { ...state.items }
        for (const key of Object.keys(items)) {
          if (items[key].status === 'complete') {
            delete items[key]
          }
        }
        return { items }
      })
    },

    overallProgress() {
      const { items } = get()
      const values = Object.values(items)
      if (values.length === 0) return 0
      const totalBytes = values.reduce((sum, i) => sum + i.fileSize, 0)
      const uploadedBytes = values.reduce((sum, i) => sum + i.bytesUploaded, 0)
      return totalBytes === 0 ? 0 : Math.round((uploadedBytes / totalBytes) * 100)
    },
  }
})
