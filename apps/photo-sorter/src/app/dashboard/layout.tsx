import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/layouts/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, plan, business_name')
    .eq('id', user.id)
    .single()

  return (
    <DashboardShell
      user={{
        email: user.email ?? '',
        displayName: profile?.display_name ?? '',
        avatarUrl: profile?.avatar_url ?? null,
        plan: profile?.plan ?? 'free',
        businessName: profile?.business_name ?? null,
      }}
    >
      {children}
    </DashboardShell>
  )
}
