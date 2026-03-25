'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { PhotoGrid } from './PhotoGrid'
import { UploadZone } from './UploadZone'

interface ProjectViewProps {
  project: {
    id: string
    name: string
    status: string
    preset: string
    metadata: Record<string, unknown>
  }
  initialMedia: MediaItem[]
}

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

export function ProjectView({ project, initialMedia }: ProjectViewProps) {
  const supabase = createClient()
  const [media, setMedia] = useState<MediaItem[]>(initialMedia)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const categories = Array.from(new Set(media.map((m) => m.category).filter(Boolean))) as string[]

  const filteredMedia = activeCategory
    ? media.filter((m) => m.category === activeCategory)
    : media

  const handleUpload = useCallback(
    async (files: File[]) => {
      setUploading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const storagePath = `${user.id}/${project.id}/${crypto.randomUUID()}.${fileExt}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload failed:', file.name, uploadError)
          continue
        }

        // Create media record
        const { data: mediaRecord, error: insertError } = await supabase
          .from('media')
          .insert({
            project_id: project.id,
            storage_path: storagePath,
            original_name: file.name,
            display_name: file.name.replace(/\.[^/.]+$/, ''),
            mime_type: file.type,
            file_size: file.size,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            upload_status: 'complete',
            sort_order: media.length,
          })
          .select()
          .single()

        if (!insertError && mediaRecord) {
          setMedia((prev) => [...prev, mediaRecord])
        }
      }

      setUploading(false)
    },
    [supabase, project.id, media.length],
  )

  const handleToggleStar = useCallback(
    async (mediaId: string) => {
      const item = media.find((m) => m.id === mediaId)
      if (!item) return

      await supabase
        .from('media')
        .update({ starred: !item.starred })
        .eq('id', mediaId)

      setMedia((prev) =>
        prev.map((m) => (m.id === mediaId ? { ...m, starred: !m.starred } : m)),
      )
    },
    [supabase, media],
  )

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {media.length} photos · {project.preset} · {project.status}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Settings
          </button>
          <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Publish Gallery
          </button>
        </div>
      </div>

      {/* Upload zone */}
      <UploadZone onUpload={handleUpload} uploading={uploading} />

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="mb-4 mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              !activeCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({media.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat} ({media.filter((m) => m.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Photo grid */}
      <PhotoGrid
        media={filteredMedia}
        onToggleStar={handleToggleStar}
      />
    </div>
  )
}
