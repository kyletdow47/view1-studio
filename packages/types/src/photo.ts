export interface Photo {
  id: string
  workspace_id: string
  user_id: string
  file_name: string
  file_url: string
  thumbnail_url: string | null
  category: PhotoCategory | null
  confidence: number | null
  status: PhotoStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type PhotoCategory =
  | 'portrait'
  | 'landscape'
  | 'detail'
  | 'group'
  | 'candid'
  | 'ceremony'
  | 'reception'
  | 'preparation'
  | 'other'

export type PhotoStatus = 'pending' | 'classified' | 'approved' | 'rejected'
