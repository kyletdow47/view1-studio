export interface Media {
  id: string
  project_id: string
  storage_path: string
  original_name: string
  display_name: string
  mime_type: string
  file_size: number
  type: MediaType
  category: string | null
  orientation: MediaOrientation | null
  sort_order: number
  starred: boolean
  note: string | null
  width: number | null
  height: number | null
  predictions: Record<string, unknown> | null
  exif: Record<string, unknown> | null
  upload_status: UploadStatus
  created_at: string
  updated_at: string
}

export type MediaType = 'image' | 'video'
export type MediaOrientation = 'landscape' | 'portrait' | 'square'
export type UploadStatus = 'pending' | 'uploading' | 'complete' | 'failed'

/** Category presets per project type */
export type RealEstateCategory =
  | 'exterior' | 'interior' | 'kitchen' | 'bathroom'
  | 'drone/aerial' | 'pool/outdoor' | 'landscape' | 'twilight' | 'video' | 'other'

export type WeddingCategory =
  | 'ceremony' | 'reception' | 'portraits' | 'getting_ready'
  | 'details' | 'dance' | 'family' | 'venue' | 'video' | 'other'

export type TravelCategory =
  | 'landmarks' | 'street' | 'food' | 'accommodation'
  | 'nature' | 'people' | 'transport' | 'nightlife' | 'video' | 'other'

export type GeneralCategory =
  | 'people' | 'places' | 'objects' | 'nature'
  | 'architecture' | 'action' | 'detail' | 'video' | 'other'

// Backwards-compat aliases
export type Photo = Media
export type PhotoCategory = RealEstateCategory | WeddingCategory | TravelCategory | GeneralCategory
export type PhotoStatus = UploadStatus
