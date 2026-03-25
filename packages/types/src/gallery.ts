export type ProjectStatus = 'booked' | 'draft' | 'published' | 'completed' | 'archived'
export type ProjectPreset = 'real_estate' | 'wedding' | 'travel' | 'general'
export type ProjectTheme = 'dark' | 'light' | 'minimal' | 'editorial'

export interface Project {
  id: string
  owner_id: string
  name: string
  preset: ProjectPreset
  status: ProjectStatus
  metadata: ProjectMetadata
  cover_image_id: string | null
  theme: ProjectTheme
  gallery_public: boolean
  published_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ProjectMetadata {
  core?: {
    shoot_date?: string
    location?: string
    client_name?: string
  }
  template?: Record<string, unknown>
  custom?: Record<string, unknown>
}

export interface ProjectPricing {
  id: string
  project_id: string
  pricing_mode: PricingMode
  booking_enabled: boolean
  booking_type: BookingType | null
  booking_price: number | null
  booking_deposit_percent: number | null
  download_enabled: boolean
  download_mode: DownloadMode | null
  download_flat_price: number | null
  download_per_file_price: number | null
  edit_enabled: boolean
  edit_flat_fee: number | null
  currency: string
  created_at: string
  updated_at: string
}

export type PricingMode = 'bundled' | 'individual'
export type DownloadMode = 'flat' | 'per_file'
export type BookingType = 'full' | 'deposit' | 'download_only' | 'free'

// Backwards-compat aliases
export type Gallery = Project
export interface GallerySettings {
  watermark_enabled: boolean
  download_enabled: boolean
  password_protected: boolean
  expiry_date: string | null
}
