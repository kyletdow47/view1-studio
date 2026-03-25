'use client'

import React from 'react'
import { useUploadStore, type UploadItem } from '@/stores/uploadStore'

interface UploadProgressProps {
  className?: string
}

export function UploadProgress({ className = '' }: UploadProgressProps) {
  const items = useUploadStore((s) => s.items)
  const overallProgress = useUploadStore((s) => s.overallProgress)
  const removeCompleted = useUploadStore((s) => s.removeCompleted)

  const itemList = Object.values(items)

  if (itemList.length === 0) return null

  const progress = overallProgress()
  const hasCompleted = itemList.some((i) => i.status === 'complete')
  const allDone = itemList.every((i) => i.status === 'complete' || i.status === 'error')

  return (
    <div className={['space-y-4', className].join(' ')}>
      {/* Overall progress */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {allDone ? 'Upload complete' : `Uploading… ${progress}%`}
          </span>
          {hasCompleted && (
            <button
              onClick={removeCompleted}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              Clear completed
            </button>
          )}
        </div>
        <ProgressBar percent={progress} />
      </div>

      {/* Per-file list */}
      <ul className="space-y-2" role="list" aria-label="Upload queue">
        {itemList.map((item) => (
          <FileRow key={item.fileHash} item={item} />
        ))}
      </ul>
    </div>
  )
}

function FileRow({ item }: { item: UploadItem }) {
  const percent =
    item.fileSize > 0 ? Math.round((item.bytesUploaded / item.fileSize) * 100) : 0

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span
          className="truncate text-xs font-medium text-gray-700 dark:text-gray-200"
          title={item.fileName}
        >
          {item.fileName}
        </span>
        <StatusBadge status={item.status} />
      </div>

      {item.status !== 'complete' && item.status !== 'error' && (
        <ProgressBar percent={percent} />
      )}

      {item.status === 'error' && item.errorMessage && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{item.errorMessage}</p>
      )}

      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatBytes(item.bytesUploaded)} / {formatBytes(item.fileSize)}
        </span>
        {item.status !== 'complete' && item.status !== 'error' && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{percent}%</span>
        )}
      </div>
    </li>
  )
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
    >
      <div
        className="h-full rounded-full bg-blue-500 transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: UploadItem['status'] }) {
  const map: Record<UploadItem['status'], { label: string; className: string }> = {
    pending: { label: 'Queued', className: 'text-gray-400' },
    uploading: { label: 'Uploading', className: 'text-blue-500' },
    paused: { label: 'Paused', className: 'text-yellow-500' },
    complete: { label: 'Done', className: 'text-green-500' },
    error: { label: 'Error', className: 'text-red-500' },
  }
  const { label, className } = map[status]
  return (
    <span className={['shrink-0 text-xs font-medium', className].join(' ')}>{label}</span>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
