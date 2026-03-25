const SAMPLE_SIZE = 1024 * 1024 // 1MB

/**
 * Compute a stable identity string for a file using SHA-256 of first 1MB + file size + name.
 * Used for deduplication across uploads.
 */
export async function computeFileIdentity(file: File): Promise<string> {
  const sample = file.slice(0, SAMPLE_SIZE)
  const buffer = await sample.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hashHex}-${file.size}-${encodeURIComponent(file.name)}`
}

/**
 * Derive a storage path from identity hash and project.
 * Format: {projectId}/{hashHex}/{sanitizedFileName}
 */
export function deriveStoragePath(fileHash: string, projectId: string, fileName: string): string {
  const hashHex = fileHash.split('-')[0]
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${projectId}/${hashHex}/${sanitized}`
}
