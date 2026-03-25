import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveUploadRecord,
  getUploadRecord,
  updateUploadRecord,
  deleteUploadRecord,
  getAllUploadRecords,
  type UploadRecord,
} from './indexeddb'

function makeRecord(overrides: Partial<UploadRecord> = {}): UploadRecord {
  return {
    fileHash: 'hash-abc-100-test.jpg',
    fileName: 'test.jpg',
    projectId: 'proj-1',
    bytesUploaded: 0,
    tusUploadUrl: null,
    status: 'pending',
    fileSize: 100,
    mimeType: 'image/jpeg',
    storagePath: 'proj-1/hash-abc/test.jpg',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

describe('IndexedDB upload records', () => {
  beforeEach(async () => {
    // Clean up between tests
    const records = await getAllUploadRecords()
    for (const r of records) {
      await deleteUploadRecord(r.fileHash)
    }
  })

  it('saves and retrieves a record', async () => {
    const record = makeRecord()
    await saveUploadRecord(record)
    const retrieved = await getUploadRecord(record.fileHash)
    expect(retrieved).toEqual(record)
  })

  it('returns null for a non-existent key', async () => {
    const result = await getUploadRecord('does-not-exist')
    expect(result).toBeNull()
  })

  it('overwrites an existing record on save (put semantics)', async () => {
    const record = makeRecord()
    await saveUploadRecord(record)
    const updated = { ...record, bytesUploaded: 500, status: 'uploading' as const }
    await saveUploadRecord(updated)
    const retrieved = await getUploadRecord(record.fileHash)
    expect(retrieved?.bytesUploaded).toBe(500)
    expect(retrieved?.status).toBe('uploading')
  })

  it('updateUploadRecord patches specific fields', async () => {
    const record = makeRecord()
    await saveUploadRecord(record)
    await updateUploadRecord(record.fileHash, { status: 'complete', bytesUploaded: 100 })
    const retrieved = await getUploadRecord(record.fileHash)
    expect(retrieved?.status).toBe('complete')
    expect(retrieved?.bytesUploaded).toBe(100)
    expect(retrieved?.fileName).toBe(record.fileName) // unchanged
  })

  it('updateUploadRecord throws when record does not exist', async () => {
    await expect(
      updateUploadRecord('missing-hash', { status: 'complete' }),
    ).rejects.toThrow('No upload record found')
  })

  it('deletes a record', async () => {
    const record = makeRecord()
    await saveUploadRecord(record)
    await deleteUploadRecord(record.fileHash)
    const retrieved = await getUploadRecord(record.fileHash)
    expect(retrieved).toBeNull()
  })

  it('getAllUploadRecords returns all saved records', async () => {
    const r1 = makeRecord({ fileHash: 'hash-1', fileName: 'a.jpg' })
    const r2 = makeRecord({ fileHash: 'hash-2', fileName: 'b.jpg' })
    await saveUploadRecord(r1)
    await saveUploadRecord(r2)
    const all = await getAllUploadRecords()
    expect(all).toHaveLength(2)
    const hashes = all.map((r) => r.fileHash)
    expect(hashes).toContain('hash-1')
    expect(hashes).toContain('hash-2')
  })

  it('getAllUploadRecords returns empty array when no records', async () => {
    const all = await getAllUploadRecords()
    expect(all).toEqual([])
  })
})
