import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, preset, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="mt-1 text-gray-600">
          {profile?.plan === 'free' ? 'Free plan' : `${profile?.plan} plan`}
          {' — '}
          {projects?.length ?? 0} projects
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/dashboard/new"
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-8 text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600"
        >
          <span className="text-3xl">+</span>
          <span className="mt-2 text-sm font-medium">New Project</span>
        </a>

        {projects?.map((project) => (
          <div
            key={project.id}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500">
                {project.preset}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {project.status}
              </span>
            </div>
            <h3 className="mt-2 font-semibold">{project.name}</h3>
            <p className="mt-1 text-xs text-gray-400">
              {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
