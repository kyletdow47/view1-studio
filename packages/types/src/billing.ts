import type { BookingType } from './gallery'

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type EditRequestStatus = 'requested' | 'reviewed' | 'priced' | 'paid' | 'in_progress' | 'delivered'

export interface Booking {
  id: string
  project_id: string | null
  photographer_id: string
  client_profile_id: string
  status: BookingStatus
  booking_type: BookingType
  total_price: number
  deposit_amount: number | null
  balance_amount: number | null
  deposit_paid: boolean
  balance_paid: boolean
  deposit_payment_intent_id: string | null
  balance_payment_intent_id: string | null
  form_data: Record<string, unknown>
  preferred_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EditRequest {
  id: string
  project_id: string
  client_profile_id: string
  status: EditRequestStatus
  media_ids: string[]
  client_notes: string
  photographer_notes: string | null
  quoted_price: number | null
  stripe_payment_intent_id: string | null
  paid_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

export interface FilePurchase {
  id: string
  project_id: string
  client_profile_id: string
  media_ids: string[]
  total_price: number
  stripe_payment_intent_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface BookingFormField {
  key: string
  label: string
  type: 'text' | 'date' | 'dropdown' | 'textarea'
  required: boolean
  options?: string[]
}

export interface BookingFormFields {
  id: string
  photographer_id: string
  preset: string | null
  fields: BookingFormField[]
  created_at: string
  updated_at: string
}
