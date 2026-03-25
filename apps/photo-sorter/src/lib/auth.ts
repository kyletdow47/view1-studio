import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Returns the currently authenticated user, or null if not authenticated.
 * Safe to call from Server Components and Route Handlers.
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) return null
  return user
}

/**
 * Returns the authenticated user or redirects to /auth/login.
 * Use in Server Components and Route Handlers that require authentication.
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  return user
}

/**
 * Returns the workspace (and role) for a given user.
 * Returns null if no workspace found.
 */
export async function getUserWorkspace(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, slug)')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}
