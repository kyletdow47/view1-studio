import type { ExercisePriority } from '@/types'
import { cn } from '@/lib/cn'

const STYLES: Record<ExercisePriority, string> = {
  main: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  secondary: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  finisher: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
}

const LABELS: Record<ExercisePriority, string> = {
  main: 'MAIN',
  secondary: 'SECONDARY',
  finisher: 'FINISHER',
}

export function PriorityBadge({ priority }: { priority: ExercisePriority }) {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded-sm border',
        STYLES[priority]
      )}
    >
      {LABELS[priority]}
    </span>
  )
}
