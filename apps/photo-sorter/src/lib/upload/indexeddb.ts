const DB_NAME = 'view1-uploads'
const DB_VERSION = 1
const STORE_NAME = 'upload-states'

export type UploadStatus = 'pending' | 'uploading' | 'paused' | 'complete' | 'error'

export interface UploadRecord {
  fileHash: string // primary key
  fileName: string
  projectId: string
  bytesUploaded: number
  tusUploadUrl: string | null
  status: UploadStatus
  fileSize: number
  mimeType: string
  storagePath: string
  createdAt: number
  updatedAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fileHash' })
      }
    }
  })
}

export async function saveUploadRecord(record: UploadRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(record)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function getUploadRecord(fileHash: string): Promise<UploadRecord | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(fileHash)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      db.close()
      resolve((req.result as UploadRecord | undefined) ?? null)
    }
  })
}

export async function updateUploadRecord(
  fileHash: string,
  patch: Partial<Omit<UploadRecord, 'fileHash' | 'createdAt'>>,
): Promise<void> {
  const existing = await getUploadRecord(fileHash)
  if (!existing) throw new Error(`No upload record found for hash: ${fileHash}`)
  await saveUploadRecord({ ...existing, ...patch, updatedAt: Date.now() })
}

export async function deleteUploadRecord(fileHash: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(fileHash)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllUploadRecords(): Promise<UploadRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      db.close()
      resolve(req.result as UploadRecord[])
    }
  })
}
