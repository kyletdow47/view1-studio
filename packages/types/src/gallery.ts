export interface Gallery {
  id: string
  workspace_id: string
  name: string
  slug: string
  description: string | null
  cover_photo_id: string | null
  settings: GallerySettings
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface GallerySettings {
  watermark_enabled: boolean
  download_enabled: boolean
  password_protected: boolean
  expiry_date: string | null
}
