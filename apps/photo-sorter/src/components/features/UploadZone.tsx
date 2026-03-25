'use client'

import { useCallback, useRef, useState } from 'react'

interface UploadZoneProps {
  onUpload: (files: File[]) => Promise<void>
  uploading: boolean
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime']

export function UploadZone({ onUpload, uploading }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      const files = Array.from(fileList).filter((f) =>
        ACCEPTED_TYPES.includes(f.type),
      )
      if (files.length > 0) {
        onUpload(files)
      }
    },
    [onUpload],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
        dragActive
          ? 'border-blue-500 bg-blue-50'
          : uploading
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {uploading ? (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-blue-700">Uploading...</p>
        </>
      ) : (
        <>
          <span className="text-3xl">📤</span>
          <p className="mt-3 text-sm font-medium text-gray-700">
            Drop photos here or click to upload
          </p>
          <p className="mt-1 text-xs text-gray-500">
            JPEG, PNG, WebP, HEIC, MP4 — up to 50MB each
          </p>
        </>
      )}
    </div>
  )
}
