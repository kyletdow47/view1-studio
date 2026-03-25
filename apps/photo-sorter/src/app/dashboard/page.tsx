import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, preset, created_at')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('id, type, title, body, read, created_at')
    .eq('photographer_id', user!.id)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    booked: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-500',
  }

  const presetIcons: Record<string, string> = {
    real_estate: '🏠',
    wedding: '💒',
    travel: '✈️',
    general: '📷',
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            {projects?.length ?? 0} projects
            {recentNotifications?.length ? ` · ${recentNotifications.length} new notifications` : ''}
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          New Project
        </Link>
      </div>

      {!projects?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16">
          <span className="text-4xl">📷</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first project to start sorting photos.</p>
          <Link
            href="/dashboard/new"
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/${project.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{presetIcons[project.preset] ?? '📷'}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[project.status] ?? statusColors.draft}`}>
                  {project.status}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-blue-700">
                {project.name}
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(project.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
