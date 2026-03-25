import { Upload } from 'tus-js-client'

const CHUNK_SIZE = 6 * 1024 * 1024 // 6MB
const RETRY_DELAYS = [0, 3000, 5000, 10000, 20000]

export interface StartUploadOptions {
  file: File
  storagePath: string
  mimeType: string
  tusUploadUrl: string | null
  supabaseUrl: string
  supabaseAnonKey: string
  onProgress: (bytesUploaded: number, bytesTotal: number) => void
  onSuccess: (uploadUrl: string) => void
  onError: (error: Error) => void
}

export interface ActiveUpload {
  abort: () => Promise<void>
}

export function startUpload(options: StartUploadOptions): ActiveUpload {
  const {
    file,
    storagePath,
    mimeType,
    tusUploadUrl,
    supabaseUrl,
    supabaseAnonKey,
    onProgress,
    onSuccess,
    onError,
  } = options

  const upload = new Upload(file, {
    endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
    uploadUrl: tusUploadUrl ?? undefined,
    chunkSize: CHUNK_SIZE,
    retryDelays: RETRY_DELAYS,
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      'x-upsert': 'false',
    },
    metadata: {
      bucketName: 'photos',
      objectName: storagePath,
      contentType: mimeType,
      cacheControl: '3600',
    },
    onProgress,
    onSuccess: () => {
      onSuccess(upload.url ?? '')
    },
    onError: (error) => {
      onError(new Error(error.message))
    },
  })

  upload.start()

  return {
    abort: () => upload.abort(false),
  }
}
