'use client'

export { toast } from 'sonner'
export type { ExternalToast } from 'sonner'

/**
 * Convenience helpers for typed toast variants.
 * Usage: toastSuccess('Saved!') | toastError('Failed') etc.
 */
import { toast } from 'sonner'

export const toastSuccess = (message: string) => toast.success(message)
export const toastError = (message: string) => toast.error(message)
export const toastWarning = (message: string) => toast.warning(message)
export const toastInfo = (message: string) => toast.info(message)
