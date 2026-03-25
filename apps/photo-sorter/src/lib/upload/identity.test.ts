import { describe, it, expect } from 'vitest'
import { computeFileIdentity, deriveStoragePath } from './identity'

function makeFile(content: string, name: string, type = 'image/jpeg'): File {
  return new File([content], name, { type })
}

describe('computeFileIdentity', () => {
  it('produces a non-empty string', async () => {
    const file = makeFile('hello world', 'test.jpg')
    const hash = await computeFileIdentity(file)
    expect(hash).toBeTruthy()
    expect(typeof hash).toBe('string')
  })

  it('is deterministic — same file produces same hash', async () => {
    const file1 = makeFile('same content', 'photo.jpg')
    const file2 = makeFile('same content', 'photo.jpg')
    const h1 = await computeFileIdentity(file1)
    const h2 = await computeFileIdentity(file2)
    expect(h1).toBe(h2)
  })

  it('differs when file name changes', async () => {
    const f1 = makeFile('same content', 'a.jpg')
    const f2 = makeFile('same content', 'b.jpg')
    const h1 = await computeFileIdentity(f1)
    const h2 = await computeFileIdentity(f2)
    expect(h1).not.toBe(h2)
  })

  it('differs when file content changes', async () => {
    const f1 = makeFile('content A', 'photo.jpg')
    const f2 = makeFile('content B', 'photo.jpg')
    const h1 = await computeFileIdentity(f1)
    const h2 = await computeFileIdentity(f2)
    expect(h1).not.toBe(h2)
  })

  it('encodes the file size in the identity', async () => {
    const f1 = makeFile('abc', 'photo.jpg') // 3 bytes
    const f2 = makeFile('abcd', 'photo.jpg') // 4 bytes
    const h1 = await computeFileIdentity(f1)
    const h2 = await computeFileIdentity(f2)
    expect(h1).not.toBe(h2)
  })

  it('includes a 64-char hex hash prefix', async () => {
    const file = makeFile('data', 'test.jpg')
    const hash = await computeFileIdentity(file)
    const hexPart = hash.split('-')[0]
    expect(hexPart).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('deriveStoragePath', () => {
  it('produces path with projectId prefix', () => {
    const fileHash = 'abc123def-100-photo.jpg'
    const path = deriveStoragePath(fileHash, 'project-1', 'photo.jpg')
    expect(path.startsWith('project-1/')).toBe(true)
  })

  it('sanitizes special characters in file name', () => {
    const fileHash = 'abc123-10-file name!.jpg'
    const path = deriveStoragePath(fileHash, 'proj', 'file name!.jpg')
    expect(path).not.toContain(' ')
    expect(path).not.toContain('!')
  })

  it('includes hash prefix segment', () => {
    const fileHash = 'deadbeef-500-test.cr2'
    const path = deriveStoragePath(fileHash, 'proj', 'test.cr2')
    const parts = path.split('/')
    expect(parts).toHaveLength(3)
    expect(parts[1]).toBe('deadbeef')
  })
})
