import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ProjectView } from '@/components/features/ProjectView'

interface PageProps {
  params: { id: string }
}

export default async function ProjectPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('owner_id', user!.id)
    .single()

  if (!project) {
    notFound()
  }

  const { data: media } = await supabase
    .from('media')
    .select('*')
    .eq('project_id', params.id)
    .order('sort_order', { ascending: true })

  return <ProjectView project={project} initialMedia={media ?? []} />
}
