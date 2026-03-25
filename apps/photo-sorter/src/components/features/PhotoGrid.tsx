'use client'

import { createClient } from '@/lib/supabase'

interface MediaItem {
  id: string
  original_name: string
  display_name: string
  storage_path: string
  category: string | null
  upload_status: string
  starred: boolean
  sort_order: number
}

interface PhotoGridProps {
  media: MediaItem[]
  onToggleStar: (mediaId: string) => void
}

export function PhotoGrid({ media, onToggleStar }: PhotoGridProps) {
  const supabase = createClient()

  if (media.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center py-12 text-gray-400">
        <span className="text-4xl">🖼️</span>
        <p className="mt-2 text-sm">No photos yet. Upload some to get started.</p>
      </div>
    )
  }

  function getPublicUrl(storagePath: string) {
    const { data } = supabase.storage.from('media').getPublicUrl(storagePath, {
      transform: { width: 400, height: 400, resize: 'cover' },
    })
    return data.publicUrl
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {media.map((item) => (
        <div
          key={item.id}
          className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPublicUrl(item.storage_path)}
            alt={item.display_name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          {/* Star button */}
          <button
            onClick={() => onToggleStar(item.id)}
            className="absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            {item.starred ? '⭐' : '☆'}
          </button>

          {/* Category badge */}
          {item.category && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              {item.category}
            </span>
          )}

          {/* File name */}
          <span className="absolute bottom-2 right-2 max-w-[60%] truncate text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            {item.display_name}
          </span>
        </div>
      ))}
    </div>
  )
}
