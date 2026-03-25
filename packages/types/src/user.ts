export type PhotographerPlan = 'free' | 'pro' | 'business' | 'custom'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  business_name: string | null
  plan: PhotographerPlan
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_connect_id: string | null
  stripe_connect_onboarded: boolean
  storage_used: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface ClientProfile {
  id: string
  user_id: string
  photographer_id: string
  display_name: string
  email: string
  phone: string | null
  stripe_customer_id: string | null
  has_saved_payment_method: boolean
  preferences: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type AccessLevel = 'preview' | 'proofing' | 'delivered'

export interface ProjectClient {
  id: string
  project_id: string
  client_profile_id: string | null
  client_email: string
  access_level: AccessLevel
  invited_at: string
  accepted_at: string | null
  revoked_at: string | null
}

// Backwards-compat aliases
export type User = Profile
export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer'
export interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string
  plan: PhotographerPlan
  created_at: string
  updated_at: string
}
