export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer'

export interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string
  plan: 'free' | 'pro' | 'business'
  created_at: string
  updated_at: string
}
