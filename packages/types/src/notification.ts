export type NotificationType =
  | 'booking_new'
  | 'payment_received'
  | 'payment_failed'
  | 'edit_requested'
  | 'gallery_viewed'
  | 'client_accepted'
  | 'project_published'
  | 'subscription_changed'

export interface Notification {
  id: string
  photographer_id: string
  type: NotificationType
  title: string
  body: string
  metadata: Record<string, unknown>
  read: boolean
  created_at: string
}
